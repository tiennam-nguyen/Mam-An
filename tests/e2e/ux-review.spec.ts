import { test, expect } from './fixtures';
for (const width of [390, 1366])
  test(`visual UX review ${width}: correction, save, history, settings, report`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const shot = async (name: string, fullPage = false) =>
      page.screenshot({
        path: `verification/v0.2/screenshots/ux-${name}-${width}.png`,
        fullPage,
      });
    await page.goto('/meal/new');
    await shot('new', true);
    await page
      .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
      .click();
    await expect(page.getByTestId('carb-total')).toHaveText('32,8 g');
    await page.evaluate(() => window.scrollTo(0, 0));
    if (width < 800)
      await expect(
        page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }),
      ).toBeInViewport();
    await shot('review');
    await shot('review-full', true);
    const first = page.locator('article').first();
    await first
      .getByText('Sửa tên hoặc món tham chiếu', { exact: true })
      .click();
    await first
      .getByLabel('Tên thành phần', { exact: true })
      .fill('Món đã sửa');
    await expect(
      first.getByRole('heading', { name: 'Món đã sửa', exact: true }),
    ).toBeVisible();
    await first
      .getByText('Sửa tên hoặc món tham chiếu', { exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Thử phương án khác', exact: true })
      .click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot('simulation');
    await page
      .getByRole('button', { name: 'Bỏ phương án', exact: true })
      .click();
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
    ).toBeVisible();
    await shot('detail', true);
    await page.goto('/history');
    await expect(page.locator('.history-row')).toHaveCount(1);
    await shot('history', true);
    await page.goto('/settings');
    await expect(page.getByLabel('Chữ lớn', { exact: true })).toBeVisible();
    await shot('settings', true);
    await page.goto('/demo');
    await page
      .getByRole('button', { name: 'Tạo dữ liệu mẫu', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
    await page.goto('/report');
    await expect(page.locator('tbody tr')).toHaveCount(7);
    await shot('report', true);
  });
