import type { Result } from '../../domain/common/result';
import type { AppError } from '../../shared/errors/appError';
export interface PreparedImage { analysisBlob: Blob; thumbnail: Blob | null }
export interface ImageProcessor { prepare(file: Blob): Promise<Result<PreparedImage, AppError>> }
