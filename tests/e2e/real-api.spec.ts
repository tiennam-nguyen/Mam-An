import { test, expect } from './fixtures';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import sharp from 'sharp';
import { realV2Api, upstreamResponse } from '../fixtures/realV2Api';
test('production browser crosses real local v1/v2 API/router/adapter with upstream HTTP only stubbed', async ({
  page,
}) => {
  const root = resolve('dist');
  let calls = 0;
  const handler = realV2Api(async (url, init) => {
    calls++;
    return upstreamResponse(url, init);
  });
  const server = createServer(async (req, res) => {
    try {
      const url = `http://${req.headers.host}${req.url}`;
      if (new URL(url).pathname.startsWith('/api/')) {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const response = await handler(
          new Request(url, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            ...(req.method === 'GET' ? {} : { body: Buffer.concat(chunks) }),
          }),
        );
        res.writeHead(response.status, Object.fromEntries(response.headers));
        res.end(Buffer.from(await response.arrayBuffer()));
        return;
      }
      const path = new URL(url).pathname,
        file = resolve(root, '.' + (extname(path) ? path : '/index.html'));
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      const mime: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.webmanifest': 'application/manifest+json',
      };
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.addInitScript(() =>
      Object.defineProperty(AbortSignal, 'any', { value: undefined }),
    );
    await page.goto(origin + '/meal/new');
    const buffer = await sharp({
      create: { width: 32, height: 32, channels: 3, background: 'white' },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel('Chọn ảnh bữa ăn')
      .setInputFiles({ name: 'synthetic.png', mimeType: 'image/png', buffer });
    await page
      .getByRole('button', { name: 'Phân tích trực tiếp', exact: true })
      .click();
    await expect(page.getByTestId('carb-total')).toHaveText('29,4 g');
    await page
      .getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true })
      .click();
    await expect(
      page.getByText('Diễn đạt tự động từ dữ liệu', { exact: true }),
    ).toBeVisible();
    const v1 = await page.request.post(origin + '/api/v1/analyze-meal', {
      multipart: {
        locale: 'vi-VN',
        image: { name: 'synthetic.png', mimeType: 'image/png', buffer },
      },
    });
    expect(v1.status()).toBe(200);
    expect((await v1.json()).schema_version).toBe('1');
    expect(calls).toBe(3);
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('.big-number')).toHaveText('29,4 g carb');
    await page.screenshot({
      path: 'verification/v0.2/screenshots/real-api-detail.png',
      fullPage: true,
    });
    const cacheUrls = await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      ).flat(),
    );
    expect(
      cacheUrls.some((url) => new URL(url).pathname.startsWith('/api/')),
    ).toBe(false);
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
