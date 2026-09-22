import type { PortionUnit, DishTemplate } from '../../domain/meal/mealEntry';
import type { FoodId } from '../../domain/common/brandedIds';
import type { FoodItem } from '../../domain/food/foodItem';
export interface FoodCatalog {
  getPortionUnits?(id: FoodId): readonly PortionUnit[];
  listDishTemplates?(): readonly DishTemplate[];
  getCatalogVersion(): string;
  getFoodById(id: FoodId): FoodItem | null;
  findExactByAlias(name: string): readonly FoodItem[];
  search(query: string): readonly FoodItem[];
  listDemoFoods(): readonly FoodItem[];
}
