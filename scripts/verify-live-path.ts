import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import handler from '../api/v1/analyze-meal';

// Explicit single-provider smoke: no fallback traffic and no personal image.
const provider = process.argv[2] ?? 'groq';
if (!['groq', 'mistral', 'cohere', 'gemini', 'openrouter'].includes(provider)) throw new Error('Select a supported provider');
process.env.AI_PROVIDER_ORDER = provider;
const root = resolve('dist');
const server = createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host}`;
    if (req.url === '/api/v1/analyze-meal') {
      const response = await handler.fetch(new Request(origin + req.url, {
        method: req.method, headers: new Headers(req.headers as Record<string, string>),
        body: Readable.toWeb(req) as ReadableStream<Uint8Array>, duplex: 'half',
      } as RequestInit));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const path = new URL(req.url!, origin).pathname;
    const file = resolve(root, '.' + (extname(path) ? path : '/index.html'));
    if (!file.startsWith(root + sep)) { res.writeHead(404); res.end(); return; }
    const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
    res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch { res.writeHead(500); res.end(); }
});
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('No local port');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const fixture = await sharp('public/demo/images/meal.svg').jpeg({ quality: 82 }).toBuffer();
  await page.goto(`http://127.0.0.1:${address.port}/analyze`);
  await page.getByLabel('Chọn ảnh bữa ăn').setInputFiles({ name: 'synthetic.jpg', mimeType: 'image/jpeg', buffer: fixture });
  const pending = page.waitForResponse(r => r.url().endsWith('/api/v1/analyze-meal'), { timeout: 35000 });
  await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
  const response = await pending;
  const body = await response.json();
  const save = page.getByRole('button', { name: 'Lưu bữa ăn', exact: true });
  if (response.ok()) await save.waitFor({ state: 'visible' });
  const row = { timestamp: new Date().toISOString(), environment: 'local-production-build',
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), workingTreeModified: true,
    command: `node --env-file=.env.local --import tsx scripts/verify-live-path.ts ${provider}`,
    provider, fixture: 'public/demo/images/meal.svg', fixtureSha256: createHash('sha256').update(fixture).digest('hex'),
    httpStatus: response.status(), candidateCount: body.candidates?.length ?? 0, errorCode: body.error?.code ?? null,
    cacheControl: response.headers()['cache-control'], reviewVisible: await save.isVisible(),
    notes: 'Real browser native fetch → local HTTP → exported function → real provider → UI. Synthetic connectivity only; not Vercel evidence.' };
  const path = 'verification/live-path.json';
  const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const results = Array.isArray(previous) ? previous : [previous];
  results.push(row);
  writeFileSync(path, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(row));
  if (!response.ok() || !row.reviewVisible) process.exitCode = 1;
} finally { await browser.close(); server.close(); }
