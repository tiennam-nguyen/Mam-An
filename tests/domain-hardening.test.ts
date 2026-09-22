import { expect, it } from 'vitest';
import { catalog, draft, meal } from './fixtures/helpers';
import {
  calculateComponent,
  componentRoles,
  entryTotals,
  flattenEntries,
  referencePortion,
  validatePortion,
} from '../src/domain/meal/mealEntry';
import {
  applyScenario,
  createScenario,
  discardScenario,
  type ScenarioOperation,
} from '../src/domain/meal/decisionSimulator';
import {
  buildMealSignature,
  buildPatternEvidence,
  findSimilarMeals,
} from '../src/domain/personal/personalResponse';
import type { Meal } from '../src/domain/meal/meal';
import type { GlucoseReading } from '../src/domain/glucose/glucoseReading';
import {
  buildEvidenceBundle,
  minimizeEvidence,
  patternCopy,
  retrieveKnowledge,
  templateExplanation,
  validateGeneratedExplanation,
} from '../src/domain/explanation/explanation';

const rice = catalog.listDemoFoods().find((f) => f.id === 'rice')!;
const component = () => ({
  ...draft().entries[0]!.components[0]!,
  foodId: rice.id,
  portion: referencePortion(rice),
});
it.each(componentRoles)(
  'calculates both nutrients independent of component role %s',
  (role) => {
    const c = calculateComponent(
      {
        ...component(),
        role,
        portion: {
          ...referencePortion(rice),
          quantity: 1.25,
          factorToReferenceSnapshot: 0.5,
        },
      },
      rice,
    );
    expect(c.carbEstimate).toBeCloseTo(18.375, 12);
    expect(c.kcalEstimate).toBeCloseTo(80.625, 12);
    expect(
      flattenEntries([{ ...draft().entries[0]!, components: [c] }])[0],
    ).toMatchObject({
      portionMultiplier: 0.625,
      portionLabel: rice.servingLabel,
    });
  },
);
it.each([0, -1, NaN, Infinity, -Infinity])(
  'rejects invalid quantity and factor %s',
  (value) => {
    expect(() =>
      validatePortion({ ...referencePortion(rice), quantity: value }),
    ).toThrow();
    expect(() =>
      validatePortion({
        ...referencePortion(rice),
        factorToReferenceSnapshot: value,
      }),
    ).toThrow();
  },
);
it('preserves precision, known zero and null across excluded/unknown/empty totals', () => {
  const known = calculateComponent(component(), rice);
  const unknown = calculateComponent({ ...component(), foodId: null }, null);
  const excluded = calculateComponent(
    { ...component(), includedInTotal: false },
    rice,
  );
  const zero = calculateComponent(component(), {
    ...rice,
    carbPerServing: 0,
    kcalPerServing: 0,
  });
  const totals = (...components: (typeof known)[]) =>
    entryTotals([{ ...draft().entries[0]!, components }]);
  expect(totals(known)).toMatchObject({
    totalCarbEstimate: 29.4,
    totalKcalEstimate: 129,
    completeness: 'COMPLETE',
  });
  expect(totals(known, unknown)).toMatchObject({
    totalCarbEstimate: 29.4,
    totalKcalEstimate: 129,
    completeness: 'PARTIAL',
  });
  expect(totals(known, excluded)).toEqual(totals(known));
  expect(totals(unknown).totalCarbEstimate).toBeNull();
  expect(totals().totalKcalEstimate).toBeNull();
  expect(totals(zero)).toMatchObject({
    totalCarbEstimate: 0,
    totalKcalEstimate: 0,
    completeness: 'COMPLETE',
  });
  expect(
    calculateComponent(
      {
        ...component(),
        portion: { ...referencePortion(rice), quantity: 100000 },
      },
      rice,
    ).carbEstimate,
  ).toBe(2940000);
});
it.each([
  'CHANGE_PORTION',
  'REPLACE_COMPONENT',
  'REMOVE_COMPONENT',
  'ADD_COMPONENT',
] as const)(
  'projects %s independently and isolates nested mutations',
  (type) => {
    const d = draft(),
      before = structuredClone(d),
      target = d.entries[0]!.components[0]!;
    const op: ScenarioOperation =
      type === 'ADD_COMPONENT'
        ? {
            type,
            targetEntryId: d.entries[0]!.entryId,
            foodId: rice.id,
            role: 'STARCH',
            portion: referencePortion(rice),
          }
        : type === 'REMOVE_COMPONENT'
          ? { type, targetComponentId: target.componentId }
          : type === 'REPLACE_COMPONENT'
            ? {
                type,
                targetComponentId: target.componentId,
                replacementFoodId: rice.id,
                newPortion: referencePortion(rice),
              }
            : {
                type,
                targetComponentId: target.componentId,
                newPortion: { ...target.portion, quantity: 0.5 },
              };
    const s = createScenario(d, [op], catalog);
    const applied = applyScenario(d, s),
      discarded = discardScenario(d);
    expect(d).toEqual(before);
    const expected =
      type === 'ADD_COMPONENT'
        ? 62.2
        : type === 'REMOVE_COMPONENT'
          ? 30
          : type === 'REPLACE_COMPONENT'
            ? 59.4
            : 31.4;
    expect(applied.totalCarbEstimate).toBeCloseTo(expected, 10);
    applied.entries.find(
      (e) => e.components.length,
    )!.components[0]!.portion.quantity = 77;
    discarded.entries[0]!.components[0]!.portion.quantity = 88;
    expect(d).toEqual(before);
    expect(s.baseline).toEqual(before);
    expect(
      s.resultingEntries
        .flatMap((e) => e.components)
        .every((c) => c.portion.quantity !== 77),
    ).toBe(true);
  },
);
it('rejects removed targets, missing add entries, forged units, stale sessions and non-review drafts', () => {
  const d = draft(),
    c = d.entries[0]!.components[0]!;
  const remove = {
    type: 'REMOVE_COMPONENT' as const,
    targetComponentId: c.componentId,
  };
  expect(() => createScenario(d, [remove, remove], catalog)).toThrow();
  expect(() =>
    createScenario(
      d,
      [
        {
          type: 'ADD_COMPONENT',
          targetEntryId: 'absent',
          foodId: rice.id,
          role: 'STARCH',
          portion: referencePortion(rice),
        },
      ],
      catalog,
    ),
  ).toThrow();
  expect(() =>
    createScenario(
      d,
      [
        {
          type: 'CHANGE_PORTION',
          targetComponentId: c.componentId,
          newPortion: { ...c.portion, factorToReferenceSnapshot: 999 },
        },
      ],
      catalog,
    ),
  ).toThrow();
  expect(() =>
    createScenario({ ...d, analysisState: 'SAVED' }, [], catalog),
  ).toThrow();
  expect(() =>
    applyScenario(
      { ...d, sessionId: 'changed' as never },
      createScenario(d, [], catalog),
    ),
  ).toThrow();
});

function history(): Meal[] {
  return [0, 1, 2].map((i) => ({
    ...meal(),
    id: `m${i}` as never,
    isDemo: false,
    totalCarbEstimate: 100,
    entries: meal().entries.map((e) => ({ ...e, dishTemplateId: 'plate' })),
  }));
}
function reading(
  m: Meal,
  minutes: number,
  value = 100,
  id = `${m.id}:${minutes}`,
): GlucoseReading {
  return {
    id: id as never,
    mealId: m.id,
    value,
    unit: 'MG_DL',
    measuredAt: new Date(
      Date.parse(m.createdAt) + minutes * 60000,
    ).toISOString(),
    timingTag: minutes <= 0 ? 'BEFORE_MEAL' : 'AFTER_MEAL',
    note: null,
    isDemo: m.isDemo,
  };
}
it.each([
  [0.649999, null],
  [0.65, 'TIER_2'],
  [0.749999, 'TIER_2'],
  [0.75, 'TIER_1'],
  [1.25, 'TIER_1'],
  [1.250001, 'TIER_2'],
  [1.35, 'TIER_2'],
  [1.350001, null],
] as const)('similarity ratio %s has tier %s', (ratio, tier) => {
  const q = history()[0]!;
  expect(
    findSimilarMeals(q, [{ ...q, totalCarbEstimate: ratio * 100 }], 'USER')[0]
      ?.tier ?? null,
  ).toBe(tier);
});
it('signature sorts/deduplicates foods, skips excluded components, and comparison rejects zero', () => {
  const q = history()[0]!;
  q.entries[0]!.components = [
    ...q.entries[0]!.components,
    ...q.entries[0]!.components,
    { ...component(), foodId: 'z-excluded' as never, includedInTotal: false },
  ];
  const s = buildMealSignature(q);
  expect(s.componentFoodIds).toEqual(['cucumber', 'egg', 'rice']);
  expect(s.dishTemplateIds).toEqual(['plate']);
  expect(findSimilarMeals({ ...q, totalCarbEstimate: 0 }, [q], 'USER')).toEqual(
    [],
  );
  expect(findSimilarMeals(q, [{ ...q, totalCarbEstimate: 0 }], 'USER')).toEqual(
    [],
  );
});
it('uses overlap >= 0.5 for unknown carbs and tier two, with deterministic ordering', () => {
  const h = history(),
    q = h[0]!;
  q.entries = q.entries.slice(0, 2);
  const candidate = {
    ...q,
    entries: q.entries.map((e, i) =>
      i === 0
        ? e
        : {
            ...e,
            components: e.components.map((c) => ({
              ...c,
              foodId: 'other' as never,
            })),
          },
    ),
    totalCarbEstimate: null,
  };
  expect(findSimilarMeals(q, [candidate], 'USER')).toHaveLength(1);
  candidate.entries.push({
    ...candidate.entries[0]!,
    components: [{ ...component(), foodId: 'third' as never }],
  });
  expect(findSimilarMeals(q, [candidate], 'USER')).toHaveLength(0);
  h[0]!.createdAt = '2020-01-01T00:00:00.000Z';
  expect(
    findSimilarMeals(h[1]!, h.reverse(), 'USER').map((m) => m.mealId),
  ).toEqual(['m1', 'm2', 'm0']);
  expect(findSimilarMeals(h[1]!, h, 'DEMO')).toEqual([]);
});
it.each([
  [-31, -30],
  [-15, 0],
  [0, 0],
  [14, 0],
  [15, 30],
  [44, 30],
  [45, 60],
  [104, 90],
  [105, 120],
  [134, 120],
  [135, 150],
])('observation %s minutes belongs to %s minute bucket', (minutes, bucket) => {
  const h = history();
  const p = buildPatternEvidence(h[0]!, h, [reading(h[0]!, minutes)], 'USER');
  expect(p.glucoseObservations[0]!.minutesFromMeal).toBe(minutes);
  expect(p.glucoseObservations[0]!.timingBucketMinutes + 0).toBe(bucket);
});
it('weights per-meal medians equally, counts meals, and uses closest valid BEFORE at or before meal', () => {
  const h = history();
  const rows = [
    reading(h[0]!, 110, 90),
    reading(h[0]!, 120, 110),
    reading(h[0]!, 130, 130),
    reading(h[1]!, 120, 140),
    reading(h[2]!, 120, 200),
    ...h.flatMap((m) => [
      reading(m, -30, 20),
      reading(m, -1, 80),
      reading(m, 0, 100),
      { ...reading(m, 1, 1), timingTag: 'BEFORE_MEAL' as const },
      { ...reading(m, -0.1, -1), id: `${m.id}:invalid` as never },
    ]),
  ];
  const p = buildPatternEvidence(h[0]!, h, rows, 'USER');
  expect(p.sampleCount).toBe(3);
  expect(p.statistics).toEqual({
    timingBucketMinutes: 120,
    medianPostMealMgDl: 140,
    medianDeltaFromPremealMgDl: 40,
    minMgDl: 110,
    maxMgDl: 200,
  });
  expect(p.premealTrace.map((t) => t.minutesFromMeal)).toEqual([0, 0, 0]);
  expect(
    buildPatternEvidence(
      h[0]!,
      h,
      rows.filter((r) => r.mealId === h[0]!.id),
      'USER',
    ).sampleCount,
  ).toBe(1);
  expect(() => buildPatternEvidence(h[0]!, h, rows, 'USER', 2)).toThrow();
  expect(
    buildPatternEvidence(
      h[0]!,
      h,
      rows.map((r) => ({ ...r, isDemo: true })),
      'USER',
    ).dataQuality,
  ).toBe('NO_DATA');
});
it('retrieval uses unique matching tags, stable ties, limits, and preserves provenance', () => {
  const chunks = ['b', 'a', 'c'].map((id) => ({
    id,
    title: id,
    body: 'text',
    sourceLabel: 'source',
    sourceRef: 'ref',
    knowledgeVersion: 'version',
    tags: id === 'c' ? ['other'] : ['portion', 'portion'],
  }));
  expect(
    retrieveKnowledge(chunks, ['portion', 'portion']).map((c) => c.id),
  ).toEqual(['a', 'b']);
  expect(retrieveKnowledge(chunks, ['portion'], 1)[0]).toEqual(chunks[1]);
  expect(retrieveKnowledge(chunks, ['portion'], 0)).toEqual([]);
  expect(retrieveKnowledge(chunks, ['absent'])).toEqual([]);
});
it.each([
  'NO_DATA',
  'SPARSE',
  'NONCOMPARABLE',
  'SUFFICIENT_FOR_DESCRIPTION',
] as const)('template and runtime minimization cover %s', (quality) => {
  const d = {
    ...draft(),
    note: 'PRIVATE_NOTE',
    imagePreviewUrl: 'blob:PRIVATE_IMAGE',
  };
  const h = history(),
    p = buildPatternEvidence(
      h[0]!,
      h,
      h.map((m) => reading(m, 120)),
      'USER',
    );
  p.dataQuality = quality;
  const payload = minimizeEvidence(buildEvidenceBundle(d, p, []));
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toMatch(
    /PRIVATE|readingId|mealId|matchedMealIds|glucoseObservations|premealTrace|createdAt|imagePreviewUrl/,
  );
  const template = templateExplanation(payload);
  expect(template.generationMode).toBe('TEMPLATE');
  expect(template.personalObservationVi).toBe(patternCopy(payload.pattern));
  expect(template.personalObservationVi).toContain(
    quality === 'NO_DATA'
      ? 'Chưa có'
      : quality === 'SPARSE'
        ? 'Chưa đủ'
        : quality === 'NONCOMPARABLE'
          ? 'chưa tương đồng'
          : '3 bữa',
  );
});
it.each([
  ['Có 14,7 g carb.', true],
  ['Từ 14,7 đến 29,4 g carb.', true],
  ['Có 14.7 g carb.', true],
  ['Có 14,8 g carb.', false],
  ['Có 29,4 phần trăm carb.', false],
  ['Có 999 g carb.', false],
])('numeric evidence: %s', (summaryVi, expected) => {
  const p = minimizeEvidence(buildEvidenceBundle(draft(), null, []));
  p.meal.totalCarbEstimate = 29.4;
  p.scenario = {
    evidenceKey: 'scenario.delta',
    carbBefore: 29.4,
    carbAfter: 14.7,
    carbDelta: -14.7,
    operationLabels: [],
  };
  expect(
    validateGeneratedExplanation(
      {
        summaryVi,
        personalObservationVi: null,
        optionExplanationsVi: [],
        uncertaintyNoteVi: 'Dữ liệu chưa đầy đủ.',
        evidenceRefs: ['meal.current', 'scenario.delta'],
      },
      p,
    ),
  ).toBe(expected);
});
