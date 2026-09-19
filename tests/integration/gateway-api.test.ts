import { expect, it } from 'vitest';
import sharp from 'sharp';
import { HttpAiGateway } from '../../src/infrastructure/ai/httpAiGateway';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
import { FailoverVisionService } from '../../server/ai/failoverVisionService';
import { GroqVisionProvider } from '../../server/ai/groqVisionProvider';
import { MockLLM } from '../../server/ai/mockLlm';
import { ApiErrorSchema } from '../../src/infrastructure/ai/analysisApiSchemas';
const origin = 'https://mam.test';
const png = () => sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
it('real gateway multipart crosses handler, decoder, adapter and parser', async () => {
  const provider = new GroqVisionProvider('test-only', 'test-model', async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    expect(request.messages[0].content[1].image_url.url).toMatch(/^data:image\/png;base64,/);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ candidates: [{ raw_name: 'Cơm trắng', suggested_portion_multiplier: 0.5, suggested_portion_label: null, provider_confidence: null, carb_total: 9999 }] }) } }] });
  });
  const handler = createAnalyzeMealHandler(new FailoverVisionService([provider], 100));
  const gateway = new HttpAiGateway(async (url, init) => handler(new Request(new URL(String(url), origin), { ...init, headers: { origin } })));
  const result = await gateway.analyzeMealImage({ image: new Blob([await png()], { type: 'image/png' }), locale: 'vi-VN' });
  expect(result).toMatchObject({ ok: true, value: { candidates: [{ rawName: 'Cơm trắng', suggestedPortionMultiplier: 0.5 }] } });
  expect(JSON.stringify(result)).not.toContain('9999');
});
it.each(['missing multipart', 'unsupported type', 'empty', 'mismatch', 'missing locale', 'wrong locale', 'duplicate', 'oversized'])('rejects %s before provider', async kind => {
  const provider = new MockLLM();
  const handler = createAnalyzeMealHandler(new FailoverVisionService([provider], 100), 1000);
  const form = new FormData();
  const bytes = kind === 'empty' ? Buffer.alloc(0) : kind === 'oversized' ? Buffer.alloc(1001) : await png();
  form.set('image', new Blob([bytes], { type: kind === 'unsupported type' ? 'image/svg+xml' : kind === 'mismatch' ? 'image/jpeg' : 'image/png' }), 'meal');
  if (kind !== 'missing locale') form.set('locale', kind === 'wrong locale' ? 'en-US' : 'vi-VN');
  if (kind === 'duplicate') form.append('locale', 'vi-VN');
  const response = await handler(new Request(origin + '/api/v1/analyze-meal', { method: 'POST', body: kind === 'missing multipart' ? '{}' : form }));
  expect(response.status).toBe(kind === 'oversized' ? 413 : 400);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(ApiErrorSchema.safeParse(await response.json()).success).toBe(true);
  expect(provider.calls).toBe(0);
});
it.each(ApiErrorSchema.shape.error.shape.code.options)('gateway preserves stable code %s', async code => {
  const gateway = new HttpAiGateway(async () => Response.json({ request_id: 'request', error: { code, retryable: false } }, { status: 500 }));
  expect(await gateway.analyzeMealImage({ image: new Blob(['x']), locale: 'vi-VN' })).toMatchObject({ ok: false, error: { code, requestId: 'request' } });
});
it('gateway safely handles non-JSON, invalid envelope and network failure', async () => {
  for (const body of ['FUNCTION_INVOCATION_FAILED', '{}']) {
    expect(await new HttpAiGateway(async () => new Response(body, { status: 500 })).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' })).toMatchObject({ ok: false, error: { code: 'AI_INVALID_RESPONSE' } });
  }
  expect(await new HttpAiGateway(async () => { throw new Error('offline'); }).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' })).toMatchObject({ ok: false, error: { code: 'NETWORK_UNAVAILABLE' } });
});
it('gateway invokes native fetch with global receiver and bounds stalled requests', async () => {
  const receiverFetch: typeof fetch = async function (this: unknown) {
    expect(this).toBe(globalThis);
    return new Response('{}');
  };
  await new HttpAiGateway(receiverFetch).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' });
  const stalled: typeof fetch = (_url, init) => new Promise((_resolve, reject) => {
    init!.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
  });
  expect(await new HttpAiGateway(stalled, 10).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' })).toMatchObject({ ok: false, error: { code: 'AI_TIMEOUT', retryable: true } });
  const abort = new AbortController();
  const pending = new HttpAiGateway(stalled).analyzeMealImage({ image: new Blob(), locale: 'vi-VN' }, abort.signal);
  abort.abort();
  expect(await pending).toMatchObject({ ok: false, error: { code: 'NETWORK_UNAVAILABLE' } });
});
