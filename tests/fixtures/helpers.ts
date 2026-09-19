import { StaticFoodCatalog } from '../../src/infrastructure/catalog/staticFoodCatalog';
import { demoData } from '../../src/application/usecases/seedDemoData';
import type { MealDraft } from '../../src/domain/meal/mealDraft';
import type { AnalysisSessionId } from '../../src/domain/common/brandedIds';
export const catalog = new StaticFoodCatalog();
export const now = new Date('2026-09-19T08:00:00Z');
export function meal() {
  return demoData(catalog, now).meals[0]!;
}
export function draft(): MealDraft {
  const m = meal();
  return {
    sessionId: 'test-session' as AnalysisSessionId,
    source: 'FILE',
    analysisState: 'REVIEW_READY',
    imagePreviewUrl: null,
    pendingThumbnail: null,
    items: m.items.map((i) => ({ ...i })),
    totalCarbEstimate: m.totalCarbEstimate,
    totalKcalEstimate: m.totalKcalEstimate,
    completeness: m.completeness,
    note: null,
  };
}
