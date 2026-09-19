import type { Result } from '../../domain/common/result';
import type { RawAnalysisCandidate } from '../../domain/meal/analysisCandidate';
import type { AppError } from '../../shared/errors/appError';
export interface AnalysisResult {
  requestId: string;
  candidates: readonly RawAnalysisCandidate[];
}
export interface AiGateway {
  analyzeMealImage(
    input: { image: Blob; locale: 'vi-VN' },
    signal?: AbortSignal,
  ): Promise<Result<AnalysisResult, AppError>>;
}
