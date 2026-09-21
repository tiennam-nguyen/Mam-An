import type { FoodId } from '../common/brandedIds';
import type { FoodItem } from '../food/foodItem';
import type { MealDraft } from './mealDraft';
import { calculateComponent, cloneEntries, entryTotals, flattenEntries, validatePortion, type ComponentRole, type MealEntry, type PortionSelection, type PortionUnit } from './mealEntry';
export type ScenarioOperation =
  | { type: 'CHANGE_PORTION'; targetComponentId: string; newPortion: PortionSelection }
  | { type: 'REMOVE_COMPONENT'; targetComponentId: string }
  | { type: 'REPLACE_COMPONENT'; targetComponentId: string; replacementFoodId: FoodId; newPortion: PortionSelection }
  | { type: 'ADD_COMPONENT'; targetEntryId: string; foodId: FoodId; role: ComponentRole; portion: PortionSelection };
interface Catalog { getFoodById(id: FoodId): FoodItem | null; getPortionUnits?(id: FoodId): readonly PortionUnit[] }
export interface MealScenario {
  id: string; baseSessionId: string; baselineKey: string; baseline: MealDraft;
  operations: readonly ScenarioOperation[]; operationLabels: readonly string[]; resultingEntries: readonly MealEntry[];
  before: ReturnType<typeof entryTotals>; after: ReturnType<typeof entryTotals>;
  carbDeltaVsBaseline: number | null; kcalDeltaVsBaseline: number | null;
}
const key = (d: MealDraft) => JSON.stringify([d.sessionId, d.entries]);
function validateUnit(foodId: FoodId | null, portion: PortionSelection, catalog: Catalog) {
  validatePortion(portion);
  if (!foodId) return;
  const units = catalog.getPortionUnits?.(foodId) ?? [];
  const unit = units.find(u => u.id === portion.unitId);
  if (unit ? unit.factorToReference !== portion.factorToReferenceSnapshot : !['reference', 'legacy-reference-serving'].includes(portion.unitId) || portion.factorToReferenceSnapshot !== 1) throw new Error('Invalid food portion unit');
}
export function createScenario(baseline: MealDraft, operations: readonly ScenarioOperation[], catalog: Catalog, id = 'scenario'): MealScenario {
  if (!['REVIEW_READY', 'SAVE_ERROR'].includes(baseline.analysisState)) throw new Error('Review required');
  let entries = cloneEntries(baseline.entries);
  const labels: string[] = [];
  operations.forEach((op, index) => {
    if (op.type === 'ADD_COMPONENT') {
      const entry = entries.find(e => e.entryId === op.targetEntryId), food = catalog.getFoodById(op.foodId);
      if (!entry || !food) throw new Error('Missing add target'); validateUnit(food.id, op.portion, catalog);
      const componentId = id + ':added:' + index;
      if (entries.some(e => e.components.some(c => c.componentId === componentId))) throw new Error('Duplicate component');
      entry.components = [...entry.components, calculateComponent({ componentId, foodId: food.id, displayName: food.nameVi, role: op.role, portion: { ...op.portion }, source: 'USER', userCorrected: true, includedInTotal: true, matchState: 'MATCHED', carbEstimate: null, kcalEstimate: null, nutritionState: 'UNKNOWN' }, food)];
      labels.push('Thêm ' + food.nameVi); return;
    }
    const entry = entries.find(e => e.components.some(c => c.componentId === op.targetComponentId));
    const current = entry?.components.find(c => c.componentId === op.targetComponentId);
    if (!entry || !current) throw new Error('Missing component');
    if (op.type === 'REMOVE_COMPONENT') { entry.components = entry.components.filter(c => c.componentId !== current.componentId); labels.push('Bỏ ' + current.displayName); return; }
    const foodId = op.type === 'REPLACE_COMPONENT' ? op.replacementFoodId : current.foodId;
    const food = foodId ? catalog.getFoodById(foodId) : null;
    if (foodId && !food) throw new Error('Missing food'); validateUnit(foodId, op.newPortion, catalog);
    const component = calculateComponent({ ...current, foodId, displayName: op.type === 'REPLACE_COMPONENT' ? food!.nameVi : current.displayName, portion: { ...op.newPortion }, userCorrected: true, source: 'USER', matchState: food ? 'MATCHED' : 'UNMATCHED' }, food);
    entry.components = entry.components.map(c => c.componentId === current.componentId ? component : c);
    labels.push(op.type === 'REPLACE_COMPONENT' ? 'Thay ' + current.displayName + ' → ' + food!.nameVi : current.displayName + ': ' + op.newPortion.quantity + ' × ' + op.newPortion.displayLabelSnapshot);
  });
  const before = entryTotals(baseline.entries), after = entryTotals(entries);
  const delta = (a: number | null, b: number | null) => a === null || b === null ? null : b - a;
  return { id, baseSessionId: baseline.sessionId, baselineKey: key(baseline), baseline: { ...baseline, entries: cloneEntries(baseline.entries), items: baseline.items.map(i => ({ ...i })) }, operations: operations.map(o => ({ ...o, ...('newPortion' in o ? { newPortion: { ...o.newPortion } } : {}), ...('portion' in o ? { portion: { ...o.portion } } : {}) })), operationLabels: labels, resultingEntries: entries, before, after, carbDeltaVsBaseline: delta(before.totalCarbEstimate, after.totalCarbEstimate), kcalDeltaVsBaseline: delta(before.totalKcalEstimate, after.totalKcalEstimate) };
}
export function applyScenario(baseline: MealDraft, scenario: MealScenario): MealDraft {
  if (scenario.baseSessionId !== baseline.sessionId || scenario.baselineKey !== key(baseline) || !['REVIEW_READY', 'SAVE_ERROR'].includes(baseline.analysisState)) throw new Error('Stale scenario');
  const entries = cloneEntries(scenario.resultingEntries);
  return { ...baseline, entries, items: flattenEntries(entries), ...entryTotals(entries), analysisState: 'REVIEW_READY' };
}
export function discardScenario(baseline: MealDraft): MealDraft { return { ...baseline, entries: cloneEntries(baseline.entries), items: baseline.items.map(i => ({ ...i })) }; }
