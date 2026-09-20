import type { RawAnalysisCandidate } from '../../src/domain/meal/analysisCandidate.js';
import type { Result } from '../../src/domain/common/result.js';
import type { AppError } from '../../src/shared/errors/appError.js';
export interface ProviderAnalyzeInput {
  image: { bytes: Uint8Array; mimeType: string };
  locale: 'vi-VN';
  requestId: string;
}
export interface ProviderAnalysisResult {
  candidates: readonly RawAnalysisCandidate[];
}
export type ProviderId = 'groq' | 'openrouter' | 'mistral' | 'cohere' | 'gemini';
export interface VisionAnalysisProvider {
  readonly id: ProviderId | 'mock';
  isConfigured(): boolean;
  analyze(
    input: ProviderAnalyzeInput,
    signal: AbortSignal,
  ): Promise<Result<ProviderAnalysisResult, AppError>>;
}
