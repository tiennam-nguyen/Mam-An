export type Id<T extends string> = string & { readonly __brand: T };
export type FoodId = Id<'FoodId'>;
export type MealId = Id<'MealId'>;
export type MealDraftItemId = Id<'MealDraftItemId'>;
export type AnalysisSessionId = Id<'AnalysisSessionId'>;
export type GlucoseReadingId = Id<'GlucoseReadingId'>;
export type ThumbnailId = Id<'ThumbnailId'>;
