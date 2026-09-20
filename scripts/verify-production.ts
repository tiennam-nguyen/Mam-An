import { chromium, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { AnalysisApiSchema } from '../src/infrastructure/ai/analysisApiSchemas';

const origin = process.argv[2];
const deployedCommit = process.argv[3];
if (!origin?.startsWith('https://') || !deployedCommit) throw new Error('Pass HTTPS origin and deployed commit');
const fixture = await sharp('public/demo/images/meal.svg').jpeg({ quality: 82 }).toBuffer();
const browser = await chromium.launch();
const evidence: Record<string, unknown> = {
  timestamp: new Date().toISOString(), environment: 'production', origin, deployedCommit,
  command: `node --import tsx scripts/verify-production.ts ${origin} ${deployedCommit}`,
  fixtureSha256: createHash('sha256').update(fixture).digest('hex'),
  notes: 'One real inference with a synthetic illustration. Fresh isolated browser context; no request interception. Local test records disappear with the context.',
};
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  const get = await page.request.get(new URL('/api/v1/analyze-meal', origin).href);
  evidence.getStatus = get.status();
  expect(get.status()).toBe(405);
  expect(get.headers()['cache-control']).toBe('no-store');
  const views = [];
  mkdirSync('test-results', { recursive: true });
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin);
    for (const name of ['Tuần của tôi', 'Thiết lập']) await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/MockLLM|fixture|Build local/i);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    expect(fits).toBe(true);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument');
    const fonts = [];
    for (const href of ['/weekly', '/settings']) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `nav a[href="${href}"]` });
      const result = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const used = result.fonts.filter((f: { glyphCount: number }) => f.glyphCount > 0);
      expect(used).toHaveLength(1);
      fonts.push({ href, fonts: used });
    }
    await cdp.detach();
    await page.screenshot({ path: `test-results/production-${width}.png`, fullPage: true });
    views.push({ width, fits, fonts });
  }
  evidence.views = views;
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(new URL('/analyze', origin).href);
  await page.getByLabel('Chọn ảnh bữa ăn').setInputFiles({ name: 'synthetic.jpg', mimeType: 'image/jpeg', buffer: fixture });
  const live = page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true });
  await expect(live).toBeEnabled();
  evidence.liveEnabled = true;
  const pending = page.waitForResponse(r => r.url().endsWith('/api/v1/analyze-meal'), { timeout: 35000 });
  await live.click();
  const response = await pending;
  evidence.postStatus = response.status();
  evidence.cacheControl = response.headers()['cache-control'];
  const parsed = AnalysisApiSchema.safeParse(await response.json());
  evidence.normalizedSchemaValid = parsed.success;
  evidence.candidateCount = parsed.success ? parsed.data.candidates.length : null;
  expect(response.status()).toBe(200);
  expect(parsed.success).toBe(true);
  await expect(page.getByRole('heading', { name: 'Bữa ăn theo cách của bạn' })).toBeVisible();
  while (await page.locator('article').count() > 1) await page.locator('article').last().getByRole('button', { name: /^Xóa/ }).click();
  await page.getByLabel('Món tham chiếu').selectOption('rice');
  await page.getByRole('button', { name: '0.5×', exact: true }).click();
  await expect(page.getByTestId('carb-total')).toHaveText('14,7 g');
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bữa ăn đã lưu' })).toBeVisible();
  await page.reload();
  await expect(page.getByText('14,7 g carb')).toBeVisible();
  await page.getByRole('link', { name: 'Thêm số đo', exact: true }).click();
  await page.getByLabel('Giá trị', { exact: true }).fill('6.7');
  await page.getByRole('button', { name: 'Lưu số đo', exact: true }).click();
  await expect(page.getByText('6,7 mmol/L')).toBeVisible();
  await page.goto(new URL('/history', origin).href);
  await expect(page.getByRole('heading', { name: 'Cơm trắng', exact: true })).toBeVisible();
  await page.goto(new URL('/report/weekly', origin).href);
  await expect(page.locator('.metric-grid .big-number')).toHaveText(['1', '1']);
  await expect(page.getByText('6,7 mmol/L')).toBeVisible();
  evidence.saveReloadGlucoseHistoryReport = 'passed';
  evidence.result = 'passed';
} catch {
  evidence.result = 'failed';
  process.exitCode = 1;
} finally {
  await browser.close();
  writeFileSync('verification/production-release.json', JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
}
