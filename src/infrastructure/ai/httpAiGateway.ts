import type { ExplanationTransportPayload, ExplanationResult } from '../../domain/explanation/explanation';
import { templateExplanation, validateGeneratedExplanation } from '../../domain/explanation/explanation';
import { ExplanationOutputSchema } from './explanationSchemas';
import { newId } from '../../shared/ids/newId';
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

  async generateExplanation(payload:ExplanationTransportPayload,signal?:AbortSignal):Promise<ExplanationResult> {
    const fallback=templateExplanation(payload), deadline=new AbortController(), timer=setTimeout(()=>deadline.abort(),this.timeoutMs), combined=combineSignals(signal,deadline.signal);
    try {
      const response=await this.send.call(globalThis,'/api/v2/explanations/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({request_id:newId(),evidence:payload}),signal:combined.signal,cache:'no-store'});
      if(!response.ok)return fallback;
      const raw=await response.json(), parsed=ExplanationOutputSchema.safeParse(raw.explanation);
      return parsed.success&&validateGeneratedExplanation(parsed.data,payload)?{...parsed.data,generationMode:'LLM'}:fallback;
    } catch { return fallback; } finally {clearTimeout(timer);combined.cleanup();}
  }
  understandMealImage(input: {image:Blob;locale:'vi-VN'}, signal?:AbortSignal) { return this.analyzeMealImage(input,signal,2); }
  async analyzeMealImage(
    input: { image: Blob; locale: 'vi-VN' },
    signal?: AbortSignal,
    version: 1 | 2 = 1,
  ) {
    const form = new FormData();
    form.set('image', input.image, 'meal.jpg');
    if (version === 1) form.set('locale', input.locale); else form.set('request_id', newId());
    const deadline = new AbortController();
    const timer = setTimeout(() => deadline.abort(), this.timeoutMs);
    const combined = combineSignals(signal, deadline.signal);
    try {
      const response = await this.send.call(globalThis, version === 1 ? '/api/v1/analyze-meal' : '/api/v2/vision/analyze-meal', {
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
          candidateDishTemplateId:c.candidate_dish_template_id,
          suggestedComponents:c.suggested_components?.map(s=>({rawName:s.raw_name,role:s.role,suggestedPortionMultiplier:s.suggested_portion_multiplier,suggestedPortionLabel:s.suggested_portion_label})),
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
