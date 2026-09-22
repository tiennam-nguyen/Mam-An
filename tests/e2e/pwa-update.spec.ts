import { test, expect } from './fixtures';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

test('waiting update is offered, preserves unsaved meal, and activates after save', async ({
  page,
}) => {
  const root = resolve('dist');
  let version = 1;
  const server = createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url!, 'http://localhost').pathname,
      );
      const file = resolve(root, '.' + (extname(path) ? path : '/index.html'));
      if (!file.startsWith(root + sep)) {
        res.writeHead(403).end();
        return;
      }
      let bytes = await readFile(file);
      if (path === '/sw.js')
        bytes = Buffer.concat([
          bytes,
          Buffer.from(`\n// update-test-version=${version}\n`),
        ]);
      const mime: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.webmanifest': 'application/manifest+json',
      };
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing port');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto(origin);
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await page.reload();
    await page.goto(origin + '/analyze');
    await page.getByRole('button', { name: 'Dùng bữa ăn mẫu' }).click();
    await expect(page.getByTestId('carb-total')).toBeVisible();
    version = 2;
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
    });
    await page.waitForFunction(
      async () => !!(await navigator.serviceWorker.getRegistration())?.waiting,
    );
    const update = page.getByRole('button', {
      name: 'Tải phiên bản mới',
      exact: true,
    });
    await expect(update).toBeVisible();
    await expect(update).toBeDisabled();
    await page
      .getByRole('button', { name: 'Thử phương án khác', exact: true })
      .click();
    await page
      .getByRole('button', { name: /^0.5 ×/ })
      .first()
      .click();
    await expect(update).toBeDisabled();
    await page
      .getByRole('button', { name: 'Áp dụng vào bữa chưa lưu' })
      .click();
    await expect(update).toBeDisabled();
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
    ).toBeVisible();
    await expect(update).toBeEnabled();
    await page.getByRole('link', { name: 'Thêm số đo', exact: true }).click();
    await page.getByLabel('Giá trị', { exact: true }).fill('6.7');
    await expect(update).toBeDisabled();
    await expect(page.getByLabel('Giá trị', { exact: true })).toHaveValue(
      '6.7',
    );
    await page.getByRole('button', { name: 'Lưu số đo', exact: true }).click();
    await page.getByRole('link', { name: 'Nhật ký', exact: true }).click();
    await page.locator('.history-row').click();
    await expect(update).toBeEnabled();
    await update.click();
    await expect(update).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
    ).toBeVisible();
    const cached = await page.evaluate(async () => {
      const entries = await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      );
      return entries.flat();
    });
    expect(
      cached.some((url) => new URL(url).pathname.startsWith('/api/')),
    ).toBe(false);
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
