import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from './visionAnalysisProvider';
import type { Result } from '../../src/domain/common/result';
import type { AppError } from '../../src/shared/errors/appError';
import { fail } from '../../src/shared/errors/appError';
const availability = new Set([
  'AI_RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_UNAVAILABLE',
  'NETWORK_UNAVAILABLE',
]);
export class FailoverVisionService {
  constructor(
    private providers: readonly VisionAnalysisProvider[],
    private timeoutMs: number,
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
    for (const provider of this.providers) {
      if (parentSignal.aborted) return fail('AI_UNAVAILABLE', 'AI');
      if (!provider.isConfigured()) continue;
      const controller = new AbortController();
      const abort = () => controller.abort();
      parentSignal.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<Result<ProviderAnalysisResult, AppError>>(
        (resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve(fail('AI_TIMEOUT', 'AI', true));
          }, this.timeoutMs);
        },
      );
      try {
        last = await Promise.race([
          provider.analyze(input, controller.signal),
          timeout,
        ]);
      } catch {
        last = fail('AI_UNAVAILABLE', 'AI', true);
      } finally {
        clearTimeout(timer);
        parentSignal.removeEventListener('abort', abort);
      }
      if (parentSignal.aborted) return fail('AI_UNAVAILABLE', 'AI');
      if (
        last.ok ||
        !last.error.retryable ||
        !availability.has(last.error.code)
      )
        return last;
    }
    return last;
  }
}
