import { readServerConfig } from './config/serverConfig.js';
import { GroqVisionProvider } from './ai/groqVisionProvider.js';
import { OpenRouterVisionProvider } from './ai/openRouterVisionProvider.js';
import { FailoverVisionService } from './ai/failoverVisionService.js';
import { createAnalyzeMealHandler } from './http/analyzeMealHandler.js';
import { MistralVisionProvider } from './ai/mistralVisionProvider.js';
import { CohereVisionProvider } from './ai/cohereVisionProvider.js';
import { GeminiVisionProvider } from './ai/geminiVisionProvider.js';
import {
  CapabilityRouter,
  type CapabilityPolicies,
} from './ai/capabilityRouter.js';
import { TextExplanationProvider } from './ai/textExplanationProvider.js';
import { createExplanationHandler } from './http/explanationHandler.js';
import type { ServerConfig } from './config/serverConfig.js';
export function createCapabilityRouter(config: ServerConfig) {
  const c = config,
    providers = {
      mistral: new MistralVisionProvider(
        c.MISTRAL_API_KEY,
        c.MISTRAL_VISION_MODEL,
      ),
      cohere: new CohereVisionProvider(c.COHERE_API_KEY, c.COHERE_VISION_MODEL),
      gemini: new GeminiVisionProvider(c.GEMINI_API_KEY, c.GEMINI_VISION_MODEL),
      groq: new GroqVisionProvider(c.GROQ_API_KEY, c.GROQ_VISION_MODEL),
      openrouter: new OpenRouterVisionProvider(
        c.OPENROUTER_API_KEY,
        c.OPENROUTER_VISION_MODEL,
        {
          denyDataCollection: c.OPENROUTER_DENY_DATA_COLLECTION,
          requireZdr: c.OPENROUTER_REQUIRE_ZDR,
        },
      ),
    };

  const policies: CapabilityPolicies = {
    VISION_MEAL_UNDERSTANDING: {
      maxProviderAttempts: Math.min(
        c.AI_VISION_MAX_ATTEMPTS,
        c.AI_PROVIDER_ORDER.length,
      ),
      candidates: c.AI_PROVIDER_ORDER.map((id) => {
        const provider = providers[id as keyof typeof providers];
        return {
          providerId: id,
          modelId: {
            groq: c.GROQ_VISION_MODEL,
            mistral: c.MISTRAL_VISION_MODEL,
            cohere: c.COHERE_VISION_MODEL,
            gemini: c.GEMINI_VISION_MODEL,
            openrouter: c.OPENROUTER_VISION_MODEL,
          }[id as keyof typeof providers],
          enabled: c.AI_VISION_ENABLED && provider.isConfigured(),
          timeoutMs: c.AI_PROVIDER_TIMEOUT_MS,
          run: (input, signal) =>
            new FailoverVisionService(
              [provider],
              c.AI_PROVIDER_TIMEOUT_MS,
              (attempt) =>
                console.info(
                  JSON.stringify({
                    event: 'ai_provider_attempt',
                    capability: 'VISION_MEAL_UNDERSTANDING',
                    ...attempt,
                  }),
                ),
            ).analyze(input, signal),
        };
      }),
    },
    TEXT_EXPLANATION_VI: {
      maxProviderAttempts: Math.min(
        c.AI_TEXT_MAX_ATTEMPTS,
        c.AI_TEXT_PROVIDER_ORDER.length,
      ),
      candidates: c.AI_TEXT_PROVIDER_ORDER.map((id) => {
        const key = id === 'groq' ? c.GROQ_API_KEY : c.MISTRAL_API_KEY;
        const model = id === 'groq' ? c.GROQ_TEXT_MODEL : c.MISTRAL_TEXT_MODEL;
        const adapter = new TextExplanationProvider(
          id === 'groq'
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : 'https://api.mistral.ai/v1/chat/completions',
          key,
          model,
        );
        return {
          providerId: id,
          modelId: model,
          enabled: c.AI_TEXT_ENABLED && !!key && !!model,
          timeoutMs: c.AI_TEXT_TIMEOUT_MS,
          run: (input, signal) => adapter.generate(input, signal),
        };
      }),
    },
    SPEECH_TO_TEXT_VI: { candidates: [], maxProviderAttempts: 0 },
    EMBEDDING_OR_RETRIEVAL: { candidates: [], maxProviderAttempts: 0 },
  };
  return new CapabilityRouter(policies);
}
export async function handleAiRequest(
  request: Request,
  kind: 'vision-v1' | 'vision-v2' | 'explanation',
): Promise<Response> {
  const parsed = readServerConfig(process.env);
  if (!parsed.success)
    return Response.json(
      {
        request_id: crypto.randomUUID(),
        error: { code: 'AI_UNAVAILABLE', retryable: false },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  const router = createCapabilityRouter(parsed.data);
  if (kind === 'explanation') return createExplanationHandler(router)(request);
  return createAnalyzeMealHandler(
    {
      analyze: (input, signal) =>
        router.route('VISION_MEAL_UNDERSTANDING', input, signal),
    },
    parsed.data.AI_REQUEST_MAX_BYTES,
    kind === 'vision-v1' ? 1 : 2,
  )(request);
}
