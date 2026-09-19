import type { RawAnalysisCandidate } from '../../src/domain/meal/analysisCandidate';
import type { Result } from '../../src/domain/common/result';
import type { AppError } from '../../src/shared/errors/appError';
export interface ProviderAnalyzeInput {
  image: { bytes: Uint8Array; mimeType: string };
  locale: 'vi-VN';
  requestId: string;
}
export interface ProviderAnalysisResult {
  candidates: readonly RawAnalysisCandidate[];
}
export interface VisionAnalysisProvider {
  readonly id: 'groq' | 'openrouter' | 'mock';
  isConfigured(): boolean;
  analyze(
    input: ProviderAnalyzeInput,
    signal: AbortSignal,
  ): Promise<Result<ProviderAnalysisResult, AppError>>;
}
