import { afterEach, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  realV2Api,
  upstreamResponse,
  safeExplanation,
} from '../fixtures/realV2Api';
import { HttpAiGateway } from '../../src/infrastructure/ai/httpAiGateway';
import {
  buildEvidenceBundle,
  minimizeEvidence,
} from '../../src/domain/explanation/explanation';
import { draft } from '../fixtures/helpers';
const origin = 'https://mam.test';
const payload = () => minimizeEvidence(buildEvidenceBundle(draft(), null, []));
const gateway = (send: typeof fetch = upstreamResponse) => {
  const handler = realV2Api(send);
  return new HttpAiGateway(
    async (url, init) =>
      handler(new Request(new URL(String(url), origin), init)),
    1500,
  );
};
afterEach(() => vi.restoreAllMocks());
it('v1 and v2 gateways cross real decoder/router/adapter/parser with only upstream HTTP fake', async () => {
  const image = new Blob(
    [
      new Uint8Array(
        await sharp({
          create: { width: 2, height: 2, channels: 3, background: 'white' },
        })
          .png()
          .toBuffer(),
      ),
    ],
    { type: 'image/png' },
  );
  const requests: unknown[] = [];
  const g = gateway(async (url, init) => {
    requests.push(JSON.parse(String(init?.body)));
    return upstreamResponse(url, init);
  });
  const input = { image, locale: 'vi-VN' as const };
  for (const result of [
    await g.analyzeMealImage(input),
    await g.understandMealImage(input),
  ]) {
    expect(result).toMatchObject({
      ok: true,
      value: {
        candidates: [{ rawName: 'Cơm trắng', suggestedPortionMultiplier: 1 }],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(
      /99999|synthetic-test-key|synthetic-vision-model/,
    );
  }
  expect(requests).toHaveLength(2);
});
it('text gateway crosses real handler/router/adapter/parser, minimizes runtime serialization, no AbortSignal.any', async () => {
  vi.spyOn(AbortSignal, 'any').mockImplementation(() => {
    throw new Error('not supported');
  });
  const p = payload();
  const result = await gateway(async (url, init) => {
    const sent = JSON.parse(String(init?.body));
    expect(JSON.parse(sent.messages[1].content)).toEqual(p);
    expect(sent.messages[1].content).not.toMatch(
      /glucoseObservations|premealTrace|imagePreviewUrl|note|mealId/,
    );
    return upstreamResponse(url, init);
  }).generateExplanation(p, new AbortController().signal);
  expect(result).toEqual({ ...safeExplanation, generationMode: 'LLM' });
});
it.each([
  'number',
  'reference',
  'medical',
  'malformed',
  'timeout',
  'rate-limit',
])('real text seam falls back for %s', async (kind) => {
  const send: typeof fetch = async () => {
    if (kind === 'timeout') return new Promise(() => {});
    if (kind === 'rate-limit') return new Response('', { status: 429 });
    const out = {
      ...safeExplanation,
      ...(kind === 'number'
        ? { summaryVi: 'Có 999 g carb.' }
        : kind === 'reference'
          ? { evidenceRefs: ['fabricated'] }
          : kind === 'medical'
            ? { summaryVi: 'Bạn mắc bệnh tiểu đường.' }
            : {}),
    };
    return Response.json({
      choices: [
        {
          message: {
            content: kind === 'malformed' ? '{' : JSON.stringify(out),
          },
        },
      ],
    });
  };
  expect(
    (await gateway(send).generateExplanation(payload())).generationMode,
  ).toBe('TEMPLATE');
});
