import type { MealId } from '../../domain/common/brandedIds';
import type { Meal } from '../../domain/meal/meal';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
import type { ThumbnailRecord } from './thumbnailRepository';
export interface MealListQuery { fromInclusive?: string; toExclusive?: string; isDemo?: boolean }
export interface MealRepository { save(meal: Meal, thumbnail: ThumbnailRecord | null): Promise<Result<void, AppError>>; getById(id: MealId): Promise<Result<Meal | null, AppError>>; list(query?: MealListQuery): Promise<Result<readonly Meal[], AppError>> }
