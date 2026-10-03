import { test, expect } from './fixtures';

for (const width of [390, 1366])
  test(`enriched portions and report visual inspection ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/meal/new');
    await page
      .getByRole('button', { name: 'Nhập món thủ công', exact: true })
      .click();
    await page
      .getByRole('button', { name: '＋ Cơm trắng', exact: true })
      .click();
    await expect(page.getByTestId('carb-total')).toHaveText('46,5 g');
    await expect(
      page.getByRole('combobox', { name: 'Vai trò', exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `verification/enrichment/review-${width}.png`,
      fullPage: true,
    });
    await page
      .getByText('Nhập lượng cụ thể hoặc đổi đơn vị', { exact: true })
      .click();
    await page
      .getByRole('combobox', { name: 'Đơn vị khẩu phần', exact: true })
      .selectOption('g');
    await page.getByLabel('Số lượng', { exact: true }).fill('158');
    await page.getByLabel('Số lượng', { exact: true }).press('Tab');
    await expect(page.getByTestId('carb-total')).toHaveText('46,5 g');
    await page
      .getByRole('combobox', { name: 'Đơn vị khẩu phần', exact: true })
      .selectOption('describe:household');
    await expect(page.getByTestId('carb-total')).toHaveText('Chưa có dữ liệu');
    await page.screenshot({
      path: `verification/enrichment/unknown-${width}.png`,
      fullPage: true,
    });
    await page.goto('/demo');
    await page
      .getByRole('button', { name: 'Tạo dữ liệu mẫu', exact: true })
      .click();
    await expect(page.getByRole('status')).toContainText('Đã chuẩn bị');
    await page.goto('/report');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await expect(page.locator('.report-meal')).toHaveCount(7);
    await expect(page.locator('tbody').getByRole('link').first()).toHaveText(
      /M\d ·/,
    );
    await page.screenshot({
      path: `verification/enrichment/report-${width}.png`,
      fullPage: true,
    });
    await page.locator('tbody').getByRole('link').first().click();
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu', exact: true }),
    ).toBeVisible();
    await page.goto('/settings');
    await page.getByLabel('Chữ lớn', { exact: true }).click();
    await expect(page.getByLabel('Chữ lớn', { exact: true })).toBeChecked();
    await page.goto('/report');
    await expect(page.locator('tbody tr')).toHaveCount(10);
    await page.screenshot({
      path: `verification/enrichment/report-large-${width}.png`,
      fullPage: true,
    });
    await page.locator('.report-readings').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `verification/enrichment/readings-large-${width}.png`,
    });
    await page.locator('.report-pattern').first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `verification/enrichment/evidence-large-${width}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1366) {
      await page.emulateMedia({ media: 'print' });
      await page.pdf({
        path: 'verification/enrichment/report.pdf',
        format: 'A4',
        printBackground: true,
      });
    }
  });
