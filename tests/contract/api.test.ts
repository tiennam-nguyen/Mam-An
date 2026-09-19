import { it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { MockLLM } from '../../server/ai/mockLlm';
import { FailoverVisionService } from '../../server/ai/failoverVisionService';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
import { GroqVisionProvider } from '../../server/ai/groqVisionProvider';
import { OpenRouterVisionProvider } from '../../server/ai/openRouterVisionProvider';
import { HttpAiGateway } from '../../src/infrastructure/ai/httpAiGateway';
import { fail } from '../../src/shared/errors/appError';
import { AnalysisApiSchema } from '../../src/infrastructure/ai/analysisApiSchemas';
import { readServerConfig } from '../../server/config/serverConfig';
const input = {
  image: { bytes: new Uint8Array([1]), mimeType: 'image/jpeg' },
  locale: 'vi-VN' as const,
  requestId: 'test',
};
const payload = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          candidates: [
            {
              raw_name: 'cơm trắng',
              suggested_portion_multiplier: 1,
              suggested_portion_label: null,
              provider_confidence: 5,
              carb_total: 999,
            },
          ],
        }),
      },
    },
  ],
};
async function imageRequest(
  options: {
    origin?: string;
    extra?: boolean;
    corrupt?: boolean;
    large?: boolean;
  } = {},
) {
  const buffer = options.corrupt
    ? Buffer.from('not an image')
    : await sharp({
        create: { width: 10, height: 10, channels: 3, background: '#fff' },
      })
        .png()
        .toBuffer();
  const form = new FormData();
  form.set('image', new Blob([buffer], { type: 'image/png' }), 'meal.png');
  form.set('locale', 'vi-VN');
  if (options.extra) form.set('prompt', 'untrusted');
  return new Request('https://mam.test/api/v1/analyze-meal', {
    method: 'POST',
    headers: {
      ...(options.origin ? { origin: options.origin } : {}),
      ...(options.large ? { 'content-length': '9999999' } : {}),
    },
    body: form,
  });
}
it('MockLLM exercises multipart decode and owned API schema end-to-end', async () => {
  const mock = new MockLLM(),
    handler = createAnalyzeMealHandler(new FailoverVisionService([mock], 100));
  const request = await imageRequest(),
    response = await handler(request);
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(
    AnalysisApiSchema.parse(await response.json()).candidates[0]!.raw_name,
  ).toBe('Cơm trắng');
  expect(mock.calls).toBe(1);
});
it('rejects method, foreign origin, prompt, corrupt pixels and oversized body without calling model', async () => {
  const mock = new MockLLM(),
    handler = createAnalyzeMealHandler(new FailoverVisionService([mock], 100));
  expect(
    (await handler(new Request('https://mam.test/api/v1/analyze-meal'))).status,
  ).toBe(405);
  for (const [options, status] of [
    [{ origin: 'https://else.test' }, 403],
    [{ extra: true }, 400],
    [{ corrupt: true }, 400],
    [{ large: true }, 413],
  ] as const)
    expect((await handler(await imageRequest(options))).status).toBe(status);
  expect(mock.calls).toBe(0);
});
it('normalizes model output and ignores invented nutrition', async () => {
  const send = vi.fn<typeof fetch>(async () => Response.json(payload)),
    provider = new GroqVisionProvider(
      'test-only-placeholder',
      'configured-model',
      send,
    ),
    result = await provider.analyze(input, new AbortController().signal);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.candidates[0]!.providerConfidence).toBeNull();
    expect(result.value.candidates[0]).not.toHaveProperty('carb_total');
  }
  const body = JSON.parse(String(send.mock.calls[0]?.[1]?.body));
  expect(body.model).toBe('configured-model');
  expect(body.response_format.type).toBe('json_object');
});
it('OpenRouter privacy remains strict on endpoint failure', async () => {
  const send = vi.fn<typeof fetch>(
      async () => new Response('', { status: 404 }),
    ),
    provider = new OpenRouterVisionProvider(
      'test-only-placeholder',
      'configured-model',
      { denyDataCollection: true, requireZdr: true },
      send,
    );
  const result = await provider.analyze(input, new AbortController().signal);
  expect(result.ok).toBe(false);
  expect(send).toHaveBeenCalledTimes(1);
  expect(JSON.parse(String(send.mock.calls[0]?.[1]?.body)).provider).toEqual({
    data_collection: 'deny',
    zdr: true,
  });
});
it('availability failover happens once, invalid response does not fail over', async () => {
  const primary = new MockLLM(fail('AI_RATE_LIMITED', 'AI', true)),
    secondary = new MockLLM();
  expect(
    (
      await new FailoverVisionService([primary, secondary], 100).analyze(
        input,
        new AbortController().signal,
      )
    ).ok,
  ).toBe(true);
  expect(primary.calls).toBe(1);
  expect(secondary.calls).toBe(1);
  const invalid = new MockLLM(fail('AI_INVALID_RESPONSE', 'AI')),
    unused = new MockLLM();
  expect(
    (
      await new FailoverVisionService([invalid, unused], 100).analyze(
        input,
        new AbortController().signal,
      )
    ).ok,
  ).toBe(false);
  expect(unused.calls).toBe(0);
});
it('bounded timeout and cancellation never call another provider after abort', async () => {
  const stalled = {
      id: 'mock' as const,
      isConfigured: () => true,
      analyze: () => new Promise<never>(() => {}),
    },
    secondary = new MockLLM();
  const timed = await new FailoverVisionService([stalled], 10).analyze(
    input,
    new AbortController().signal,
  );
  expect(timed.ok).toBe(false);
  if (!timed.ok) expect(timed.error.code).toBe('AI_TIMEOUT');
  const abort = new AbortController();
  abort.abort();
  await new FailoverVisionService([stalled, secondary], 10).analyze(
    input,
    abort.signal,
  );
  expect(secondary.calls).toBe(0);
});
it('API maps unavailable providers and malformed normalized output', async () => {
  const unavailable = createAnalyzeMealHandler(
    new FailoverVisionService([], 100),
  );
  expect((await unavailable(await imageRequest())).status).toBe(503);
  const invalid = new MockLLM({ ok: true, value: { candidates: [] } }),
    handler = createAnalyzeMealHandler(
      new FailoverVisionService([invalid], 100),
    );
  expect((await handler(await imageRequest())).status).toBe(502);
});
it('browser parses stable errors, malformed success, and passes abort signal', async () => {
  const signal = new AbortController().signal,
    send = vi.fn<typeof fetch>(async () =>
      Response.json(
        { request_id: 'id', error: { code: 'AI_TIMEOUT', retryable: true } },
        { status: 504 },
      ),
    );
  const gateway = new HttpAiGateway(send),
    result = await gateway.analyzeMealImage(
      { image: new Blob(['x']), locale: 'vi-VN' },
      signal,
    );
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe('AI_TIMEOUT');
  expect(send.mock.calls[0]?.[1]?.signal).toBe(signal);
  expect([...(send.mock.calls[0]?.[1]?.body as FormData).keys()]).toEqual([
    'image',
    'locale',
  ]);
  const malformed = await new HttpAiGateway(async () =>
    Response.json({ candidates: 'bad' }),
  ).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' });
  expect(malformed.ok).toBe(false);
});
it('config has no keys by default and rejects privacy typo', () => {
  const config = readServerConfig({});
  expect(config.success).toBe(true);
  if (config.success) {
    expect(config.data.GROQ_API_KEY).toBe('');
    expect(config.data.OPENROUTER_REQUIRE_ZDR).toBe(true);
  }
  expect(readServerConfig({ OPENROUTER_REQUIRE_ZDR: 'treu' }).success).toBe(
    false,
  );
});
