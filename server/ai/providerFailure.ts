import { fail, type ErrorCode } from '../../src/shared/errors/appError.js';
export function providerFailure(code: ErrorCode, reason: string, retryable = false) {
  const result = fail(code, 'AI', retryable);
  if (!result.ok) result.error.detail = reason;
  return result;
}
export function httpProviderFailure(status: number) {
  if (status === 429) return providerFailure('AI_RATE_LIMITED', 'RATE_LIMIT', true);
  if (status === 408 || status === 504) return providerFailure('AI_TIMEOUT', 'TIMEOUT', true);
  if (status >= 500) return providerFailure('AI_UNAVAILABLE', 'OUTAGE', true);
  return providerFailure('AI_UPSTREAM_ERROR',
    status === 401 || status === 403 ? 'AUTH' : status === 404 ? 'MODEL_UNAVAILABLE' :
    status === 400 || status === 422 ? 'UNSUPPORTED_REQUEST' : status === 402 ? 'BILLING_REQUIRED' : 'UPSTREAM');
}
