import type { FoodId } from '../src/domain/common/brandedIds';
import { readFileSync } from 'node:fs';
import type { FoodItem, NutritionBasis } from '../src/domain/food/foodItem';
import type { PortionUnit } from '../src/domain/meal/mealEntry';
import { FoodSchema } from '../src/infrastructure/catalog/catalogSchemas';
import { normalizeFoodName } from '../src/domain/food/normalizeFoodName';
export const enrichedVersion = 'v3-2026-10-02';
const sourceUrl = 'https://fdc.nal.usda.gov/food-details/';
const metric = (amount: number): PortionUnit => ({
  id: 'g',
  labelVi: '1 g',
  factorToReference: 1 / amount,
  aliases: ['1 gram'],
  conversionQuality: 'VERIFIED',
  kind: 'METRIC',
  sourceRef: 'mam-an-design:metric mass identity',
});
const ref = (label: string): PortionUnit => ({
  id: 'reference',
  labelVi: label,
  factorToReference: 1,
  aliases: [],
  conversionQuality: 'VERIFIED',
  kind: 'REFERENCE',
  sourceRef: 'mam-an-design:explicit nutrient basis identity',
});
const describe = (label: string): PortionUnit => ({
  id: 'describe:household',
  labelVi: label,
  factorToReference: 1,
  aliases: [label],
  conversionQuality: 'UNVERIFIED',
  kind: 'HOUSEHOLD',
  sourceRef:
    'mam-an-design:description only; factor counts descriptions and MUST NOT convert nutrition',
});
const basis = (
  amount: number,
  state: string,
  energy: string,
): NutritionBasis => ({
  amount,
  unit: 'G',
  preparationState: state,
  ediblePortionNote: 'Phần ăn được; bỏ vỏ/xương/hạt không ăn theo mô tả nguồn',
  carbohydrateDefinition: 'AVAILABLE_BY_DIFFERENCE',
  energyDefinition: energy,
});
type Curated = {
  sourceId: string;
  release: string;
  accessedAt: string;
  records: {
    id: string;
    nameVi: string;
    aliases: string[];
    category: FoodItem['category'];
    sourceFoodId: string;
    sourceDescription: string;
    sourceRef: string;
    nutrients: Record<string, { amount: number; rowId: string }>;
    household: null | {
      sourcePortionId: string;
      sourceAmount: number;
      sourceModifier: string;
      grams: number;
      labelVi: string;
    };
    volumePortion: null | { sourcePortionId: string; gramsPerUsFlOz: number };
  }[];
  legacyPortions: {
    foodId: string;
    fdc_id: string;
    id: string;
    gram_weight: string;
    amount: string;
    modifier: string;
  }[];
};
export function enrichCatalog(base: FoodItem[], input?: Curated): FoodItem[] {
  const data: Curated =
    input ?? JSON.parse(readFileSync('catalog-src/usda-curated.json', 'utf8'));
  const oldDetails: Record<
    string,
    {
      amount: number;
      state: string;
      description: string;
      code: string;
      label: string;
    }
  > = {
    rice: {
      amount: 100,
      state: 'cooked',
      description: 'Rice, white, cooked',
      code: 'AAA63',
      label: '100 g cơm trắng đã nấu',
    },
    egg: {
      amount: 50,
      state: 'hard-boiled',
      description: 'Egg, chicken, whole, boiled',
      code: 'AAH15',
      label: '50 g trứng luộc, bỏ vỏ',
    },
    cucumber: {
      amount: 100,
      state: 'raw',
      description: 'Cucumber, long, raw',
      code: 'AAD46',
      label: '100 g dưa chuột sống',
    },
  };
  const existing = base.map((f) => {
    const d = oldDetails[f.id];
    if (!d)
      return {
        ...f,
        catalogVersion: enrichedVersion,
        portionUnits: [
          describe(
            f.id === 'broth'
              ? '1 vá (chưa quy đổi)'
              : f.id === 'beverage'
                ? '1 ly (chưa quy đổi)'
                : f.id === 'rice-bowl'
                  ? '1 bát (chưa quy đổi)'
                  : '1 tô (chưa quy đổi)',
          ),
        ],
        defaultPortionId: 'describe:household',
      };
    const p = data.legacyPortions.find((p) => p.foodId === f.id)!;
    const weight = Number(p.gram_weight) / Number(p.amount);
    const label =
      f.id === 'egg'
        ? '1 quả lớn theo nguồn (50 g)'
        : f.id === 'rice'
          ? '1 cốc đong cơm theo nguồn (158 g)'
          : '1 cốc dưa thái lát theo nguồn (104 g)';
    const household: PortionUnit = {
      id: 'household',
      labelVi: label,
      factorToReference: weight / d.amount,
      aliases: f.id === 'egg' ? ['1 quả', 'một quả'] : [],
      conversionQuality: 'ESTIMATED',
      kind: 'HOUSEHOLD',
      sourceRef: sourceUrl + p.fdc_id + '/nutrients#food_portion:' + p.id,
    };
    return {
      ...f,
      servingLabel: d.label,
      catalogVersion: enrichedVersion,
      referenceServingId: 'reference',
      nutrientBasis: basis(d.amount, d.state, 'ASEANFOODS calculated energy'),
      provenance: {
        sourceId: 'aseanfoods-2014',
        sourceFoodId: d.code,
        sourceDescription: d.description,
        sourceVersion: '2014 electronic v1',
        sourceRef:
          'https://inmu.mahidol.ac.th/aseanfoods/doc/OnlineASEAN_FCD_V1_2014.pdf',
        accessedAt: '2026-10-02',
        notes:
          'Available carbohydrate by difference; original canonical ASEAN values retained. Noncommercial use with acknowledgement only. Household weights are estimates from equivalent basic USDA food states, not Vietnamese bowl measurements.',
      },
      portionUnits: [
        ref(d.label),
        household,
        metric(d.amount),
        describe(
          f.id === 'rice'
            ? '1 bát của bạn (chưa quy đổi)'
            : '1 lượng tự mô tả (chưa quy đổi)',
        ),
      ],
      defaultPortionId: 'household',
    };
  });
  const additions = data.records.map((r) => {
    const total = r.nutrients['1005']?.amount,
      fiber = r.nutrients['1079']?.amount,
      kcal = r.nutrients['1008']?.amount;
    if (
      ![total, fiber, kcal].every(
        (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0,
      ) ||
      total! < fiber!
    )
      throw new Error('Invalid source nutrients');
    const units: PortionUnit[] = [ref('100 g phần ăn được'), metric(100)];
    if (r.household)
      units.push({
        id: 'household',
        labelVi: r.household.labelVi,
        aliases: [],
        factorToReference: r.household.grams / 100,
        conversionQuality: 'ESTIMATED',
        kind: 'HOUSEHOLD',
        sourceRef: r.sourceRef + '#food_portion:' + r.household.sourcePortionId,
      });
    if (r.volumePortion)
      units.push({
        id: 'ml',
        labelVi: '1 ml',
        aliases: ['1 mililit'],
        factorToReference: r.volumePortion.gramsPerUsFlOz / 29.57353 / 100,
        conversionQuality: 'ESTIMATED',
        kind: 'METRIC',
        sourceRef:
          r.sourceRef +
          '#food_portion:' +
          r.volumePortion.sourcePortionId +
          '; NIST SP811 B.9: 1 US fl oz = 29.57353 ml',
      });
    if (!r.household) units.push(describe('1 ổ của bạn (chưa quy đổi)'));
    return {
      id: r.id,
      nameVi: r.nameVi,
      aliases: r.aliases,
      category: r.category,
      servingLabel: '100 g phần ăn được',
      carbPerServing: Number((total! - fiber!).toFixed(6)),
      kcalPerServing: kcal!,
      gi: null,
      gl: null,
      sourceRefs: ['usda-sr-2018:FDC ' + r.sourceFoodId],
      catalogVersion: enrichedVersion,
      referenceServingId: 'reference',
      nutrientBasis: basis(
        100,
        r.sourceDescription,
        'USDA published Energy (1008), source Atwater calculation',
      ),
      provenance: {
        sourceId: data.sourceId,
        sourceFoodId: r.sourceFoodId,
        sourceDescription: r.sourceDescription,
        sourceVersion: data.release,
        sourceRef: r.sourceRef,
        accessedAt: data.accessedAt,
        notes:
          'Carbohydrate normalization: USDA 1005 total by difference minus 1079 total dietary fiber = available by difference (ASEANFOODS 2014 Table 4). Original values/row IDs in usda-curated.json. Basic food only; not a Vietnamese recipe or brand equivalence.',
      },
      portionUnits: units,
      defaultPortionId: r.household ? 'household' : 'describe:household',
    };
  });
  return [...existing, ...additions]
    .map((f) => ({ ...FoodSchema.parse(f), id: f.id as FoodId }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
export function validateEnrichedFoods(
  foods: readonly FoodItem[],
  sourceIds: readonly string[],
) {
  const ids = new Set<string>(),
    aliases = new Map<string, string>();
  for (const f of foods) {
    if (ids.has(f.id)) throw new Error('Duplicate food ID');
    ids.add(f.id);
    for (const a of [f.nameVi, ...f.aliases]) {
      const k = normalizeFoodName(a);
      if (aliases.has(k) && aliases.get(k) !== f.id)
        throw new Error('Ambiguous alias');
      aliases.set(k, f.id);
    }
    if (f.gi !== null || f.gl !== null)
      throw new Error(
        'GI/GL require separately curated evidence; no placeholders',
      );
    if (f.carbPerServing !== null || f.kcalPerServing !== null) {
      if (
        !f.nutrientBasis ||
        !f.provenance ||
        !sourceIds.includes(f.provenance.sourceId) ||
        !f.referenceServingId
      )
        throw new Error('Known nutrition needs explicit basis and provenance');
      if (
        /\braw\b/i.test(f.provenance.sourceDescription) &&
        /luộc|nướng|đã chín|đã nấu/.test(f.nameVi)
      )
        throw new Error('Preparation mismatch');
    }
    const unitIds = new Set<string>();
    for (const u of f.portionUnits ?? []) {
      if (
        unitIds.has(u.id) ||
        !Number.isFinite(u.factorToReference) ||
        u.factorToReference <= 0 ||
        !u.sourceRef
      )
        throw new Error('Invalid portion');
      unitIds.add(u.id);
      if (u.conversionQuality === 'UNVERIFIED' && !u.id.startsWith('describe:'))
        throw new Error('Unverified conversion must be description only');
      if (
        /phần/.test(u.labelVi) &&
        !/[\d]+\s*(g|ml)|chưa quy đổi/.test(u.labelVi)
      )
        throw new Error('Undefined portion base');
    }
    if (!unitIds.has(f.defaultPortionId ?? ''))
      throw new Error('Missing default portion');
    if (f.nutrientBasis) {
      const reference = f.portionUnits?.find(
        (u) => u.id === f.referenceServingId,
      );
      if (
        !reference ||
        reference.factorToReference !== 1 ||
        reference.conversionQuality !== 'VERIFIED'
      )
        throw new Error('Reference must identify the nutrient basis');
      const mass = f.portionUnits?.find((u) => u.id === 'g');
      if (
        f.nutrientBasis.unit === 'G' &&
        (!mass ||
          Math.abs(mass.factorToReference - 1 / f.nutrientBasis.amount) > 1e-12)
      )
        throw new Error('Metric/reference basis mismatch');
    }
  }
}
