import {
  calculateComponent,
  referencePortion,
  type DishTemplate,
  type MealEntry,
} from './mealEntry';
import type { FoodItem } from '../food/foodItem';
export function instantiateTemplate(
  template: DishTemplate,
  entryId: string,
  lookup: (id: string) => FoodItem | null,
): MealEntry {
  return {
    entryId,
    dishTemplateId: template.id,
    displayName: template.nameVi,
    userCorrected: false,
    components: template.defaultComponents.map((t) => {
      const food = t.foodId ? lookup(t.foodId) : null;
      return calculateComponent(
        {
          componentId: entryId + ':' + t.key,
          foodId: food?.id ?? null,
          displayName: t.labelVi,
          role: t.role,
          portion: referencePortion(food),
          source: 'TEMPLATE',
          userCorrected: false,
          includedInTotal: true,
          carbEstimate: null,
          kcalEstimate: null,
          nutritionState: 'UNKNOWN',
          matchState: food ? 'MATCHED' : 'UNMATCHED',
        },
        food,
      );
    }),
  };
}
