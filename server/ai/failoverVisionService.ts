import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from './visionAnalysisProvider.js';
import type { Result } from '../../src/domain/common/result.js';
import type { AppError } from '../../src/shared/errors/appError.js';
import { fail } from '../../src/shared/errors/appError.js';
const availability = new Set([
  'AI_RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_UNAVAILABLE',
  'NETWORK_UNAVAILABLE',
  'AI_UPSTREAM_ERROR',
  'AI_INVALID_RESPONSE',
]);
export class FailoverVisionService {
  constructor(
    private providers: readonly VisionAnalysisProvider[],
    private timeoutMs: number,
    private observe?: (attempt: { provider: string; code: string; reason: string | null; latencyMs: number }) => void,
    private budgetMs = 25000,
  ) {}
  async analyze(
    input: ProviderAnalyzeInput,
    parentSignal: AbortSignal,
  ): Promise<Result<ProviderAnalysisResult, AppError>> {
    let last: Result<ProviderAnalysisResult, AppError> = fail(
      'AI_UNAVAILABLE',
      'AI',
      true,
    );
    const deadline = Date.now() + this.budgetMs;
    for (const provider of this.providers) {
      if (parentSignal.aborted) return fail('AI_UNAVAILABLE', 'AI');
      if (!provider.isConfigured()) continue;
      const remaining = deadline - Date.now();
      if (remaining <= 0) return fail('AI_TIMEOUT', 'AI', true);
      const started = Date.now();
      const controller = new AbortController();
      let cancel: (result: Result<ProviderAnalysisResult, AppError>) => void = () => {};
      const canceled = new Promise<Result<ProviderAnalysisResult, AppError>>(resolve => { cancel = resolve; });
      const abort = () => { controller.abort(); cancel(fail('AI_UNAVAILABLE', 'AI')); };
      parentSignal.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<Result<ProviderAnalysisResult, AppError>>(
        (resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve(fail('AI_TIMEOUT', 'AI', true));
          }, Math.min(this.timeoutMs, remaining));
        },
      );
      try {
        last = await Promise.race([
          provider.analyze(input, controller.signal),
          timeout,
          canceled,
        ]);
      } catch {
        last = fail('AI_UNAVAILABLE', 'AI', true);
      } finally {
        clearTimeout(timer);
        parentSignal.removeEventListener('abort', abort);
      }
      if (parentSignal.aborted) return fail('AI_UNAVAILABLE', 'AI');
      const allowedReasons = ['RATE_LIMIT', 'TIMEOUT', 'OUTAGE', 'AUTH', 'MODEL_UNAVAILABLE', 'UNSUPPORTED_REQUEST', 'BILLING_REQUIRED', 'UPSTREAM', 'NETWORK', 'MALFORMED_RESPONSE'];
      try {
        this.observe?.({ provider: provider.id, code: last.ok ? 'OK' : last.error.code,
          reason: !last.ok && allowedReasons.includes(last.error.detail ?? '') ? last.error.detail : null,
          latencyMs: Date.now() - started });
      } catch { /* Diagnostics must not prevent a valid result or failover. */ }
      if (
        last.ok ||
        !availability.has(last.error.code)
      )
        return last;
    }
    return last;
  }
}
