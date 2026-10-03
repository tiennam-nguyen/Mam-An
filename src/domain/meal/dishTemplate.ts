import {
  calculateComponent,
  foodRole,
  defaultPortion,
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
          role: foodRole(food) === 'OTHER' ? t.role : foodRole(food),
          portion: defaultPortion(food),
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
