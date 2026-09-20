import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { providerCandidates } from './providerCandidates';
import { parseProviderResult } from '../server/ai/providerResponseSchema';
import { visionPrompt, PROMPT_VERSION } from '../server/ai/prompt';

const { values } = parseArgs({ options: {
  provider: { type: 'string' }, model: { type: 'string' }, fixture: { type: 'string', default: 'public/demo/images/meal.svg' },
  timeout: { type: 'string', default: '15000' }, all: { type: 'boolean', default: false },
} });
if (!values.all && !values.provider) throw new Error('Select --provider NAME [--model ID] or --all');
const timeout = Number(values.timeout);
if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000) throw new Error('Timeout must be 100..30000 milliseconds');
const selected = providerCandidates.filter(c => (!values.provider || values.provider === c.provider) && (!values.model || values.model === c.model));
if (!selected.length) throw new Error('No discovered eligible candidate matches');
const fixture = await sharp(readFileSync(values.fixture)).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
const fixtureHash = createHash('sha256').update(fixture).digest('hex');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const ledgerPath = 'verification/provider-matrix.json';
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { results: [] };
for (const c of selected) {
  const key = process.env[c.key]?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const start = performance.now();
  let status: number | null = null;
  let errorCode: string | null = key ? null : 'CONFIG_MISSING';
  let candidates: ReturnType<typeof parseProviderResult> | null = null;
  try {
    if (key) {
      const image = fixture.toString('base64');
      const response = await fetch(c.endpoint, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(c.provider === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` }) },
        body: JSON.stringify(c.provider === 'gemini' ? {
          contents: [{ role: 'user', parts: [{ text: visionPrompt }, { inline_data: { mime_type: 'image/jpeg', data: image } }] }],
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 2048 },
        } : {
          model: c.model, messages: [{ role: 'user', content: [{ type: 'text', text: visionPrompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } }] }],
          response_format: { type: 'json_object' }, max_tokens: 2048, stream: false,
          ...(c.provider === 'openrouter' ? { provider: { data_collection: 'deny', zdr: true } } : {}),
        }),
      });
      status = response.status;
      if (!response.ok) {
        errorCode = status === 429 ? 'AI_RATE_LIMITED' : status === 401 || status === 403 ? 'AI_AUTH_FAILED' : status === 404 ? 'AI_MODEL_UNAVAILABLE' : status === 400 || status === 422 ? 'AI_UNSUPPORTED_REQUEST' : status === 408 || status === 504 ? 'AI_TIMEOUT' : status >= 500 ? 'AI_UNAVAILABLE' : 'AI_UPSTREAM_ERROR';
        await response.body?.cancel();
      } else {
        try {
          const body = await response.json();
          const envelope = c.provider === 'gemini' ? { choices: [{ message: { content: body.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('') } }] } : body;
          candidates = parseProviderResult(envelope);
        } catch { errorCode = controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_INVALID_RESPONSE'; }
      }
    }
  } catch { errorCode = controller.signal.aborted ? 'AI_TIMEOUT' : 'NETWORK_UNAVAILABLE'; }
  finally { clearTimeout(timer); }
  const row = {
    provider: c.provider, model: c.model, imageCapable: 'imageCapable' in c ? c.imageCapable : true, officialSource: c.source, configured: !!key,
    timestamp: new Date().toISOString(), environment: 'local', commit,
    workingTreeModified: !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(),
    command: `npm run test:providers -- ${process.argv.slice(2).join(' ')}`,
    httpStatus: status, latencyMs: Math.round(performance.now() - start), timeout: errorCode === 'AI_TIMEOUT', timeoutMs: timeout,
    normalizedSchemaValid: candidates !== null, candidateCount: candidates?.length ?? null, errorCode,
    retryable: ['AI_RATE_LIMITED', 'AI_TIMEOUT', 'AI_UNAVAILABLE', 'NETWORK_UNAVAILABLE'].includes(errorCode ?? ''),
    fixture: values.fixture, fixtureSha256: fixtureHash, promptVersion: PROMPT_VERSION,
    notes: 'One bounded request, no retries. Synthetic fixture is not a recognition benchmark. Free account/no card per operator; billing state not independently verified.',
    seed: null,
  };
  ledger.results.push(row);
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
  console.log(JSON.stringify(row));
}
