import type { Result } from '../../domain/common/result';
export type ErrorCode =
  | 'MIGRATION_FAILED'
  | 'EXPLANATION_INVALID'
  | 'CAPABILITY_UNAVAILABLE'
  | 'INVALID_IMAGE'
  | 'IMAGE_TOO_LARGE'
  | 'NETWORK_UNAVAILABLE'
  | 'AI_TIMEOUT'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'AI_UPSTREAM_ERROR'
  | 'CATALOG_UNMATCHED'
  | 'NUTRITION_UNKNOWN'
  | 'INVALID_INPUT'
  | 'STORAGE_WRITE_FAILED'
  | 'STORAGE_READ_FAILED'
  | 'THUMBNAIL_FAILED'
  | 'REPORT_RENDER_FAILED'
  | 'CONFIG_INVALID'
  | 'INTERNAL_ERROR';
export interface AppError {
  code: ErrorCode;
  retryable: boolean;
  source: 'CLIENT' | 'STORAGE' | 'AI' | 'CATALOG' | 'REPORT' | 'CONFIG';
  requestId: string | null;
  detail: string | null;
}
export function fail(
  code: ErrorCode,
  source: AppError['source'] = 'CLIENT',
  retryable = false,
): Result<never, AppError> {
  return {
    ok: false,
    error: { code, source, retryable, requestId: null, detail: null },
  };
}
