import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) throw new Error('Pass the deployment origin');
const browser = await chromium.launch();
const evidence: unknown[] = [];
try {
  for (const width of [390, 1366]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(origin);
    const client = await page.context().newCDPSession(page);
    await client.send('DOM.enable');
    await client.send('CSS.enable');
    const { root } = await client.send('DOM.getDocument');
    const labels = [];
    for (const path of ['/weekly', '/settings']) {
      const selector = `nav a[href="${path}"]`;
      const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
      const fonts = await client.send('CSS.getPlatformFontsForNode', { nodeId });
      const dom = await page.locator(selector).evaluate(el => {
        const style = getComputedStyle(el);
        return { text: el.textContent, codepoints: [...el.textContent!].map(c => c.codePointAt(0)), font: style.fontFamily, weight: style.fontWeight, spacing: style.letterSpacing, lineHeight: style.lineHeight };
      });
      labels.push({ ...dom, fonts: fonts.fonts });
    }
    mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: `test-results/deployment-${width}.png`, fullPage: true });
    await page.goto(new URL('/analyze', origin).href);
    const buffer = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#eee' } }).jpeg().toBuffer();
    await page.getByLabel('Chọn ảnh bữa ăn').setInputFiles({ name: 'synthetic.jpg', mimeType: 'image/jpeg', buffer });
    await page.getByAltText('Ảnh bữa ăn đã chọn').waitFor();
    const liveEnabled = await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).isEnabled();
    // One request per origin, and only a synthetic image; never inspect or log request bodies.
    if (width === 390 && liveEnabled) {
      const responsePromise = page.waitForResponse(r => r.url().includes('/api/v1/analyze-meal')).catch(() => null);
      await page.getByRole('button', { name: 'Phân tích trực tiếp', exact: true }).click();
      const response = await responsePromise;
      if (response) {
        const contentType = response.headers()['content-type'];
        const body = await response.text();
        evidence.push({ boundary: 'browser → deployed API', status: response.status(), contentType, invocationFailed: body.includes('FUNCTION_INVOCATION_FAILED'), json: contentType?.includes('application/json') ?? false });
      } else evidence.push({ boundary: 'browser → deployed API', status: null, error: 'NO_RESPONSE_WITHIN_30_SECONDS', visibleError: await page.getByRole('alert').allTextContents() });
    }
    evidence.push({ width, liveEnabled, labels });
    await page.close();
  }
} finally {
  await browser.close();
}
const report = { timestamp: new Date().toISOString(), commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), command: `node --import tsx scripts/inspect-deployment.ts ${origin}`, origin, evidence };
writeFileSync('verification/deployment-inspection.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
