import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from './visionAnalysisProvider';
import type { Result } from '../../src/domain/common/result';
import type { AppError } from '../../src/shared/errors/appError';
import { ok } from '../../src/domain/common/result';
export class MockLLM implements VisionAnalysisProvider {
  readonly id = 'mock' as const;
  calls = 0;
  constructor(
    private response: Result<ProviderAnalysisResult, AppError> = ok({
      candidates: [
        {
          rawName: 'Cơm trắng',
          suggestedPortionMultiplier: 1,
          suggestedPortionLabel: null,
          providerConfidence: null,
        },
      ],
    }),
  ) {}
  isConfigured() {
    return true;
  }
  async analyze(_input: ProviderAnalyzeInput, _signal: AbortSignal) {
    this.calls++;
    return this.response;
  }
}
