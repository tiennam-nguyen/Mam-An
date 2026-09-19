import { readServerConfig } from '../../server/config/serverConfig';
import { GroqVisionProvider } from '../../server/ai/groqVisionProvider';
import { OpenRouterVisionProvider } from '../../server/ai/openRouterVisionProvider';
import { FailoverVisionService } from '../../server/ai/failoverVisionService';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
export default {
  async fetch(request: Request): Promise<Response> {
    const parsed = readServerConfig(process.env);
    if (!parsed.success)
      return Response.json(
        {
          request_id: crypto.randomUUID(),
          error: { code: 'AI_UNAVAILABLE', retryable: false },
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    const c = parsed.data,
      providers = {
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
      ),
      c.AI_REQUEST_MAX_BYTES,
    )(request);
  },
};
