import { entriesFromItems, foodRole } from '../../domain/meal/mealEntry';
import type { FoodCatalog } from '../ports/foodCatalog';
import type { DemoRepository } from '../ports/demoRepository';
import type {
  MealDraftItemId,
  MealId,
  GlucoseReadingId,
} from '../../domain/common/brandedIds';
import type { Meal } from '../../domain/meal/meal';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import {
  calculateItemNutrition,
  calculateMealNutrition,
} from '../../domain/meal/nutritionCalculator';
import { localDate } from '../../domain/summary/weeklyAggregator';
export function demoData(catalog: FoodCatalog, now: Date) {
  const meals: Meal[] = [],
    readings: GlucoseReading[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(12, 0, 0, 0);
    const id = ('demo:v1:meal:' + i) as MealId;
    const menu =
      i < 3
        ? ['rice', 'egg', 'cucumber']
        : i === 3
          ? ['brown-rice', 'chicken-breast', 'cucumber']
          : i === 4
            ? ['rice-noodles', 'tofu', 'broth']
            : i === 5
              ? ['bread', 'milk', 'banana']
              : ['sweet-potato', 'yogurt', 'papaya'];
    const items = catalog
      .listDemoFoods()
      .filter((f) => menu.includes(f.id))
      .map((food) => ({
        itemId: (id + ':' + food.id) as MealDraftItemId,
        foodId: food.id,
        displayName: food.nameVi,
        portionMultiplier: 1,
        portionLabel: food.servingLabel,
        userCorrected: false,
        includedInTotal: true,
        ...calculateItemNutrition(food, 1),
      }));
    meals.push({
      schemaVersion: 2,
      entries: entriesFromItems(items, 'USER').map((e) => ({
        ...e,
        components: e.components.map((c) => ({
          ...c,
          role: foodRole(c.foodId ? catalog.getFoodById(c.foodId) : null),
        })),
      })),
      id,
      createdAt: date.toISOString(),
      source: 'DEMO_SAMPLE',
      thumbnailRef: { kind: 'BUNDLED_ASSET', path: '/demo/images/meal.svg' },
      catalogVersion: catalog.getCatalogVersion(),
      items,
      ...calculateMealNutrition(items),
      note: 'Bữa ăn mẫu · số liệu giả lập, không phải gợi ý thực đơn',
      isDemo: true,
    });
    if (i < 3)
      readings.push({
        id: ('demo:v3:pre:' + i) as GlucoseReadingId,
        source: 'DEMO',
        value: 5 + i / 10,
        unit: 'MMOL_L',
        measuredAt: new Date(date.getTime() - 10 * 60000).toISOString(),
        mealId: id,
        timingTag: 'BEFORE_MEAL',
        note: 'Số đo giả lập để minh họa',
        isDemo: true,
      });
    date.setHours(i < 3 ? 14 : 13);
    readings.push({
      id: ('demo:v1:glucose:' + i) as GlucoseReadingId,
      source: 'DEMO',
      value: 6 + i / 10,
      unit: 'MMOL_L',
      measuredAt: date.toISOString(),
      mealId: i === 6 ? null : id,
      timingTag: 'AFTER_MEAL',
      note: 'Số đo giả lập để minh họa',
      isDemo: true,
    });
  }
  return { meals, readings, version: 'v3:' + localDate(now) };
}
export function seedDemoData(
  repo: DemoRepository,
  catalog: FoodCatalog,
  now: Date,
  force = false,
) {
  const data = demoData(catalog, now);
  return repo.seed(data.version, data.meals, data.readings, force);
}
