import type { AiGateway } from '../../application/ports/aiGateway';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
import { AnalysisApiSchema, ApiErrorSchema } from './analysisApiSchemas';
export class HttpAiGateway implements AiGateway {
  constructor(private send: typeof fetch = fetch, private timeoutMs = 30000) {}
  async analyzeMealImage(
    input: { image: Blob; locale: 'vi-VN' },
    signal?: AbortSignal,
  ) {
    const form = new FormData();
    form.set('image', input.image, 'meal.jpg');
    form.set('locale', input.locale);
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, deadline.signal]) : deadline.signal;
    try {
      // Native browser fetch requires its Window receiver, unlike mocked/Node fetch.
      const response = await this.send.call(globalThis, '/api/v1/analyze-meal', {
        method: 'POST',
        body: form,
        signal: requestSignal,
        cache: 'no-store',
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return deadline.signal.aborted ? fail('AI_TIMEOUT', 'AI', true) : fail('AI_INVALID_RESPONSE', 'AI');
      }
      if (!response.ok) {
        const parsed = ApiErrorSchema.safeParse(data);
        if (!parsed.success) return fail('AI_INVALID_RESPONSE', 'AI');
        return {
          ok: false as const,
          error: {
            code: parsed.data.error.code,
            retryable: parsed.data.error.retryable,
            source: 'AI' as const,
            requestId: parsed.data.request_id,
            detail: null,
          },
        };
      }
      const parsed = AnalysisApiSchema.safeParse(data);
      if (!parsed.success) return fail('AI_INVALID_RESPONSE', 'AI');
      return ok({
        requestId: parsed.data.request_id,
        candidates: parsed.data.candidates.map((c) => ({
          rawName: c.raw_name,
          suggestedPortionMultiplier: c.suggested_portion_multiplier,
          suggestedPortionLabel: c.suggested_portion_label,
          providerConfidence: c.provider_confidence,
        })),
      });
    } catch {
      return deadline.signal.aborted ? fail('AI_TIMEOUT', 'AI', true) : fail('NETWORK_UNAVAILABLE', 'AI', true);
    } finally {
      clearTimeout(timer);
    }
  }
}
