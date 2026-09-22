import { GroqVisionProvider } from '../../server/ai/groqVisionProvider';
import { TextExplanationProvider } from '../../server/ai/textExplanationProvider';
import {
  CapabilityRouter,
  type CapabilityPolicies,
} from '../../server/ai/capabilityRouter';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
import { createExplanationHandler } from '../../server/http/explanationHandler';

export const emptyPolicies: CapabilityPolicies = {
  VISION_MEAL_UNDERSTANDING: { candidates: [], maxProviderAttempts: 0 },
  TEXT_EXPLANATION_VI: { candidates: [], maxProviderAttempts: 0 },
  SPEECH_TO_TEXT_VI: { candidates: [], maxProviderAttempts: 0 },
  EMBEDDING_OR_RETRIEVAL: { candidates: [], maxProviderAttempts: 0 },
};
export const safeExplanation = {
  summaryVi: 'Ước tính từ thành phần đã ghi.',
  personalObservationVi: null,
  optionExplanationsVi: [],
  uncertaintyNoteVi: 'Dữ liệu còn thiếu.',
  evidenceRefs: ['meal.current'],
};
/** Only the provider HTTP boundary is substituted. No real keys or network. */
export function realV2Api(upstream: typeof fetch) {
  const vision = new GroqVisionProvider(
    'synthetic-test-key',
    'synthetic-vision-model',
    upstream,
  );
  const text = new TextExplanationProvider(
    'https://upstream.invalid/text',
    'synthetic-test-key',
    'synthetic-text-model',
    upstream,
  );
  const router = new CapabilityRouter({
    ...emptyPolicies,
    VISION_MEAL_UNDERSTANDING: {
      maxProviderAttempts: 1,
      candidates: [
        {
          providerId: 'fixture',
          modelId: 'vision',
          enabled: true,
          timeoutMs: 1000,
          run: (input, signal) => vision.analyze(input, signal),
        },
      ],
    },
    TEXT_EXPLANATION_VI: {
      maxProviderAttempts: 1,
      candidates: [
        {
          providerId: 'fixture',
          modelId: 'text',
          enabled: true,
          timeoutMs: 1000,
          run: (input, signal) => text.generate(input, signal),
        },
      ],
    },
  });
  const service = {
    analyze: (
      input: Parameters<typeof vision.analyze>[0],
      signal: AbortSignal,
    ) => router.route('VISION_MEAL_UNDERSTANDING', input, signal),
  };
  const v1 = createAnalyzeMealHandler(service, 3000000, 1);
  const v2 = createAnalyzeMealHandler(service, 3000000, 2);
  const explanation = createExplanationHandler(router);
  return (request: Request) =>
    new URL(request.url).pathname === '/api/v1/analyze-meal'
      ? v1(request)
      : new URL(request.url).pathname === '/api/v2/vision/analyze-meal'
        ? v2(request)
        : explanation(request);
}
export const upstreamResponse: typeof fetch = async (url) =>
  Response.json({
    choices: [
      {
        message: {
          content: JSON.stringify(
            String(url).endsWith('/text')
              ? safeExplanation
              : {
                  candidates: [
                    {
                      raw_name: 'Cơm trắng',
                      suggested_portion_multiplier: 1,
                      suggested_portion_label: null,
                      provider_confidence: null,
                      candidate_dish_template_id: null,
                      suggested_components: [],
                      carb_estimate: 99999,
                    },
                  ],
                },
          ),
        },
      },
    ],
  });
