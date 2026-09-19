import type { MealId, ThumbnailId } from '../../domain/common/brandedIds';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
export interface ThumbnailRecord { id: ThumbnailId; mealId: MealId; blob: Blob; mimeType: 'image/jpeg' | 'image/webp'; createdAt: string; isDemo: boolean }
export interface ThumbnailRepository { get(id: ThumbnailId): Promise<Result<ThumbnailRecord | null, AppError>> }
