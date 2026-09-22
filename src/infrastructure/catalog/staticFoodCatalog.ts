import v2 from './generated/catalog.v2.json';
import type { DishTemplate } from '../../domain/meal/mealEntry';
import type { FoodCatalog } from '../../application/ports/foodCatalog';
import type { FoodId } from '../../domain/common/brandedIds';
import type { FoodItem } from '../../domain/food/foodItem';
import { normalizeFoodName } from '../../domain/food/normalizeFoodName';
import { FoodSchema } from './catalogSchemas';
import data from './generated/foods.vi.v1.json';
import manifest from './generated/manifest.json';
export class StaticFoodCatalog implements FoodCatalog {
  private foods = data.map((row): FoodItem => {
    const food = FoodSchema.parse(row);
    return { ...food, id: food.id as FoodId };
  });
  getPortionUnits(id: string) {
    return v2.portions.filter((p) => p.foodId === id);
  }
  listDishTemplates() {
    return v2.templates as readonly DishTemplate[];
  }
  getCatalogVersion() {
    return manifest.catalogVersion;
  }
  getFoodById(id: string) {
    return this.foods.find((f) => f.id === id) ?? null;
  }
  findExactByAlias(name: string) {
    const key = normalizeFoodName(name);
    return this.foods.filter((f) =>
      [f.nameVi, ...f.aliases].some((a) => normalizeFoodName(a) === key),
    );
  }
  search(query: string) {
    const key = normalizeFoodName(query);
    return this.foods.filter((f) =>
      [f.nameVi, ...f.aliases].some((a) => normalizeFoodName(a).includes(key)),
    );
  }
  listDemoFoods() {
    return this.foods;
  }
}
