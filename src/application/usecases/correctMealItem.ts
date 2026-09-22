import { entriesFromItems } from '../../domain/meal/mealEntry';
import type { MealDraft, MealDraftItem } from '../../domain/meal/mealDraft';
import type { FoodCatalog } from '../ports/foodCatalog';
import {
  calculateItemNutrition,
  calculateMealNutrition,
} from '../../domain/meal/nutritionCalculator';
import { transition } from '../../domain/meal/mealAnalysisState';
export function correctMealItems(
  draft: MealDraft,
  items: readonly MealDraftItem[],
  catalog: FoodCatalog,
): MealDraft {
  if (
    !['REVIEW_REQUIRED', 'REVIEW_READY', 'SAVE_ERROR'].includes(
      draft.analysisState,
    )
  )
    return draft;
  const calculated = items.map((i) => ({
    ...i,
    ...calculateItemNutrition(
      i.foodId ? catalog.getFoodById(i.foodId) : null,
      i.portionMultiplier,
    ),
  }));
  const unresolved = calculated.some((i) => !i.foodId && !i.userCorrected);
  return {
    ...draft,
    entries: entriesFromItems(calculated, 'USER'),
    items: calculated,
    ...calculateMealNutrition(calculated),
    analysisState: transition(draft.analysisState, 'DRAFT_CHANGED', unresolved),
  };
}
