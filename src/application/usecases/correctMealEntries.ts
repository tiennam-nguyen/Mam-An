import type { MealDraft } from '../../domain/meal/mealDraft';
import { calculateComponent, cloneEntries, flattenEntries, entryTotals, type MealEntry } from '../../domain/meal/mealEntry';
import type { FoodCatalog } from '../ports/foodCatalog';
export function correctMealEntries(draft: MealDraft, entries: readonly MealEntry[], catalog: FoodCatalog): MealDraft {
  if (!['REVIEW_REQUIRED', 'REVIEW_READY', 'SAVE_ERROR'].includes(draft.analysisState)) return draft;
  const calculated = cloneEntries(entries).map(e => ({ ...e, components: e.components.map(c => calculateComponent(c, c.foodId ? catalog.getFoodById(c.foodId) : null)) }));
  return { ...draft, entries: calculated, items: flattenEntries(calculated), ...entryTotals(calculated),
    analysisState: calculated.some(e => e.components.some(c => !c.userCorrected && (c.matchState !== 'MATCHED' || c.source === 'TEMPLATE'))) ? 'REVIEW_REQUIRED' : 'REVIEW_READY' };
}
