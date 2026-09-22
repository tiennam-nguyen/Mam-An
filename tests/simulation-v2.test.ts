import { it, expect } from 'vitest';
import { draft, catalog } from './fixtures/helpers';
import {
  createScenario,
  applyScenario,
  discardScenario,
} from '../src/domain/meal/decisionSimulator';
import { referencePortion } from '../src/domain/meal/mealEntry';
it('projects all four operations, preserves baseline and only applies into a new draft', () => {
  const baseline = draft(),
    before = JSON.stringify(baseline),
    first = baseline.entries[0]!.components[0]!,
    entry = baseline.entries[0]!;
  const rice = catalog.listDemoFoods().find((f) => f.id === 'rice')!;
  const result = createScenario(
    baseline,
    [
      {
        type: 'CHANGE_PORTION',
        targetComponentId: first.componentId,
        newPortion: { ...first.portion, quantity: 0.5 },
      },
      {
        type: 'REPLACE_COMPONENT',
        targetComponentId: first.componentId,
        replacementFoodId: rice.id,
        newPortion: referencePortion(rice),
      },
      {
        type: 'REMOVE_COMPONENT',
        targetComponentId: baseline.entries[1]!.components[0]!.componentId,
      },
      {
        type: 'ADD_COMPONENT',
        targetEntryId: entry.entryId,
        foodId: rice.id,
        role: 'STARCH',
        portion: referencePortion(rice),
      },
    ],
    catalog,
  );
  expect(JSON.stringify(baseline)).toBe(before);
  expect(
    result.resultingEntries[0]!.components.map((c) => c.carbEstimate),
  ).toEqual([29.4, 29.4]);
  expect(result.resultingEntries[1]!.components).toHaveLength(0);
  expect(discardScenario(baseline)).toEqual(baseline);
  const applied = applyScenario(baseline, result);
  expect(applied.analysisState).toBe('REVIEW_READY');
  expect(applied.entries).not.toBe(result.resultingEntries);
  expect(applied.totalCarbEstimate).toBe(result.after.totalCarbEstimate);
  expect(() => applyScenario({ ...baseline, entries: [] }, result)).toThrow(
    'Stale scenario',
  );
});
it('rejects invalid targets and portions and retains null deltas', () => {
  const baseline = draft(),
    c = baseline.entries[0]!.components[0]!;
  expect(() =>
    createScenario(
      baseline,
      [{ type: 'REMOVE_COMPONENT', targetComponentId: 'missing' }],
      catalog,
    ),
  ).toThrow();
  expect(() =>
    createScenario(
      baseline,
      [
        {
          type: 'CHANGE_PORTION',
          targetComponentId: c.componentId,
          newPortion: { ...c.portion, quantity: 0 },
        },
      ],
      catalog,
    ),
  ).toThrow();
  const empty = createScenario(
    baseline,
    baseline.entries.flatMap((e) =>
      e.components.map((c) => ({
        type: 'REMOVE_COMPONENT' as const,
        targetComponentId: c.componentId,
      })),
    ),
    catalog,
  );
  expect(empty.after.totalCarbEstimate).toBeNull();
  expect(empty.carbDeltaVsBaseline).toBeNull();
});
