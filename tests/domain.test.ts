import { describe, it, expect } from 'vitest';
import {
  calculateItemNutrition,
  calculateMealNutrition,
} from '../src/domain/meal/nutritionCalculator';
import { transition } from '../src/domain/meal/mealAnalysisState';
import { buildSnapshot } from '../src/domain/meal/snapshotBuilder';
import {
  aggregateWeekly,
  weeklyWindow,
} from '../src/domain/summary/weeklyAggregator';
import { applyAnalysisResult } from '../src/application/usecases/applyAnalysisResult';
import { correctMealItems } from '../src/application/usecases/correctMealItem';
import { isValidGlucose } from '../src/domain/glucose/glucoseValidation';
import { catalog, draft, meal, now } from './fixtures/helpers';
import { demoData } from '../src/application/usecases/seedDemoData';
describe('nutrition contracts', () => {
  it('known calculation preserves full precision', () =>
    expect(
      calculateItemNutrition(
        catalog.listDemoFoods().find((f) => f.id === 'rice')!,
        0.5,
      ).carbEstimate,
    ).toBe(14.7));
  it.each([0, -1, NaN, Infinity, -Infinity])('rejects portion %s', (portion) =>
    expect(() => calculateItemNutrition(null, portion)).toThrow(),
  );
  it('distinguishes known zero, unknown and independently known kcal', () => {
    const food = catalog.listDemoFoods()[0]!;
    expect(
      calculateItemNutrition({ ...food, carbPerServing: 0 }, 1),
    ).toMatchObject({ carbEstimate: 0, nutritionState: 'KNOWN' });
    expect(
      calculateItemNutrition(
        { ...food, carbPerServing: null, kcalPerServing: 16 },
        1,
      ),
    ).toEqual({
      carbEstimate: null,
      kcalEstimate: 16,
      nutritionState: 'UNKNOWN',
    });
  });
  it('completeness handles empty, excluded, all unknown and partial', () => {
    const i = draft().items[0]!,
      u = { ...i, carbEstimate: null, nutritionState: 'UNKNOWN' as const };
    expect(calculateMealNutrition([])).toMatchObject({
      totalCarbEstimate: null,
      completeness: 'UNKNOWN',
    });
    expect(calculateMealNutrition([u])).toMatchObject({
      totalCarbEstimate: null,
      completeness: 'UNKNOWN',
    });
    expect(calculateMealNutrition([i, u])).toMatchObject({
      totalCarbEstimate: i.carbEstimate,
      completeness: 'PARTIAL',
    });
    expect(
      calculateMealNutrition([i, { ...u, includedInTotal: false }])
        .completeness,
    ).toBe('COMPLETE');
  });
  it('snapshot does not share mutable item objects', () => {
    const d = draft(),
      saved = buildSnapshot(d, meal().id, now.toISOString(), 'v1', null);
    d.items[0]!.displayName = 'changed';
    expect(saved.items[0]!.displayName).not.toBe('changed');
    expect(saved.catalogVersion).toBe('v1');
  });
});
describe('review state', () => {
  it('rejects illegal save and accepts failure retry', () => {
    expect(() => transition('ANALYZING', 'SAVE_REQUESTED')).toThrow();
    expect(transition('SAVING', 'SAVE_FAILED')).toBe('SAVE_ERROR');
    expect(transition('SAVE_ERROR', 'RETRY_SAVE')).toBe('SAVING');
  });
  it('unmatched requires confirmation, unknown can then be saved', () => {
    const d = applyAnalysisResult(
      { ...draft(), analysisState: 'ANALYZING', items: [] },
      {
        requestId: 'mock',
        candidates: [
          {
            rawName: 'món lạ',
            suggestedPortionMultiplier: null,
            suggestedPortionLabel: null,
            providerConfidence: null,
          },
        ],
      },
      catalog,
    );
    expect(d.analysisState).toBe('REVIEW_REQUIRED');
    const corrected = correctMealItems(
      d,
      d.items.map((i) => ({ ...i, userCorrected: true })),
      catalog,
    );
    expect(corrected.analysisState).toBe('REVIEW_READY');
    expect(corrected.totalCarbEstimate).toBeNull();
  });
  it('late AI cannot overwrite a correction', () => {
    const d = draft();
    d.items[0]!.userCorrected = true;
    const result = applyAnalysisResult(
      d,
      { requestId: 'late', candidates: [] },
      catalog,
    );
    expect(result).toBe(d);
  });
  it('exact aliases retain Vietnamese diacritics', () => {
    expect(catalog.findExactByAlias('  CƠM   TRẮNG ').length).toBe(1);
    expect(catalog.findExactByAlias('com trang')).toHaveLength(0);
  });
});
describe('weekly and glucose', () => {
  it('includes start and excludes end; absence is not zero', () => {
    const { start, end } = weeklyWindow(now),
      m = meal();
    const result = aggregateWeekly(
      [
        { ...m, createdAt: start.toISOString() },
        { ...m, createdAt: end.toISOString() },
      ],
      [],
      now,
    );
    expect(result.loggedMealCount).toBe(1);
    expect(result.dailyLoggedCarbEstimates[1]!.totalKnownCarb).toBeNull();
    expect(result.dailyLoggedCarbEstimates).toHaveLength(7);
  });
  it('uses local calendar boundaries', () => {
    const { start, end } = weeklyWindow(new Date(2026, 2, 9, 12));
    expect(start.getHours()).toBe(0);
    expect(start.getDate()).toBe(3);
    expect(end.getDate()).toBe(10);
  });
  it.each([0, -1, NaN, Infinity])('rejects invalid glucose %s', (value) =>
    expect(
      isValidGlucose({ ...demoData(catalog, now).readings[0]!, value }),
    ).toBe(false),
  );
});
it('calendar window handles timezone offset changes', () => {
  const { start, end } = weeklyWindow(new Date(2026, 2, 9, 12));
  const offsetChange =
    (end.getTimezoneOffset() - start.getTimezoneOffset()) * 60000;
  expect(end.getTime() - start.getTime()).toBe(7 * 24 * 3600000 + offsetChange);
  if (process.env.TZ === 'America/New_York')
    expect(end.getTime() - start.getTime()).toBe(167 * 3600000);
});
