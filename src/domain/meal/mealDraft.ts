import type { AnalysisSessionId, FoodId, MealDraftItemId } from '../common/brandedIds';
import type { MealAnalysisState } from './mealAnalysisState';
export type NutritionState = 'KNOWN' | 'UNKNOWN';
export type MealCompleteness = 'COMPLETE' | 'PARTIAL' | 'UNKNOWN';
export type MealSource = 'CAMERA' | 'FILE' | 'DEMO_SAMPLE';
export interface MealDraftItem { itemId: MealDraftItemId; foodId: FoodId | null; displayName: string; portionMultiplier: number; portionLabel: string; carbEstimate: number | null; kcalEstimate: number | null; userCorrected: boolean; includedInTotal: boolean; nutritionState: NutritionState }
export interface MealDraft { sessionId: AnalysisSessionId; source: MealSource; analysisState: MealAnalysisState; imagePreviewUrl: string | null; pendingThumbnail: Blob | null; items: readonly MealDraftItem[]; totalCarbEstimate: number | null; totalKcalEstimate: number | null; completeness: MealCompleteness; note: string | null }
