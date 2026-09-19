import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Catalog requests only. Keep credentials in headers and never persist raw responses.
const catalogs = [
  ['groq', 'GROQ_API_KEY', 'https://api.groq.com/openai/v1/models'],
  ['openrouter', 'OPENROUTER_API_KEY', 'https://openrouter.ai/api/v1/models'],
  ['mistral', 'MISTRAL_API_KEY', 'https://api.mistral.ai/v1/models'],
  ['gemini', 'GEMINI_API_KEY', 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'],
  ['cohere', 'COHERE_API_KEY', 'https://api.cohere.com/v1/models?page_size=1000'],
  ['nvidia', 'NVIDIA_NIM_API_KEY', 'https://integrate.api.nvidia.com/v1/models'],
  ['huggingface', 'HUGGINGFACEHUB_API_KEY', 'https://router.huggingface.co/v1/models'],
  ['sambanova', 'SAMBA_API_KEY', 'https://api.sambanova.ai/v1/models'],
  ['cerebras', 'CEREBRAS_API_KEY', 'https://api.cerebras.ai/v1/models'],
  ['pollinations', 'POLLINATIONS_API_KEY', 'https://gen.pollinations.ai/text/models'],
  ['cloudflare', 'CLOUDFLARE_API_KEY', `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID ?? ''}/ai/models/search`],
] as const;
const results = [];
for (const [provider, keyName, url] of catalogs) {
  const key = process.env[keyName]?.trim();
  if (!key) { results.push({ provider, configured: false }); continue; }
  try {
    const response = await fetch(url, {
      headers: provider === 'gemini' ? { 'x-goog-api-key': key } : { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    const models = body.data ?? body.models ?? body.result ?? (Array.isArray(body) ? body : []);
    const row = { provider, configured: true, timestamp: new Date().toISOString(), httpStatus: response.status,
      models: Array.isArray(models) ? models.map((m: Record<string, unknown>) => ({ id: m.id ?? m.name, capabilities: m.capabilities, architecture: m.architecture, pricing: m.pricing, features: m.features, task: m.task, input_modalities: m.input_modalities, supportedGenerationMethods: m.supportedGenerationMethods })) : [],
    };
    results.push(row);
    console.log(JSON.stringify({ provider, httpStatus: row.httpStatus, models: row.models.length }));
  } catch { results.push({ provider, configured: true, error: 'CATALOG_UNAVAILABLE' }); }
}
writeFileSync('verification/provider-discovery.json', JSON.stringify({ timestamp: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), command: 'node --env-file=.env.local --import tsx scripts/discover-providers.ts', environment: 'local', results }, null, 2) + '\n');
