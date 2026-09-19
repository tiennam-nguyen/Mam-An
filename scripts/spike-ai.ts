import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { GroqVisionProvider } from '../server/ai/groqVisionProvider';
import { OpenRouterVisionProvider } from '../server/ai/openRouterVisionProvider';
import { FailoverVisionService } from '../server/ai/failoverVisionService';
import { PROMPT_VERSION } from '../server/ai/prompt';

const fixture = await sharp(readFileSync('public/demo/images/meal.svg'))
  .jpeg({ quality: 82 })
  .toBuffer();
const commit = execFileSync(
  'git',
  ['-c', 'safe.directory=C:/Users/LOQ/Mam An', 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();
const configurations = [
  { provider: 'groq', model: 'qwen/qwen3.6-27b' },
  { provider: 'groq', model: 'qwen/qwen3.8-27b' },
  { provider: 'openrouter', model: 'qwen/qwen3.8-27b:free' },
  { provider: 'openrouter', model: 'nex-agi/nex-n2.5-mini:free' },
] as const;
const results: unknown[] = [];
for (const configuration of configurations) {
  let httpStatus: number | null = null;
  const send: typeof fetch = async (url, options) => {
    const response = await fetch(url, options);
    httpStatus = response.status;
    return response;
  };
  const provider =
    configuration.provider === 'groq'
      ? new GroqVisionProvider(
          process.env.GROQ_API_KEY ?? '',
          configuration.model,
          send,
        )
      : new OpenRouterVisionProvider(
          process.env.OPENROUTER_API_KEY ?? '',
          configuration.model,
          { denyDataCollection: true, requireZdr: true },
          send,
        );
  const result = await new FailoverVisionService([provider], 15000).analyze(
    {
      image: { bytes: fixture, mimeType: 'image/jpeg' },
      locale: 'vi-VN',
      requestId: crypto.randomUUID(),
    },
    new AbortController().signal,
  );
  const row = {
    ...configuration,
    httpStatus,
    configured: provider.isConfigured(),
    validResponse: result.ok,
    candidateCount: result.ok ? result.value.candidates.length : null,
    errorCode: result.ok ? null : result.error.code,
  };
  results.push(row);
  console.log(JSON.stringify(row));
}
mkdirSync('verification', { recursive: true });
writeFileSync(
  'verification/live-provider-spike.json',
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      command: 'node --env-file=.env.local --import tsx scripts/spike-ai.ts',
      commit,
      workingTree: 'implementation changes pending commit',
      hypothesis:
        'Selected image models accept the synthetic illustration and return validated candidate-only output.',
      falsifier: 'HTTP failure, timeout, or invalid response schema.',
      fixture: 'public/demo/images/meal.svg → JPEG quality 82',
      fixtureSha256: createHash('sha256').update(fixture).digest('hex'),
      promptVersion: PROMPT_VERSION,
      timeoutMs: 15000,
      seed: 'No seed parameter sent; one request per model, not a quality benchmark.',
      openRouterPrivacy: { data_collection: 'deny', zdr: true },
      results,
    },
    null,
    2,
  ) + '\n',
);
