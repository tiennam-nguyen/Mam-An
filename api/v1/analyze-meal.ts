import { readServerConfig } from '../../server/config/serverConfig.js';
import { GroqVisionProvider } from '../../server/ai/groqVisionProvider.js';
import { OpenRouterVisionProvider } from '../../server/ai/openRouterVisionProvider.js';
import { FailoverVisionService } from '../../server/ai/failoverVisionService.js';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler.js';
import { MistralVisionProvider } from '../../server/ai/mistralVisionProvider.js';
import { CohereVisionProvider } from '../../server/ai/cohereVisionProvider.js';
import { GeminiVisionProvider } from '../../server/ai/geminiVisionProvider.js';
export const maxDuration = 60;
export default {
  async fetch(request: Request): Promise<Response> {
    const parsed = readServerConfig(process.env);
    if (!parsed.success) {
      console.warn(JSON.stringify({ event: 'ai_config_invalid', fields: parsed.error.issues.map(issue => issue.path.join('.')) }));
      return Response.json(
        {
          request_id: crypto.randomUUID(),
          error: { code: 'AI_UNAVAILABLE', retryable: false },
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    const c = parsed.data,
      providers = {
        mistral: new MistralVisionProvider(c.MISTRAL_API_KEY, c.MISTRAL_VISION_MODEL),
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
    return createAnalyzeMealHandler(
      new FailoverVisionService(
        c.AI_PROVIDER_ORDER.map(
          (id) => providers[id as keyof typeof providers],
        ),
        c.AI_PROVIDER_TIMEOUT_MS,
        attempt => console.info(JSON.stringify({ event: 'ai_provider_attempt', ...attempt })),
      ),
      c.AI_REQUEST_MAX_BYTES,
    )(request);
  },
};
