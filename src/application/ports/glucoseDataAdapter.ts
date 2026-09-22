import type { GlucoseReading } from '../../domain/glucose/glucoseReading';
import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
/** Extension boundary only: no device auth, background sync or remote history. */
export interface GlucoseDataAdapter {
  read(
    signal: AbortSignal,
  ): Promise<Result<readonly GlucoseReading[], AppError>>;
}
