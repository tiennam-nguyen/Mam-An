import type { Meal } from '../../domain/meal/meal';
import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
export interface DemoRepository {
  seed(
    version: string,
    meals: readonly Meal[],
    readings: readonly GlucoseReading[],
    force: boolean,
  ): Promise<Result<void, AppError>>;
}
