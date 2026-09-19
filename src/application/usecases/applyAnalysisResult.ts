import type { MealDraft, MealDraftItem } from '../../domain/meal/mealDraft';
import type { MealDraftItemId } from '../../domain/common/brandedIds';
import type { AnalysisResult } from '../ports/aiGateway';
import type { FoodCatalog } from '../ports/foodCatalog';
import {
  calculateItemNutrition,
  calculateMealNutrition,
} from '../../domain/meal/nutritionCalculator';
import { transition } from '../../domain/meal/mealAnalysisState';
export function applyAnalysisResult(
  draft: MealDraft,
  result: AnalysisResult,
  catalog: FoodCatalog,
): MealDraft {
  if (
    draft.analysisState !== 'ANALYZING' ||
    draft.items.some((i) => i.userCorrected)
  )
    return draft;
  let requiresReview = false;
  const items: MealDraftItem[] = result.candidates.map((candidate, index) => {
    const matches = catalog.findExactByAlias(candidate.rawName),
      food = matches.length === 1 ? matches[0]! : null;
    if (!food) requiresReview = true;
    const suggestion = candidate.suggestedPortionMultiplier;
    const portion =
      suggestion !== null && Number.isFinite(suggestion) && suggestion > 0
        ? suggestion
        : 1;
    return {
      itemId: (draft.sessionId + ':' + index) as MealDraftItemId,
      foodId: food?.id ?? null,
      displayName: food?.nameVi ?? candidate.rawName,
      portionMultiplier: portion,
      portionLabel: food?.servingLabel ?? '1 phần chưa xác định',
      userCorrected: false,
      includedInTotal: true,
      ...calculateItemNutrition(food, portion),
    };
  });
  return {
    ...draft,
    items,
    ...calculateMealNutrition(items),
    analysisState: transition(
      draft.analysisState,
      'ANALYSIS_SUCCEEDED',
      requiresReview,
    ),
  };
}
