import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Pass the installed @vercel/node directory; no Vercel account or provider key needed.
const runtime = process.argv[2];
if (!runtime) throw new Error('Pass the installed @vercel/node directory');
const require = createRequire(resolve(runtime, 'package.json'));
const { build } = require(runtime);
const { FileFsRef, FileBlob } = require('@vercel/build-utils');
const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(path => /^(api|server|src)\//.test(path) || ['package.json', 'package-lock.json', 'tsconfig.json'].includes(path));
const files = Object.fromEntries(paths.map(path => [path, new FileFsRef({ fsPath: resolve(path) })]));
const started = new Date().toISOString();
const result = await build({ files, entrypoint: 'api/v1/analyze-meal.ts', workPath: process.cwd(), config: { projectSettings: { nodeVersion: '24.x' } }, meta: { isDev: true } });
const output = resolve('verification/.runtime', String(Date.now()));
for (const [path, file] of Object.entries(result.output.files)) {
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  const blob = await FileBlob.fromStream({ stream: file.toStream() });
  await writeFile(target, blob.data);
}
const handlerPath = join(output, result.output.handler);
console.log(JSON.stringify({ started, builder: require(resolve(runtime, 'package.json')).version, handler: result.output.handler, runtime: result.output.runtime, fileCount: Object.keys(result.output.files).length }));
try {
  process.env.AI_PROVIDER_ORDER = 'groq';
  process.env.GROQ_API_KEY = 'test-only-placeholder';
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: JSON.stringify({ candidates: [{ raw_name: 'Cơm trắng', suggested_portion_multiplier: 1, suggested_portion_label: null, provider_confidence: null }] }) } }] });
  const { default: handler } = await import(pathToFileURL(handlerPath).href);
  const response = await handler.fetch(new Request('http://localhost/api/v1/analyze-meal'));
  console.log(JSON.stringify({ status: response.status, body: await response.json() }));
  if (response.status !== 405) process.exitCode = 1;
  const sharp = createRequire(resolve('package.json'))('sharp');
  const pixels = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#fff' } }).png().toBuffer();
  const form = new FormData();
  form.set('image', new Blob([pixels], { type: 'image/png' }), 'synthetic.png');
  form.set('locale', 'vi-VN');
  const valid = await handler.fetch(new Request('http://localhost/api/v1/analyze-meal', { method: 'POST', headers: { origin: 'http://localhost' }, body: form }));
  const body = await valid.json();
  console.log(JSON.stringify({ boundary: 'emitted Function → sharp → real adapter → stub HTTP → normalized response', status: valid.status, candidateCount: body.candidates?.length, noStore: valid.headers.get('cache-control') }));
  if (valid.status !== 200 || body.candidates?.[0]?.raw_name !== 'Cơm trắng') process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ code: error.code, message: error.message }));
  process.exitCode = 1;
}
