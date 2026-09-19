import { test, expect } from '@playwright/test';
test('offline sample → correction → save/reload → glucose → week → report', async ({
  page,
  context,
}) => {
  const apiCalls: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) apiCalls.push(r.url());
  });
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect(
    page.getByRole('heading', { name: /Bữa ăn quen/ }),
  ).toBeVisible();
  await page.screenshot({
    path: 'test-results/home-mobile.png',
    fullPage: true,
  });
  await context.setOffline(true);
  await page.goto('/analyze');
  await page.getByRole('button', { name: 'Dùng bữa ăn mẫu' }).click();
  await expect(page.getByTestId('carb-total')).toContainText('32,8');
  const rice = page
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
    });
  await rice.getByRole('button', { name: '0.5×', exact: true }).click();
  await expect(page.getByTestId('carb-total')).toContainText('18,1');
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('18,1 g carb')).toBeVisible();
  await page.getByRole('link', { name: 'Thêm số đo', exact: true }).click();
  await page.getByLabel('Giá trị', { exact: true }).fill('6.7');
  await page.getByRole('combobox', { name: /^Đơn vị/ }).selectOption('MMOL_L');
  const timeInput = page.getByLabel('Thời điểm đo', { exact: true });
  const today = (await timeInput.inputValue()).slice(0, 10);
  await timeInput.fill(`${today}T08:30`);
  await page.getByRole('combobox', { name: /^Thời điểm so với bữa/ }).selectOption('AFTER_MEAL');
  await page.getByRole('button', { name: 'Lưu số đo' }).click();
  await expect(page.getByText('6,7 mmol/L')).toBeVisible();
  await page.getByRole('link', { name: 'Tuần của tôi', exact: true }).click();
  await expect(page.getByText('6,7 mmol/L')).toBeVisible();
  await page.getByRole('link', { name: 'Xem báo cáo' }).click();
  await expect(
    page.getByRole('heading', { name: 'Báo cáo tuần · Mâm An' }),
  ).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('header')).toBeHidden();
  await page.pdf({ path: 'test-results/weekly-report.pdf', format: 'A4' });
  await page.screenshot({ path: 'test-results/report.png', fullPage: true });
  expect(apiCalls).toEqual([]);
});
test('manual unknown stays unknown, demo reset preserves user records', async ({
  page,
}) => {
  await page.goto('/analyze');
  await page.getByRole('button', { name: 'Nhập món thủ công' }).click();
  await page
    .getByRole('button', { name: '＋ Món tự nhập', exact: true })
    .click();
  await page.getByLabel('Tên hiển thị').fill('Món riêng');
  await expect(page.getByTestId('carb-total')).toHaveText('Chưa có dữ liệu');
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bữa ăn đã lưu' })).toBeVisible();
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Tạo dữ liệu mẫu' }).click();
  await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
  await page
    .getByRole('button', { name: 'Đặt lại dữ liệu mẫu', exact: true })
    .click();
  await page.getByRole('button', { name: 'Xác nhận đặt lại mẫu' }).click();
  await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
  await page.goto('/history');
  await expect(
    page.getByRole('heading', { name: 'Món riêng', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.history-row')).toHaveCount(8);
});

test('uploaded pixels become only a small local thumbnail with no original EXIF', async ({
  page,
}) => {
  const sharp = (await import('sharp')).default;
  const original = await sharp({
    create: { width: 1800, height: 1200, channels: 3, background: '#c9ba91' },
  })
    .withExif({ IFD0: { Artist: 'Synthetic fixture author' } })
    .jpeg()
    .toBuffer();
  expect((await sharp(original).metadata()).exif).toBeDefined();
  await page.goto('/analyze');
  await page
    .getByLabel('Chọn ảnh bữa ăn')
    .setInputFiles({
      name: 'fixture.jpg',
      mimeType: 'image/jpeg',
      buffer: original,
    });
  await expect(page.getByAltText('Ảnh bữa ăn đã chọn')).toBeVisible();
  await page.getByRole('button', { name: 'Nhập món thủ công' }).click();
  await page.getByRole('button', { name: '＋ Cơm trắng', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
  ).toBeVisible();
  const rows = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('mam-an');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const records = await new Promise<{ blob: Blob }[]>((resolve, reject) => {
      const request = db
        .transaction('thumbnails')
        .objectStore('thumbnails')
        .getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return Promise.all(
      records.map(async (row) => ({
        bytes: Array.from(new Uint8Array(await row.blob.arrayBuffer())),
        type: row.blob.type,
      })),
    );
  });
  expect(rows).toHaveLength(1);
  const image = rows[0]!;
  expect(image.type).toBe('image/jpeg');
  const metadata = await sharp(Buffer.from(image.bytes)).metadata();
  expect(metadata.width).toBe(240);
  expect(metadata.height).toBe(160);
  expect(metadata.exif).toBeUndefined();
  expect(image.bytes.length).toBeLessThan(original.length);
  await page.reload();
  await expect(page.locator('.meal-thumb')).toHaveAttribute('src', /^blob:/);
});
test('laptop layout and populated print report fit viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto('/');
  await page.screenshot({
    path: 'test-results/home-desktop.png',
    fullPage: true,
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Tạo dữ liệu mẫu' }).click();
  await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
  await page.goto('/report/weekly');
  await expect(page.locator('tbody tr')).toHaveCount(7);
  await expect(page.locator('.metric-grid .big-number')).toHaveText(['7', '7']);
  await expect(page.getByText('7 bữa mẫu · 0 bữa tự ghi')).toBeVisible();
  await expect(page.locator('.daily-row')).toHaveCount(7);
  for (const row of await page.locator('.daily-row').all()) await expect(row).toContainText('32,8 g');
  await page.emulateMedia({ media: 'print' });
  await page.setViewportSize({ width: 794, height: 1123 });
  await page.screenshot({
    path: 'test-results/report-desktop.png',
    fullPage: true,
  });
  await page.pdf({
    path: 'test-results/weekly-report-populated.pdf',
    format: 'A4',
    preferCSSPageSize: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
