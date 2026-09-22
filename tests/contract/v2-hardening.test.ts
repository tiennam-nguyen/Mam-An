import { expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { createAnalyzeMealHandler } from '../../server/http/analyzeMealHandler';
import { createExplanationHandler } from '../../server/http/explanationHandler';
import { CapabilityRouter } from '../../server/ai/capabilityRouter';
import { emptyPolicies, safeExplanation } from '../fixtures/realV2Api';
import { ok } from '../../src/domain/common/result';
import { fail, type ErrorCode } from '../../src/shared/errors/appError';
import {
  buildEvidenceBundle,
  minimizeEvidence,
} from '../../src/domain/explanation/explanation';
import { draft } from '../fixtures/helpers';
const origin = 'https://mam.test';
const payload = minimizeEvidence(buildEvidenceBundle(draft(), null, []));
it.each([
  'method',
  'origin',
  'missing-image',
  'duplicate-image',
  'empty',
  'mime',
  'mismatch',
  'corrupt',
  'large',
  'missing-id',
  'duplicate-id',
  'long-id',
  'invalid-id',
  'extra-field',
  'not-multipart',
])(
  'v2 vision rejects %s before service and keeps no-store private errors',
  async (kind) => {
    const analyze = vi.fn(async () => fail('AI_UNAVAILABLE', 'AI'));
    const handler = createAnalyzeMealHandler({ analyze }, 1000, 2);
    const form = new FormData();
    const bytes =
      kind === 'empty'
        ? new Uint8Array()
        : kind === 'large'
          ? new Uint8Array(1001)
          : kind === 'corrupt'
            ? new TextEncoder().encode('private broken image')
            : new Uint8Array(
                await sharp({
                  create: {
                    width: 2,
                    height: 2,
                    channels: 3,
                    background: 'white',
                  },
                })
                  .png()
                  .toBuffer(),
              );
    const image = new Blob([bytes], {
      type:
        kind === 'mime'
          ? 'image/svg+xml'
          : kind === 'mismatch'
            ? 'image/jpeg'
            : 'image/png',
    });
    if (kind !== 'missing-image') form.set('image', image);
    if (kind === 'duplicate-image') form.append('image', image);
    if (kind !== 'missing-id')
      form.set(
        'request_id',
        kind === 'long-id'
          ? 'x'.repeat(101)
          : kind === 'invalid-id'
            ? 'private id\n'
            : 'valid:test-1',
      );
    if (kind === 'duplicate-id') form.append('request_id', 'duplicate');
    if (kind === 'extra-field') form.set('notes', 'PRIVATE');
    const response = await handler(
      new Request(origin + '/api/v2/vision/analyze-meal', {
        method: kind === 'method' ? 'GET' : 'POST',
        headers: { origin: kind === 'origin' ? 'https://evil.test' : origin },
        ...(kind === 'method'
          ? {}
          : { body: kind === 'not-multipart' ? '{}' : form }),
      }),
    );
    expect(response.status).toBe(
      kind === 'method'
        ? 405
        : kind === 'origin'
          ? 403
          : kind === 'large'
            ? 413
            : 400,
    );
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).not.toMatch(
      /PRIVATE|private broken image|Bearer|stack/,
    );
    expect(analyze).not.toHaveBeenCalled();
  },
);
it.each([
  'method',
  'origin',
  'content-type',
  'size',
  'malformed',
  'unknown-field',
  'bad-id',
  'missing',
  'invalid-number',
])('text handler rejects %s before router', async (kind) => {
  const router = new CapabilityRouter(emptyPolicies),
    route = vi.spyOn(router, 'route');
  const body = {
    request_id: kind === 'bad-id' ? 'bad id' : 'valid',
    evidence: structuredClone(payload),
    ...(kind === 'unknown-field' ? { private: 'PRIVATE' } : {}),
  };
  if (kind === 'invalid-number') body.evidence.meal.totalCarbEstimate = -1;
  const response = await createExplanationHandler(router)(
    new Request(origin + '/api/v2/explanations/generate', {
      method: kind === 'method' ? 'GET' : 'POST',
      headers: {
        origin: kind === 'origin' ? 'https://evil.test' : origin,
        'content-type':
          kind === 'content-type' ? 'text/plain' : 'application/json',
      },
      ...(kind === 'method'
        ? {}
        : {
            body:
              kind === 'size'
                ? 'x'.repeat(32769)
                : kind === 'malformed'
                  ? '{'
                  : kind === 'missing'
                    ? '{}'
                    : JSON.stringify(body),
          }),
    }),
  );
  expect(response.status).toBe(
    kind === 'method'
      ? 405
      : kind === 'origin'
        ? 403
        : kind === 'size'
          ? 413
          : 400,
  );
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(route).not.toHaveBeenCalled();
});
it.each([
  'AI_RATE_LIMITED',
  'AI_TIMEOUT',
  'AI_UNAVAILABLE',
  'AI_INVALID_RESPONSE',
  'AI_UPSTREAM_ERROR',
  'NETWORK_UNAVAILABLE',
  'CAPABILITY_UNAVAILABLE',
] as ErrorCode[])(
  'router falls through %s in order and ignores disabled candidates',
  async (code) => {
    const calls: string[] = [];
    const router = new CapabilityRouter({
      ...emptyPolicies,
      TEXT_EXPLANATION_VI: {
        maxProviderAttempts: 2,
        candidates: [false, true, true, true].map((enabled, i) => ({
          providerId: 'fixture',
          modelId: String(i),
          enabled,
          timeoutMs: 100,
          run: async () => {
            calls.push(String(i));
            return i === 2 ? ok(safeExplanation) : fail(code, 'AI');
          },
        })),
      },
    });
    expect(
      (
        await router.route(
          'TEXT_EXPLANATION_VI',
          payload,
          new AbortController().signal,
        )
      ).ok,
    ).toBe(true);
    expect(calls).toEqual(['1', '2']);
  },
);
it.each([
  'INVALID_INPUT',
  'INVALID_IMAGE',
  'EXPLANATION_INVALID',
] as ErrorCode[])(
  'router stops terminal %s instead of sending another provider',
  async (code) => {
    const run = vi.fn(async () => fail(code, 'AI'));
    const router = new CapabilityRouter({
      ...emptyPolicies,
      TEXT_EXPLANATION_VI: {
        maxProviderAttempts: 2,
        candidates: [0, 1].map((i) => ({
          providerId: 'fixture',
          modelId: String(i),
          enabled: true,
          timeoutMs: 10,
          run,
        })),
      },
    });
    expect(
      await router.route(
        'TEXT_EXPLANATION_VI',
        payload,
        new AbortController().signal,
      ),
    ).toMatchObject({ ok: false, error: { code } });
    expect(run).toHaveBeenCalledTimes(1);
  },
);
it('router bounds uncooperative timeout and cancels without starting a second provider', async () => {
  const signals: AbortSignal[] = [];
  const run = vi.fn(async (_input: unknown, signal: AbortSignal) => {
    signals.push(signal);
    return new Promise<ReturnType<typeof ok<typeof safeExplanation>>>(() => {});
  });
  const router = new CapabilityRouter({
    ...emptyPolicies,
    TEXT_EXPLANATION_VI: {
      maxProviderAttempts: 1,
      candidates: [
        {
          providerId: 'fixture',
          modelId: 'stall',
          enabled: true,
          timeoutMs: 10,
          run,
        },
      ],
    },
  });
  expect(
    await router.route(
      'TEXT_EXPLANATION_VI',
      payload,
      new AbortController().signal,
    ),
  ).toMatchObject({ ok: false, error: { code: 'AI_TIMEOUT' } });
  expect(signals[0]!.aborted).toBe(true);
  const parent = new AbortController();
  const pending = router.route('TEXT_EXPLANATION_VI', payload, parent.signal);
  parent.abort();
  expect(await pending).toMatchObject({
    ok: false,
    error: { code: 'AI_UNAVAILABLE' },
  });
  expect(signals[1]!.aborted).toBe(true);
});
