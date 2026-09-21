import { cloneEntries } from './mealEntry';
import type { MealId } from '../common/brandedIds';
import type { MealDraft } from './mealDraft';
import type { Meal, ThumbnailRef } from './meal';
import { calculateMealNutrition } from './nutritionCalculator';
export function buildSnapshot(
  draft: MealDraft,
  id: MealId,
  createdAt: string,
  catalogVersion: string,
  thumbnailRef: ThumbnailRef | null,
): Meal {
  if (
    !draft.items.length ||
    draft.items.some(
      (i) =>
        !i.displayName.trim() ||
        !Number.isFinite(i.portionMultiplier) ||
        i.portionMultiplier <= 0,
    )
  )
    throw new Error('Invalid draft');
  return {
    schemaVersion: 2,
    entries: cloneEntries(draft.entries),
    id,
    createdAt,
    catalogVersion,
    thumbnailRef,
    source: draft.source,
    items: draft.items.map((i) => ({ ...i })),
    ...calculateMealNutrition(draft.items),
    note: draft.note,
    isDemo: draft.source === 'DEMO_SAMPLE',
  };
}
