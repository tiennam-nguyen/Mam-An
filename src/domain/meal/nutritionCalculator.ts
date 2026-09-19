import type { FoodItem } from '../food/foodItem';
import type { MealDraftItem, NutritionState } from './mealDraft';
export function calculateItemNutrition(food: FoodItem | null, portion: number) {
  if (!Number.isFinite(portion) || portion <= 0) throw new Error('Invalid portion');
  const scale = (value: number | null | undefined): number | null => {
    if (value == null) return null;
    const result = value * portion;
    if (!Number.isFinite(result) || result < 0) throw new Error('Invalid nutrition');
    return result;
  };
  return { carbEstimate: scale(food?.carbPerServing), kcalEstimate: scale(food?.kcalPerServing), nutritionState: (food?.carbPerServing == null ? 'UNKNOWN' : 'KNOWN') as NutritionState };
}
export function calculateMealNutrition(items: readonly MealDraftItem[]) {
  const included = items.filter(item => item.includedInTotal);
  const sum = (field: 'carbEstimate' | 'kcalEstimate') => {
    const values = included.flatMap(item => item[field] === null ? [] : [item[field]]);
    if (!values.length) return null;
    const total = values.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(total)) throw new Error('Nutrition overflow');
    return total;
  };
  const known = included.filter(item => item.carbEstimate !== null).length;
  return { totalCarbEstimate: sum('carbEstimate'), totalKcalEstimate: sum('kcalEstimate'), completeness: !known ? 'UNKNOWN' as const : known === included.length ? 'COMPLETE' as const : 'PARTIAL' as const };
}
