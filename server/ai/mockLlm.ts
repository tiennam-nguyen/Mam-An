import type {
  VisionAnalysisProvider,
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from './visionAnalysisProvider.js';
import type { Result } from '../../src/domain/common/result.js';
import type { AppError } from '../../src/shared/errors/appError.js';
import { ok } from '../../src/domain/common/result.js';
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
