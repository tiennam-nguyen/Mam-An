import { test, expect } from './fixtures';
test('mocked browser voice requires explicit start and confirmation, supports cancel, empty and error', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as {
      SpeechRecognition: unknown;
      voice: { calls: number; instance: any };
    };
    w.voice = { calls: 0, instance: null };
    w.SpeechRecognition = class {
      onresult: any;
      onerror: any;
      onend: any;
      start() {
        w.voice.calls++;
        w.voice.instance = this;
      }
      abort() {}
    };
  });
  await page.goto('/settings');
  await page.getByLabel('Hiện nhập giọng nói khi trình duyệt hỗ trợ').click();
  await expect(
    page.getByLabel('Hiện nhập giọng nói khi trình duyệt hỗ trợ'),
  ).toBeChecked();
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Nhập món thủ công', exact: true })
    .click();
  await page.getByRole('button', { name: '＋ Cơm trắng', exact: true }).click();
  expect(await page.evaluate(() => (window as any).voice.calls)).toBe(0);
  const panel = page
    .locator('details.no-print')
    .filter({
      has: page.locator('summary', {
        hasText: /^Nhập giọng nói: tên thành phần$/,
      }),
    });
  await panel.locator('summary').click();
  const emit = (transcript: string) =>
    page.evaluate(
      (text) =>
        (window as any).voice.instance.onresult({
          results: [[{ transcript: text }]],
        }),
      transcript,
    );
  await panel.getByRole('button', { name: 'Bắt đầu nói' }).click();
  await emit('Tên từ giọng nói');
  await expect(panel.getByLabel('Bản chép')).toHaveValue('Tên từ giọng nói');
  await expect(page.getByLabel('Tên thành phần', { exact: true })).toHaveValue(
    'Cơm trắng',
  );
  await panel.getByRole('button', { name: 'Bỏ bản chép' }).click();
  await expect(page.getByLabel('Tên thành phần', { exact: true })).toHaveValue(
    'Cơm trắng',
  );
  await panel.getByRole('button', { name: 'Bắt đầu nói' }).click();
  await emit('Tên đã xác nhận');
  await panel.getByRole('button', { name: 'Xác nhận áp dụng' }).click();
  await expect(page.getByLabel('Tên thành phần', { exact: true })).toHaveValue(
    'Tên đã xác nhận',
  );
  await panel.getByRole('button', { name: 'Bắt đầu nói' }).click();
  await emit('   ');
  await expect(panel.getByRole('status')).toContainText('Không nhận dạng được');
  await expect(panel.getByLabel('Bản chép')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Bắt đầu nói' }).click();
  await page.evaluate(() => (window as any).voice.instance.onerror());
  await expect(panel.getByRole('status')).toContainText('Không nhận dạng được');
  await panel.getByRole('button', { name: 'Bắt đầu nói' }).click();
  await panel.getByRole('button', { name: 'Dừng', exact: true }).click();
  await expect(panel.getByRole('status')).toHaveText('Đã dừng.');
  await page.screenshot({
    path: 'verification/v0.2/screenshots/voice-confirmation.png',
    fullPage: true,
  });
});
test('unsupported voice remains hidden with settings enabled', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'SpeechRecognition', { value: undefined });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
    });
  });
  await page.goto('/settings');
  await page.getByLabel('Hiện nhập giọng nói khi trình duyệt hỗ trợ').click();
  await expect(
    page.getByLabel('Hiện nhập giọng nói khi trình duyệt hỗ trợ'),
  ).toBeChecked();
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
    .click();
  await expect(page.getByText(/^Nhập giọng nói:/)).toHaveCount(0);
  await expect(
    page.getByLabel('Tên thành phần', { exact: true }).first(),
  ).toBeEditable();
});
