import type { GlucoseReadingId, MealId } from '../../domain/common/brandedIds';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
export interface GlucoseListQuery { fromInclusive?: string; toExclusive?: string; mealId?: MealId; isDemo?: boolean }
export interface GlucoseRepository { save(reading: GlucoseReading): Promise<Result<void, AppError>>; getById(id: GlucoseReadingId): Promise<Result<GlucoseReading | null, AppError>>; list(query?: GlucoseListQuery): Promise<Result<readonly GlucoseReading[], AppError>> }
