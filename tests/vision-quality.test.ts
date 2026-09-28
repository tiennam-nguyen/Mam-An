import { afterEach, expect, it, vi } from 'vitest';
import { readServerConfig } from '../server/config/serverConfig';
import { createCapabilityRouter } from '../server/compositionRoot';
import { visionRequestOptions } from '../server/ai/visionRequestOptions';

it('bounds Command A+ reasoning without sending unsupported options to other models', () => {
  expect(visionRequestOptions('cohere', 'command-a-plus-05-2026')).toEqual({
    reasoning_effort: 'none',
  });
  expect(visionRequestOptions('cohere', 'command-a-vision-07-2025')).toEqual(
    {},
  );
  expect(
    visionRequestOptions('huggingface', 'Qwen/Qwen3-VL-235B-A22B-Instruct'),
  ).toEqual({});
});

afterEach(() => vi.unstubAllGlobals());

it('tries Command A+ before Qwen 235B and falls back on quota exhaustion', async () => {
  const calls: { url: string; model: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      calls.push({ url: String(url), model: JSON.parse(init.body).model });
      if (calls.length === 1) return new Response('', { status: 429 });
      return Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({
                candidates: [
                  {
                    raw_name: 'Canh rau',
                    suggested_portion_multiplier: null,
                    suggested_portion_label: null,
                    provider_confidence: null,
                  },
                ],
              }),
            },
          },
        ],
      });
    }),
  );
  const config = readServerConfig({
    COHERE_API_KEY: 'test-only',
    HUGGINGFACEHUB_API_KEY: 'test-only',
    GROQ_API_KEY: 'test-only',
  });
  if (!config.success) throw new Error('Invalid fixture');
  const result = await createCapabilityRouter(config.data).route(
    'VISION_MEAL_UNDERSTANDING',
    {
      image: { bytes: new Uint8Array([1]), mimeType: 'image/jpeg' },
      locale: 'vi-VN',
      requestId: 'test',
    },
    new AbortController().signal,
  );
  expect(result.ok && result.value.candidates[0]?.rawName).toBe('Canh rau');
  expect(calls).toEqual([
    {
      url: 'https://api.cohere.ai/compatibility/v1/chat/completions',
      model: 'command-a-plus-05-2026',
    },
    {
      url: 'https://router.huggingface.co/v1/chat/completions',
      model: 'Qwen/Qwen3-VL-235B-A22B-Instruct',
    },
  ]);
});

it('preserves explicit deployment model/order overrides and privacy controls', () => {
  const config = readServerConfig({
    AI_PROVIDER_ORDER: 'groq,cohere',
    COHERE_VISION_MODEL: 'command-a-vision-07-2025',
  });
  expect(config.success && config.data).toMatchObject({
    AI_PROVIDER_ORDER: ['groq', 'cohere'],
    COHERE_VISION_MODEL: 'command-a-vision-07-2025',
    OPENROUTER_REQUIRE_ZDR: true,
    OPENROUTER_DENY_DATA_COLLECTION: true,
  });
});
