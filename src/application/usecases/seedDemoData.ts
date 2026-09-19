import type { FoodCatalog } from '../ports/foodCatalog';
import type { DemoRepository } from '../ports/demoRepository';
import type { MealDraftItemId, MealId, GlucoseReadingId } from '../../domain/common/brandedIds';
import type { Meal } from '../../domain/meal/meal';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import { calculateItemNutrition,calculateMealNutrition } from '../../domain/meal/nutritionCalculator';
import { localDate } from '../../domain/summary/weeklyAggregator';
export function demoData(catalog: FoodCatalog, now: Date) {
  const meals: Meal[]=[], readings: GlucoseReading[]=[];
  for(let i=0;i<7;i++) {
    const date=new Date(now); date.setDate(date.getDate()-i); date.setHours(12,0,0,0);
    const id=('demo:v1:meal:'+i) as MealId;
    const items=catalog.listDemoFoods().filter(f=>f.carbPerServing!==null).map(food=>({itemId:(id+':'+food.id) as MealDraftItemId,foodId:food.id,displayName:food.nameVi,portionMultiplier:1,portionLabel:food.servingLabel,userCorrected:false,includedInTotal:true,...calculateItemNutrition(food,1)}));
    meals.push({id,createdAt:date.toISOString(),source:'DEMO_SAMPLE',thumbnailRef:{kind:'BUNDLED_ASSET',path:'/demo/images/meal.svg'},catalogVersion:catalog.getCatalogVersion(),items,...calculateMealNutrition(items),note:'Bữa ăn mẫu',isDemo:true});
    date.setHours(14);
    readings.push({id:('demo:v1:glucose:'+i) as GlucoseReadingId,value:6+i/10,unit:'MMOL_L',measuredAt:date.toISOString(),mealId:id,timingTag:'AFTER_MEAL',note:'Số đo giả lập để minh họa',isDemo:true});
  }
  return {meals,readings,version:'v1:'+localDate(now)};
}
export function seedDemoData(repo: DemoRepository,catalog: FoodCatalog,now:Date,force=false) { const data=demoData(catalog,now); return repo.seed(data.version,data.meals,data.readings,force); }
