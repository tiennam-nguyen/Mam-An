import sharp from 'sharp';
import type {
  ProviderAnalyzeInput,
  ProviderAnalysisResult,
} from '../ai/visionAnalysisProvider.js';
import type { Result } from '../../src/domain/common/result.js';
import type { AppError } from '../../src/shared/errors/appError.js';
import type { ErrorCode } from '../../src/shared/errors/appError.js';
import { NormalizedSchema } from '../ai/providerResponseSchema.js';
const statuses: Partial<Record<ErrorCode, number>> = {
  INVALID_INPUT: 400,
  INVALID_IMAGE: 400,
  IMAGE_TOO_LARGE: 413,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_UNAVAILABLE: 503,
  AI_INVALID_RESPONSE: 502,
  AI_UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};
export function createAnalyzeMealHandler(
  service: {
    analyze(
      input: ProviderAnalyzeInput,
      signal: AbortSignal,
    ): Promise<Result<ProviderAnalysisResult, AppError>>;
  },
  maxBytes = 3000000,
  version: 1 | 2 = 1,
) {
  return async (request: Request): Promise<Response> => {
    let requestId = crypto.randomUUID() as string;
    const error = (
      code: ErrorCode,
      retryable = false,
      status = statuses[code] ?? 500,
    ) =>
      Response.json(
        { request_id: requestId, error: { code, retryable } },
        {
          status,
          headers: {
            'Cache-Control': 'no-store',
            ...(status === 405 ? { Allow: 'POST' } : {}),
          },
        },
      );
    if (request.method !== 'POST') return error('INVALID_INPUT', false, 405);
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin)
      return error('INVALID_INPUT', false, 403);
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data'))
      return error('INVALID_IMAGE');
    try {
      const budget = maxBytes + 65536,
        length = Number(request.headers.get('content-length') ?? 0);
      if (length > budget) return error('IMAGE_TOO_LARGE');
      const reader = request.body?.getReader();
      if (!reader) return error('INVALID_IMAGE');
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > budget) {
            await reader.cancel();
            return error('IMAGE_TOO_LARGE');
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      let form: FormData;
      try {
        form = await new Response(Buffer.concat(chunks), {
          headers: { 'Content-Type': request.headers.get('content-type')! },
        }).formData();
      } catch {
        return error('INVALID_IMAGE');
      }
      if (
        [...form.keys()].some(
          (k) =>
            k !== 'image' && k !== (version === 1 ? 'locale' : 'request_id'),
        ) ||
        form.getAll('image').length !== 1 ||
        (version === 1
          ? form.getAll('locale').length !== 1 || form.get('locale') !== 'vi-VN'
          : form.getAll('request_id').length !== 1 ||
            typeof form.get('request_id') !== 'string' ||
            !/^[a-zA-Z0-9:_-]{1,100}$/.test(String(form.get('request_id'))))
      )
        return error('INVALID_INPUT');
      if (version === 2) requestId = String(form.get('request_id'));
      const image = form.get('image');
      if (
        !(image instanceof Blob) ||
        image.size === 0 ||
        !['image/jpeg', 'image/png', 'image/webp'].includes(image.type)
      )
        return error('INVALID_IMAGE');
      if (image.size > maxBytes) return error('IMAGE_TOO_LARGE');
      const bytes = Buffer.from(await image.arrayBuffer());
      try {
        const decoder = sharp(bytes, {
            limitInputPixels: 40000000,
            failOn: 'warning',
          }),
          meta = await decoder.metadata();
        const format =
          image.type === 'image/jpeg'
            ? 'jpeg'
            : image.type === 'image/png'
              ? 'png'
              : 'webp';
        if (meta.format !== format || (meta.pages ?? 1) > 1)
          return error('INVALID_IMAGE');
        await decoder.raw().toBuffer();
      } catch {
        return error('INVALID_IMAGE');
      }
      const result = await service.analyze(
        { image: { bytes, mimeType: image.type }, locale: 'vi-VN', requestId },
        request.signal,
      );
      if (!result.ok) return error(result.error.code, result.error.retryable);
      const parsed = NormalizedSchema.safeParse(result.value);
      if (!parsed.success) return error('AI_INVALID_RESPONSE');
      return Response.json(
        {
          request_id: requestId,
          schema_version: String(version),
          candidates: parsed.data.candidates.map((c) => ({
            ...(version === 2
              ? {
                  candidate_dish_template_id: c.candidateDishTemplateId ?? null,
                  suggested_components:
                    c.suggestedComponents?.map((s) => ({
                      raw_name: s.rawName,
                      role: s.role,
                      suggested_portion_multiplier:
                        s.suggestedPortionMultiplier,
                      suggested_portion_label: s.suggestedPortionLabel,
                    })) ?? [],
                }
              : {}),
            raw_name: c.rawName,
            suggested_portion_multiplier: c.suggestedPortionMultiplier,
            suggested_portion_label: c.suggestedPortionLabel,
            provider_confidence: c.providerConfidence,
          })),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    } catch {
      return error('INTERNAL_ERROR');
    }
  };
}
