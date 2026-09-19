import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';
const response = { request_id: 'test-request', schema_version: '1', candidates: [{ raw_name: 'Trứng gà luộc', suggested_portion_multiplier: 1, suggested_portion_label: null, provider_confidence: null }] };
async function upload(page: Page) {
  const buffer = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#eee' } }).jpeg().toBuffer();
  await page.goto('/analyze');
  await page.getByLabel('Chọn ảnh bữa ăn').setInputFiles({ name: 'synthetic.jpg', mimeType: 'image/jpeg', buffer });
  await expect(page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true })).toBeEnabled();
}
for (const width of [390, 1366]) test.describe(`production client ${width}px`, () => {
  test.use({ viewport: { width, height: 900 }, serviceWorkers: 'block' });
  test('live request → correction → portion → persist/reload/history', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/v1/analyze-meal', route => {
      calls++;
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['content-type']).toContain('multipart/form-data');
      return route.fulfill({ json: response, headers: { 'Cache-Control': 'no-store' } });
    });
    await upload(page);
    await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Trứng gà luộc', exact: true })).toBeVisible();
    await page.getByLabel('Món tham chiếu').selectOption('rice');
    await page.getByRole('button', { name: '0.5×', exact: true }).click();
    await expect(page.getByTestId('carb-total')).toHaveText('14,7 g');
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bữa ăn đã lưu' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('14,7 g carb')).toBeVisible();
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'Cơm trắng', exact: true })).toBeVisible();
    expect(calls).toBe(1);
  });
  test('Vietnamese labels use a consistent font and UI has no engineering residue', async ({ page }) => {
    await page.goto('/');
    for (const label of ['Tuần của tôi', 'Thiết lập']) {
      const link = page.getByRole('navigation').getByRole('link', { name: label, exact: true });
      await expect(link).toBeVisible();
      expect(await link.textContent()).toBe(label.normalize('NFC'));
    }
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    for (const href of ['/weekly', '/settings']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `nav a[href="${href}"]` });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      expect(fonts.filter((font: { glyphCount: number }) => font.glyphCount > 0)).toHaveLength(1);
    }
    await page.screenshot({ path: `test-results/polished-home-${width}.png`, fullPage: true });
    const svg = await (await page.request.get('/demo/images/meal.svg')).text();
    expect(svg).not.toContain('<text');
    for (const path of ['/analyze', '/about', '/settings', '/demo']) {
      await page.goto(path);
      await expect(page.locator('body')).not.toContainText(/MockLLM|fixture|Build local|không phải kết quả AI trực tiếp/i);
    }
  });
});
test.describe('degraded live paths', () => {
  test.use({ serviceWorkers: 'block' });
  test('late live result cannot replace a manually corrected draft', async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    let reached!: () => void;
    const requested = new Promise<void>(resolve => { reached = resolve; });
    await page.route('**/api/v1/analyze-meal', async route => {
      reached();
      await held;
      await route.fulfill({ json: response }).catch(() => {});
    });
    await upload(page);
    await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
    await requested;
    await page.getByRole('button', { name: 'Nhập món thủ công', exact: true }).click();
    await page.getByRole('button', { name: '＋ Cơm trắng', exact: true }).click();
    release();
    await page.getByRole('button', { name: '0.5×', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bữa ăn đã lưu' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('14,7 g carb')).toBeVisible();
    await expect(page.getByText('Trứng gà luộc', { exact: true })).toHaveCount(0);
  });
  for (const [status, code] of [[429,'AI_RATE_LIMITED'],[503,'AI_UNAVAILABLE'],[504,'AI_TIMEOUT'],[502,'AI_INVALID_RESPONSE']] as const) {
    test(`HTTP ${status} is visible and retry remains live`, async ({ page }) => {
      let calls = 0;
      await page.route('**/api/v1/analyze-meal', route => ++calls === 1 ? route.fulfill({ status, json: { request_id: 'failed', error: { code, retryable: true } } }) : route.fulfill({ json: response }));
      await upload(page);
      await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Trứng gà luộc', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Trứng gà luộc', exact: true })).toBeVisible();
      expect(calls).toBe(2);
    });
  }
  test('offline failure allows manual entry without silently showing sample results', async ({ page, context }) => {
    await upload(page);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByRole('button', { name: 'Nhập món thủ công' }).click();
    await expect(page.locator('.food-card')).toHaveCount(0);
    await page.getByRole('button', { name: '＋ Cơm trắng', exact: true }).click();
    await expect(page.getByTestId('carb-total')).toHaveText('29,4 g');
  });
  test('malformed success is an error, not a sample meal', async ({ page }) => {
    await page.route('**/api/v1/analyze-meal', route => route.fulfill({ json: { candidates: [] } }));
    await upload(page);
    await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/analyze$/);
  });
  test('invalid and oversized uploads leave manual entry available', async ({ page }) => {
    await page.goto('/analyze');
    for (const buffer of [Buffer.from('invalid'), Buffer.alloc(20000001)]) {
      await page.getByLabel('Chọn ảnh bữa ăn').setInputFiles({ name: 'invalid.jpg', mimeType: 'image/jpeg', buffer });
      await expect(page.getByRole('alert')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Nhập món thủ công' }).click();
    await expect(page.getByRole('button', { name: '＋ Món tự nhập', exact: true })).toBeVisible();
  });
  test('storage failure preserves editable draft and can retry', async ({ page }) => {
    await page.addInitScript(() => {
      const original = IDBObjectStore.prototype.put;
      let failOnce = true;
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'meals' && failOnce) {
          failOnce = false;
          throw new DOMException('injected quota failure', 'QuotaExceededError');
        }
        return original.apply(this, args);
      };
    });
    await page.goto('/analyze');
    await page.getByRole('button', { name: 'Dùng bữa ăn mẫu' }).click();
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('carb-total')).toContainText('32,8');
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Bữa ăn đã lưu' })).toBeVisible();
  });
});
