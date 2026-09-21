import type { Meal } from '../meal/meal';
import type { MealDraft } from '../meal/mealDraft';
import type { GlucoseReading } from '../glucose/glucoseReading';
export const similarityRule = {
  version: 'meal-similarity-v1',
  tier1: [0.75, 1.25],
  tier2: [0.65, 1.35],
  overlap: 0.5,
} as const;
export const observationRule = {
  version: 'glucose-observation-v1',
  bucketMinutes: 30,
} as const;
type Comparable = Pick<MealDraft, 'entries' | 'totalCarbEstimate'>;
const unique = (values: string[]) => [...new Set(values)].sort();
const intersection = (a: readonly string[], b: readonly string[]) =>
  a.filter((x) => b.includes(x));
export function buildMealSignature(meal: Comparable) {
  const components = meal.entries
    .flatMap((e) => e.components)
    .filter((c) => c.includedInTotal);
  return {
    signatureVersion: similarityRule.version,
    dishTemplateIds: unique(
      meal.entries
        .filter((e) => e.components.some((c) => c.includedInTotal))
        .flatMap((e) => (e.dishTemplateId ? [e.dishTemplateId] : [])),
    ),
    componentFoodIds: unique(
      components.flatMap((c) => (c.foodId ? [c.foodId] : [])),
    ),
    primaryStarchFoodIds: unique(
      components.flatMap((c) =>
        c.role === 'STARCH' && c.foodId ? [c.foodId] : [],
      ),
    ),
    componentRoles: components.map((c) => c.role).sort(),
    totalCarbEstimate: meal.totalCarbEstimate,
  };
}
export interface SimilarMealMatch {
  mealId: string;
  tier: 'TIER_1' | 'TIER_2';
  matchReasons: string[];
}
export function findSimilarMeals(
  query: Comparable,
  history: readonly Meal[],
  mode: 'USER' | 'DEMO',
  excludeId?: string,
): SimilarMealMatch[] {
  const q = buildMealSignature(query);
  return history
    .filter((m) => m.isDemo === (mode === 'DEMO') && m.id !== excludeId)
    .flatMap((m) => {
      const c = buildMealSignature(m),
        sameTemplate =
          intersection(q.dishTemplateIds, c.dishTemplateIds).length > 0,
        sameStarch =
          intersection(q.primaryStarchFoodIds, c.primaryStarchFoodIds).length >
          0;
      const overlap =
        intersection(q.componentFoodIds, c.componentFoodIds).length /
        Math.max(1, q.componentFoodIds.length, c.componentFoodIds.length);
      const bothKnown =
        q.totalCarbEstimate !== null && c.totalCarbEstimate !== null;
      const ratio =
        bothKnown && q.totalCarbEstimate! > 0 && c.totalCarbEstimate! > 0
          ? c.totalCarbEstimate! / q.totalCarbEstimate!
          : null;
      const inRange = (range: readonly number[]) =>
        ratio !== null && ratio >= range[0]! && ratio <= range[1]!;
      if (!bothKnown && !(sameTemplate && overlap >= similarityRule.overlap))
        return [];
      const starchCompatible =
        !q.primaryStarchFoodIds.length ||
        !c.primaryStarchFoodIds.length ||
        sameStarch;
      const tier =
        sameTemplate &&
        starchCompatible &&
        (!bothKnown || inRange(similarityRule.tier1))
          ? ('TIER_1' as const)
          : (sameTemplate || sameStarch) &&
              overlap >= similarityRule.overlap &&
              (!bothKnown || inRange(similarityRule.tier2))
            ? ('TIER_2' as const)
            : null;
      if (!tier) return [];
      return [
        {
          mealId: m.id,
          tier,
          matchReasons: [
            ...(sameTemplate ? ['SAME_DISH_TEMPLATE'] : []),
            ...(sameStarch ? ['SAME_PRIMARY_STARCH'] : []),
            ...(overlap >= similarityRule.overlap ? ['COMPONENT_OVERLAP'] : []),
            bothKnown
              ? 'CARB_WITHIN_' + tier + '_RANGE'
              : 'CARB_NOT_COMPARABLE',
          ],
        },
      ];
    })
    .sort(
      (a, b) =>
        a.tier.localeCompare(b.tier) ||
        history
          .find((m) => m.id === b.mealId)!
          .createdAt.localeCompare(
            history.find((m) => m.id === a.mealId)!.createdAt,
          ) ||
        a.mealId.localeCompare(b.mealId),
    );
}
export interface GlucoseObservation {
  readingId: string;
  mealId: string;
  valueNormalized: number;
  normalizedUnit: 'MG_DL';
  minutesFromMeal: number;
  timingBucketMinutes: number;
  timingTag: GlucoseReading['timingTag'];
  source: 'MANUAL' | 'DEVICE' | 'DEMO';
}
export type PatternDataQuality =
  'SUFFICIENT_FOR_DESCRIPTION' | 'SPARSE' | 'NONCOMPARABLE' | 'NO_DATA';
export interface PatternEvidence {
  evidenceId: string;
  querySignatureKey: string;
  similarityRuleVersion: string;
  observationRuleVersion: string;
  matchedMealIds: string[];
  matches: SimilarMealMatch[];
  sampleCount: number;
  matchReasons: string[];
  glucoseObservations: GlucoseObservation[];
  premealTrace: {
    mealId: string;
    readingId: string;
    minutesFromMeal: number;
  }[];
  statistics: {
    timingBucketMinutes: number | null;
    medianPostMealMgDl: number | null;
    medianDeltaFromPremealMgDl: number | null;
    minMgDl: number | null;
    maxMgDl: number | null;
  };
  dataQuality: PatternDataQuality;
  caveats: string[];
}
export const normalizeGlucoseToMgDl = (
  value: number,
  unit: GlucoseReading['unit'],
) => (unit === 'MG_DL' ? value : value * 18);
export function median(values: readonly number[]): number | null {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  return !n
    ? null
    : n % 2
      ? sorted[Math.floor(n / 2)]!
      : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}
export const min = (values: readonly number[]) =>
  values.length ? Math.min(...values) : null;
export const max = (values: readonly number[]) =>
  values.length ? Math.max(...values) : null;
export function buildPatternEvidence(
  query: Comparable,
  history: readonly Meal[],
  readings: readonly GlucoseReading[],
  mode: 'USER' | 'DEMO',
  minPatternMeals = 3,
  excludeId?: string,
): PatternEvidence {
  if (!Number.isInteger(minPatternMeals) || minPatternMeals < 3)
    throw new Error('Invalid minimum');
  const matches = findSimilarMeals(query, history, mode, excludeId),
    matchedMealIds = matches.map((m) => m.mealId);
  const observations: GlucoseObservation[] = readings
    .flatMap((r) => {
      const meal = history.find(
        (m) => m.id === r.mealId && matchedMealIds.includes(m.id),
      );
      if (
        !meal ||
        r.isDemo !== (mode === 'DEMO') ||
        !Number.isFinite(r.value) ||
        r.value <= 0
      )
        return [];
      const minutesFromMeal = Math.round(
        (Date.parse(r.measuredAt) - Date.parse(meal.createdAt)) / 60000,
      );
      const valueNormalized = normalizeGlucoseToMgDl(r.value, r.unit);
      if (
        !Number.isFinite(minutesFromMeal) ||
        !Number.isFinite(valueNormalized)
      )
        return [];
      return [
        {
          readingId: r.id,
          mealId: meal.id,
          valueNormalized,
          normalizedUnit: 'MG_DL' as const,
          minutesFromMeal,
          timingBucketMinutes: Math.round(minutesFromMeal / 30) * 30,
          timingTag: r.timingTag,
          source:
            r.source ?? (r.isDemo ? ('DEMO' as const) : ('MANUAL' as const)),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.mealId.localeCompare(b.mealId) ||
        a.minutesFromMeal - b.minutesFromMeal ||
        a.readingId.localeCompare(b.readingId),
    );
  const positive = observations.filter(
    (o) =>
      o.minutesFromMeal > 0 &&
      o.timingBucketMinutes > 0 &&
      o.timingTag !== 'BEFORE_MEAL',
  );
  const buckets = [...new Set(positive.map((o) => o.timingBucketMinutes))]
    .map((bucket) => ({
      bucket,
      count: new Set(
        positive
          .filter((o) => o.timingBucketMinutes === bucket)
          .map((o) => o.mealId),
      ).size,
    }))
    .sort((a, b) => b.count - a.count || a.bucket - b.bucket);
  const selected = buckets[0],
    sampleCount = selected?.count ?? 0;
  const distinctPositive = new Set(positive.map((o) => o.mealId)).size;
  const quality: PatternDataQuality = !positive.length
    ? observations.length
      ? 'NONCOMPARABLE'
      : 'NO_DATA'
    : sampleCount >= minPatternMeals
      ? 'SUFFICIENT_FOR_DESCRIPTION'
      : distinctPositive >= minPatternMeals
        ? 'NONCOMPARABLE'
        : 'SPARSE';
  const selectedObservations = positive.filter(
    (o) => o.timingBucketMinutes === selected?.bucket,
  );
  // One median per meal prevents frequent testing of a single meal from dominating statistics.
  const perMeal = unique(selectedObservations.map((o) => o.mealId)).map(
    (mealId) => ({
      mealId,
      value: median(
        selectedObservations
          .filter((o) => o.mealId === mealId)
          .map((o) => o.valueNormalized),
      )!,
    }),
  );
  const premealTrace: PatternEvidence['premealTrace'] = [];
  const deltas = perMeal.flatMap((m) => {
    const pre = observations
      .filter(
        (o) =>
          o.mealId === m.mealId &&
          o.timingTag === 'BEFORE_MEAL' &&
          o.minutesFromMeal <= 0,
      )
      .sort(
        (a, b) =>
          b.minutesFromMeal - a.minutesFromMeal ||
          a.readingId.localeCompare(b.readingId),
      )[0];
    if (!pre) return [];
    premealTrace.push({
      mealId: m.mealId,
      readingId: pre.readingId,
      minutesFromMeal: pre.minutesFromMeal,
    });
    return [m.value - pre.valueNormalized];
  });
  const values =
    quality === 'SUFFICIENT_FOR_DESCRIPTION' ? perMeal.map((m) => m.value) : [];
  const querySignatureKey = JSON.stringify(buildMealSignature(query));
  return {
    evidenceId: 'pattern.local',
    querySignatureKey,
    similarityRuleVersion: similarityRule.version,
    observationRuleVersion: observationRule.version,
    matchedMealIds,
    matches,
    sampleCount,
    matchReasons: unique(matches.flatMap((m) => m.matchReasons)),
    glucoseObservations: observations,
    premealTrace,
    statistics: {
      timingBucketMinutes: selected?.bucket ?? null,
      medianPostMealMgDl: median(values),
      medianDeltaFromPremealMgDl:
        quality === 'SUFFICIENT_FOR_DESCRIPTION' &&
        deltas.length >= minPatternMeals
          ? median(deltas)
          : null,
      minMgDl: min(values),
      maxMgDl: max(values),
    },
    dataQuality: quality,
    caveats: unique([
      'LOGGED_ASSOCIATION_NOT_CAUSATION',
      'TIMING_BUCKET_30_MINUTES',
      ...(matches.some((m) => m.matchReasons.includes('CARB_NOT_COMPARABLE'))
        ? ['CARB_NOT_COMPARABLE']
        : []),
      ...(deltas.length < minPatternMeals
        ? ['INSUFFICIENT_PREMEAL_BASELINES']
        : []),
    ]),
  };
}
