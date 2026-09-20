import type { AiGateway } from '../../application/ports/aiGateway';
import { ok } from '../../domain/common/result';
import { fail } from '../../shared/errors/appError';
import { AnalysisApiSchema, ApiErrorSchema } from './analysisApiSchemas';

function combineSignals(
  parent: AbortSignal | undefined,
  deadline: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  if (!parent) return { signal: deadline, cleanup: () => undefined };

  const controller = new AbortController();
  const abort = () => controller.abort();
  const signals = [parent, deadline];

  if (signals.some((signal) => signal.aborted)) controller.abort();
  else
    signals.forEach((signal) =>
      signal.addEventListener('abort', abort, { once: true }),
    );

  return {
    signal: controller.signal,
    cleanup: () =>
      signals.forEach((signal) => signal.removeEventListener('abort', abort)),
  };
}

export class HttpAiGateway implements AiGateway {
  private readonly send: typeof fetch;

  constructor(send?: typeof fetch, private timeoutMs = 30000) {
    // Keep the native fetch call attached to the browser global. Some embedded
    // Android WebViews reject detached/native-function receiver tricks even
    // when desktop Chromium accepts them.
    this.send =
      send ??
      ((input, init) => {
        return globalThis.fetch(input, init);
      });
  }

  async analyzeMealImage(
    input: { image: Blob; locale: 'vi-VN' },
    signal?: AbortSignal,
  ) {
    const form = new FormData();
    form.set('image', input.image, 'meal.jpg');
    form.set('locale', input.locale);
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
    const combined = combineSignals(signal, deadline.signal);
    try {
      const response = await this.send('/api/v1/analyze-meal', {
        method: 'POST',
        body: form,
        signal: combined.signal,
        cache: 'no-store',
      });
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        return deadline.signal.aborted
          ? fail('AI_TIMEOUT', 'AI', true)
          : fail('AI_INVALID_RESPONSE', 'AI');
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
      return deadline.signal.aborted
        ? fail('AI_TIMEOUT', 'AI', true)
        : fail('NETWORK_UNAVAILABLE', 'AI', true);
    } finally {
      combined.cleanup();
      clearTimeout(timer);
    }
  }
}
