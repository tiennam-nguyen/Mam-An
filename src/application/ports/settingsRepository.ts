import type { UserSettings } from '../../domain/glucose/glucoseReading';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
export interface SettingsRepository {
  get(): Promise<Result<UserSettings, AppError>>;
  save(settings: UserSettings): Promise<Result<void, AppError>>;
}
