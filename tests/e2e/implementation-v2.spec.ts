import { test, expect } from '@playwright/test';
test('v2 offline decision flow keeps scenarios transient and saves/reloads components', async ({
  page,
  context,
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
    .click();
  await expect(page.getByTestId('carb-total')).toContainText('32,8');
  const count = () =>
    page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const r = indexedDB.open('mam-an');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const n = await new Promise<number>((resolve, reject) => {
        const r = db.transaction('meals').objectStore('meals').count();
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
      return n;
    });
  await expect.poll(count).toBe(0);
  await page.getByRole('button', { name: 'Thử phương án khác' }).click();
  const rice = page.locator('.food-card').filter({
    has: page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
  });
  await rice.getByRole('button', { name: /^0.5 ×/ }).click();
  await expect(page.getByText(/Chênh lệch: -14,7 g carb/)).toBeVisible();
  await expect.poll(count).toBe(0);
  await page.getByRole('button', { name: 'Bỏ phương án', exact: true }).click();
  await expect(page.getByTestId('carb-total')).toContainText('32,8');
  await page.getByRole('button', { name: 'Thử phương án khác' }).click();
  await rice.getByRole('button', { name: /^0.5 ×/ }).click();
  await page.getByRole('button', { name: 'Áp dụng vào bữa chưa lưu' }).click();
  await expect(page.getByTestId('carb-total')).toContainText('18,1');
  await expect.poll(count).toBe(0);
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
  ).toBeVisible();
  await expect.poll(count).toBe(1);
  await page.reload();
  await expect(page.locator('.big-number')).toContainText('18,1');
  await page.getByRole('link', { name: 'Thêm số đo', exact: true }).click();
  await page.getByLabel('Giá trị', { exact: true }).fill('6.7');
  await page.getByRole('button', { name: 'Lưu số đo', exact: true }).click();
  await expect(page.getByText('6,7 mmol/L', { exact: true })).toBeVisible();
  await page.goto('/report');
  await expect(
    page.getByRole('heading', { name: 'Báo cáo tuần · Mâm An' }),
  ).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(api).toEqual([]);
  expect(errors).toEqual([]);
});
