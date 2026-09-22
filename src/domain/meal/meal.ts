import type { MealEntry } from './mealEntry';
import type { MealId, ThumbnailId } from '../common/brandedIds';
import type { MealCompleteness, MealDraftItem, MealSource } from './mealDraft';
export type ThumbnailRef =
  | { kind: 'IDB_BLOB'; id: ThumbnailId }
  | { kind: 'BUNDLED_ASSET'; path: string };
export interface Meal {
  schemaVersion: 2;
  entries: readonly MealEntry[];
  id: MealId;
  createdAt: string;
  source: MealSource;
  thumbnailRef: ThumbnailRef | null;
  catalogVersion: string;
  items: readonly MealDraftItem[];
  totalCarbEstimate: number | null;
  totalKcalEstimate: number | null;
  completeness: MealCompleteness;
  note: string | null;
  isDemo: boolean;
}
