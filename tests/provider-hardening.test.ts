import { describe, expect, it, vi } from 'vitest';
import { GroqVisionProvider } from '../server/ai/groqVisionProvider';
import { OpenRouterVisionProvider } from '../server/ai/openRouterVisionProvider';
import { FailoverVisionService } from '../server/ai/failoverVisionService';
import { MockLLM } from '../server/ai/mockLlm';
import { readServerConfig } from '../server/config/serverConfig';
import { MistralVisionProvider } from '../server/ai/mistralVisionProvider';
import { CohereVisionProvider } from '../server/ai/cohereVisionProvider';
import { GeminiVisionProvider } from '../server/ai/geminiVisionProvider';
const input = { image: { bytes: new Uint8Array([1]), mimeType: 'image/jpeg' }, locale: 'vi-VN' as const, requestId: 'test' };
const payload = { choices: [{ message: { content: JSON.stringify({ candidates: [{ raw_name: 'Cơm trắng', suggested_portion_multiplier: 1, suggested_portion_label: null, provider_confidence: null }] }) } }] };
const factories = [
  (send: typeof fetch, key = 'test-only') => new GroqVisionProvider(key, 'test-model', send),
  (send: typeof fetch, key = 'test-only') => new OpenRouterVisionProvider(key, 'test-model', { denyDataCollection: true, requireZdr: true }, send),
  (send: typeof fetch, key = 'test-only') => new MistralVisionProvider(key, 'test-model', send),
  (send: typeof fetch, key = 'test-only') => new CohereVisionProvider(key, 'test-model', send),
  (send: typeof fetch, key = 'test-only') => new GeminiVisionProvider(key, 'test-model', async (url, init) => {
    const response = await send(url, init);
    const json = response.json.bind(response);
    response.json = async () => {
      const body = await json();
      return body.choices ? { candidates: [{ content: { parts: [{ text: body.choices[0].message.content }] } }] } : body;
    };
    return response;
  }),
];
describe.each(factories)('chat provider', factory => {
  it.each(['', '   '])('does not send an empty key %j', async key => {
    const send = vi.fn<typeof fetch>();
    expect((await factory(send, key).analyze(input, new AbortController().signal)).ok).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 408, 429, 500, 503, 504])('classifies HTTP %i without raw errors', async status => {
    const result = await factory(async () => new Response('secret-bearing upstream error', { status })).analyze(input, new AbortController().signal);
    const code = status === 429 ? 'AI_RATE_LIMITED' : [408, 504].includes(status) ? 'AI_TIMEOUT' : status >= 500 ? 'AI_UNAVAILABLE' : 'AI_UPSTREAM_ERROR';
    expect(result).toMatchObject({ ok: false, error: { code } });
    expect(JSON.stringify(result)).not.toContain('secret-bearing');
  });
  it.each(['not-json', '{}', JSON.stringify({ choices: [{ message: { content: '{"candidates":[]}' } }] })])('rejects malformed result', async body => {
    const result = await factory(async () => new Response(body)).analyze(input, new AbortController().signal);
    expect(result).toMatchObject({ ok: false, error: { code: 'AI_INVALID_RESPONSE' } });
  });
  it('accepts candidates and preserves request cancellation', async () => {
    const send = vi.fn<typeof fetch>(async () => Response.json(payload));
    const signal = new AbortController().signal;
    expect((await factory(send).analyze(input, signal)).ok).toBe(true);
    expect(send.mock.calls[0]![1]!.signal).toBe(signal);
  });
  it('distinguishes network throw and timeout while reading body', async () => {
    const result = await factory(async () => { throw new Error('private'); }).analyze(input, new AbortController().signal);
    expect(result).toMatchObject({ ok: false, error: { code: 'AI_UNAVAILABLE', retryable: true } });
    const abort = new AbortController();
    const timed = await factory(async () => {
      const response = new Response();
      response.json = async () => { abort.abort(); throw new DOMException('aborted', 'AbortError'); };
      return response;
    }).analyze(input, abort.signal);
    expect(timed).toMatchObject({ ok: false, error: { code: 'AI_TIMEOUT', retryable: true } });
  });
});
it.each([400, 401, 403, 404, 408, 429, 500])('provider HTTP %i must not hide a healthy secondary', async status => {
  const first = new GroqVisionProvider('test-only', 'stale', async () => new Response('', { status }));
  const second = new MockLLM();
  expect((await new FailoverVisionService([first, second], 100).analyze(input, new AbortController().signal)).ok).toBe(true);
  expect(second.calls).toBe(1);
});
it('malformed provider output can fail over without becoming sample success', async () => {
  const first = new GroqVisionProvider('test-only', 'test', async () => Response.json({}));
  const second = new GroqVisionProvider('test-only', 'test', async () => Response.json(payload));
  expect((await new FailoverVisionService([first, second], 100).analyze(input, new AbortController().signal)).ok).toBe(true);
});
it.each([
  { AI_PROVIDER_ORDER: 'groq,groq' }, { AI_PROVIDER_ORDER: '' }, { AI_PROVIDER_ORDER: 'unrecognized' },
  { AI_PROVIDER_TIMEOUT_MS: 'NaN' }, { AI_PROVIDER_TIMEOUT_MS: '-1' }, { AI_REQUEST_MAX_BYTES: '0' },
  { OPENROUTER_DENY_DATA_COLLECTION: 'yes' },
])('rejects malformed server config %j', env => expect(readServerConfig(env).success).toBe(false));
it('keeps explicit provider order', () => {
  const result = readServerConfig({ AI_PROVIDER_ORDER: 'openrouter, groq' });
  expect(result.success && result.data.AI_PROVIDER_ORDER).toEqual(['openrouter', 'groq']);
});
it('native Gemini uses inline image parts and header auth', async () => {
  const send = vi.fn<typeof fetch>(async () => Response.json({ candidates: [{ content: { parts: [{ thought: true, text: 'ignored' }, { text: payload.choices[0]!.message.content }] } }] }));
  expect((await new GeminiVisionProvider('test-only', 'test-model', send).analyze(input, new AbortController().signal)).ok).toBe(true);
  const [url, init] = send.mock.calls[0]!;
  expect(String(url)).not.toContain('test-only');
  expect(init!.headers).toMatchObject({ 'x-goog-api-key': 'test-only' });
  expect(JSON.parse(String(init!.body)).contents[0].parts[1].inline_data.mime_type).toBe('image/jpeg');
});
it('aborting an uncooperative provider resolves immediately and skips secondary', async () => {
  const abort = new AbortController();
  const secondary = new MockLLM();
  const pending = new FailoverVisionService([{ id: 'mock', isConfigured: () => true, analyze: () => new Promise(() => {}) }, secondary], 30000).analyze(input, abort.signal);
  abort.abort();
  await pending;
  expect(secondary.calls).toBe(0);
});
it('request deadline bounds an uncooperative provider', async () => {
  const secondary = new MockLLM();
  const result = await new FailoverVisionService([{ id: 'mock', isConfigured: () => true, analyze: () => new Promise(() => {}) }, secondary], 30000, undefined, 10).analyze(input, new AbortController().signal);
  expect(result).toMatchObject({ ok: false, error: { code: 'AI_TIMEOUT' } });
  expect(secondary.calls).toBe(0);
});
it('reports sanitized provider classification without propagating observer exceptions', async () => {
  const observed: unknown[] = [];
  const service = new FailoverVisionService([new GroqVisionProvider('test-only', 'bad', async () => new Response('', { status: 404 })), new MockLLM()], 100, value => { observed.push(value); throw new Error('observer'); });
  expect((await service.analyze(input, new AbortController().signal)).ok).toBe(true);
  expect(observed[0]).toMatchObject({ code: 'AI_UPSTREAM_ERROR', reason: 'MODEL_UNAVAILABLE' });
});
