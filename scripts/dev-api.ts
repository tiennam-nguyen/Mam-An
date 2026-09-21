import visionV2 from '../api/v2/vision/analyze-meal';
import explanation from '../api/v2/explanations/generate';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import handler from '../api/v1/analyze-meal';
const server = createServer(async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value);
    }
    const abort = new AbortController();
    req.on('aborted', () => abort.abort());
    const request = new Request(
      'http://' + (req.headers.host ?? '127.0.0.1:3001') + (req.url ?? '/'),
      {
        method: req.method,
        headers,
        signal: abort.signal,
        ...(req.method !== 'GET' && req.method !== 'HEAD'
          ? {
              body: Readable.toWeb(req) as ReadableStream<Uint8Array>,
              duplex: 'half',
            }
          : {}),
      } as RequestInit,
    );
    const path = new URL(request.url).pathname;
    const response = await (path === '/api/v2/vision/analyze-meal' ? visionV2.fetch(request) : path === '/api/v2/explanations/generate' ? explanation.fetch(request) : path === '/api/v1/analyze-meal' ? handler.fetch(request) : Promise.resolve(new Response(null,{status:404})));
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        request_id: crypto.randomUUID(),
        error: { code: 'INTERNAL_ERROR', retryable: false },
      }),
    );
  }
});
server.listen(3001, '127.0.0.1', () =>
  console.log(
    'Local stateless API on http://127.0.0.1:3001. No inference occurs until an explicit request.',
  ),
);
