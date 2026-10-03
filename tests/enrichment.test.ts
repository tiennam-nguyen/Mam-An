import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { readCatalog } from '../scripts/catalogPipeline';
import { validateEnrichedFoods } from '../scripts/catalogEnrichment';
import { catalog, meal, now } from './fixtures/helpers';
import {
  defaultPortion,
  calculateComponent,
} from '../src/domain/meal/mealEntry';
import { selectPortion } from '../src/domain/food/portionResolver';
import { buildWeeklyReport } from '../src/domain/summary/weeklyReport';
import { demoData } from '../src/application/usecases/seedDemoData';
import { buildPatternEvidence } from '../src/domain/personal/personalResponse';
import { draft } from './fixtures/helpers';
import { createScenario } from '../src/domain/meal/decisionSimulator';

it.each(['egg', 'pho', 'noodles', 'rice-bowl'])(
  'saved v2 half unit for %s remains adjustable without rewriting snapshots or accepting forged factors',
  (foodId) => {
    const baseline = draft();
    const component = baseline.entries
      .flatMap((e) => e.components)
      .find((c) => c.foodId === 'egg')!;
    component.foodId = catalog.getFoodById(foodId)!.id;
    component.portion = {
      unitId: 'half',
      quantity: 1,
      factorToReferenceSnapshot: 0.5,
      displayLabelSnapshot:
        foodId === 'egg'
          ? '1/2 quả'
          : foodId === 'rice-bowl'
            ? '1/2 bát'
            : '1/2 tô',
    };
    const before = JSON.stringify(baseline);
    const result = createScenario(
      baseline,
      [
        {
          type: 'CHANGE_PORTION',
          targetComponentId: component.componentId,
          newPortion: { ...component.portion, quantity: 2 },
        },
      ],
      catalog,
    );
    expect(
      result.resultingEntries
        .flatMap((e) => e.components)
        .find((c) => c.componentId === component.componentId)!.carbEstimate,
    ).toBe(foodId === 'egg' ? 0.6 : null);
    expect(JSON.stringify(baseline)).toBe(before);
    expect(() =>
      createScenario(
        baseline,
        [
          {
            type: 'CHANGE_PORTION',
            targetComponentId: component.componentId,
            newPortion: { ...component.portion, factorToReferenceSnapshot: 9 },
          },
        ],
        catalog,
      ),
    ).toThrow('Invalid food portion unit');
  },
);

it('empty reports describe missing records without a denominator or inferred intake', () => {
  const report = buildWeeklyReport([], [], now);
  expect(report.narrative.join(' ')).not.toMatch(/0\/0|NaN|Infinity/);
  expect(
    report.dailyLoggedCarbEstimates.every((d) => d.totalKnownCarb === null),
  ).toBe(true);
  expect(report.mealRows).toEqual([]);
});

it('retains original USDA nutrient rows and derives available carbohydrate explicitly', () => {
  const raw = JSON.parse(readFileSync('catalog-src/usda-curated.json', 'utf8'));
  const { foods, sources } = readCatalog();
  expect(foods).toHaveLength(34);
  for (const row of raw.records) {
    const food = foods.find((f) => f.id === row.id)!;
    expect(food.carbPerServing).toBeCloseTo(
      row.nutrients['1005'].amount - row.nutrients['1079'].amount,
      6,
    );
    expect(food.kcalPerServing).toBe(row.nutrients['1008'].amount);
    expect(food.provenance?.sourceFoodId).toBe(row.sourceFoodId);
    expect(food.nutrientBasis?.amount).toBe(100);
  }
  expect(() =>
    validateEnrichedFoods(
      foods,
      sources.map((s) => s.source_id),
    ),
  ).not.toThrow();
  expect(() =>
    validateEnrichedFoods([{ ...foods[0]!, provenance: undefined }], []),
  ).toThrow();
});
it('household and measured grams use one calculator; unsupported bowls stay unknown', () => {
  const food = catalog.getFoodById('rice')!;
  const component = { ...meal().entries[0]!.components[0]!, foodId: food.id };
  const household = calculateComponent(
    { ...component, portion: defaultPortion(food) },
    food,
  );
  const metric = calculateComponent(
    {
      ...component,
      portion: selectPortion(
        food.portionUnits!.find((u) => u.id === 'g')!,
        158,
      ),
    },
    food,
  );
  expect(household.carbEstimate).toBeCloseTo(46.452, 9);
  expect(metric.carbEstimate).toBe(household.carbEstimate);
  const description = food.portionUnits!.find((u) =>
    u.id.startsWith('describe:'),
  )!;
  expect(
    calculateComponent(
      { ...component, portion: selectPortion(description, 2) },
      food,
    ).carbEstimate,
  ).toBeNull();
});
it('ml conversions are only exposed with a source density, never an assumed gram equivalence', () => {
  expect(
    catalog.getFoodById('rice')!.portionUnits!.some((u) => u.id === 'ml'),
  ).toBe(false);
  const milk = catalog.getFoodById('milk')!;
  const ml = milk.portionUnits!.find((u) => u.id === 'ml')!;
  expect(ml.factorToReference).toBeCloseTo(30.5 / 29.57353 / 100, 12);
  expect(ml.conversionQuality).toBe('ESTIMATED');
});
it('report joins actual IDs, resolves outside-period context, and remains stable under permutation', () => {
  const data = demoData(catalog, now);
  const outside = { ...data.meals[0]!, createdAt: '2026-08-01T05:00:00Z' };
  const meals = [outside, ...data.meals.slice(1)];
  const report = buildWeeklyReport(meals, data.readings, now);
  const reordered = buildWeeklyReport(
    [...meals].reverse(),
    [...data.readings].reverse(),
    now,
  );
  expect(report.readingRows).toEqual(reordered.readingRows);
  expect(report.mealRows[0]?.outsidePeriod).toBe(true);
  expect(report.loggedMealCount).toBe(6);
  expect(
    report.readingRows.find((r) => r.reading.mealId === outside.id)?.meal?.meal
      .id,
  ).toBe(outside.id);
  const dangling = buildWeeklyReport([], data.readings, now);
  expect(
    dangling.readingRows
      .filter((r) => r.reading.mealId)
      .every((r) => r.linkLabel === 'Không tìm thấy bữa đã liên kết'),
  ).toBe(true);
});
it('report uses saved totals without mutating snapshots and demo has sufficient plus sparse evidence', () => {
  const data = demoData(catalog, now);
  const original = JSON.stringify(data);
  data.meals[0]!.totalCarbEstimate = 123.456;
  const report = buildWeeklyReport(data.meals, data.readings, now);
  expect(
    report.mealRows.find((r) => r.meal.id === data.meals[0]!.id)!.meal
      .totalCarbEstimate,
  ).toBe(123.456);
  data.meals[0]!.totalCarbEstimate =
    JSON.parse(original).meals[0].totalCarbEstimate;
  expect(JSON.stringify(data)).toBe(original);
  const pattern = buildPatternEvidence(
    data.meals[0]!,
    data.meals,
    data.readings,
    'DEMO',
  );
  expect(pattern.dataQuality).toBe('SUFFICIENT_FOR_DESCRIPTION');
  expect(pattern.statistics.medianDeltaFromPremealMgDl).not.toBeNull();
  expect(
    buildPatternEvidence(data.meals[0]!, data.meals, data.readings, 'USER')
      .sampleCount,
  ).toBe(0);
  expect(data.meals.some((m) => m.completeness !== 'COMPLETE')).toBe(true);
  expect(data.readings.some((g) => g.mealId === null)).toBe(true);
});
it('report retains decimal commas in meal labels and reports an explicit cross-mode link without using it as personal evidence', () => {
  const data = demoData(catalog, now);
  const milk = buildWeeklyReport(data.meals, data.readings, now).mealRows.find(
    (r) => r.label.includes('Sữa bò'),
  )!;
  expect(milk.label).toContain('3,25%');
  const reading = { ...data.readings[0]!, isDemo: false };
  const report = buildWeeklyReport(data.meals, [reading], now);
  expect(report.readingRows[0]!.meal?.meal.id).toBe(reading.mealId);
  expect(
    buildPatternEvidence(data.meals[0]!, data.meals, [reading], 'USER')
      .sampleCount,
  ).toBe(0);
});
