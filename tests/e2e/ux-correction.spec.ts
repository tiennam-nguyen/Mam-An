import { test, expect } from './fixtures';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { seedDatabase, readDatabase } from './storage';
import { migrateV1Meal } from '../../src/infrastructure/persistence/migrateV1';
const meal = () =>
  migrateV1Meal(
    JSON.parse(readFileSync('tests/fixtures/persisted-v1-meal.json', 'utf8')),
  ).value;
import {
  toMealRow,
  toGlucoseRow,
} from '../../src/infrastructure/persistence/persistenceSchemas';

const phase = process.env.UX_PHASE ?? 'after';
const root = `verification/ux-correction/${phase}`;
test('Vietnamese typography and mobile journey screenshots', async ({
  page,
  context,
}) => {
  test.setTimeout(90000);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    `${root}/browser.json`,
    JSON.stringify(
      {
        browser: context.browser()?.version(),
        platform: process.platform,
        date: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const evidence: unknown[] = [];
  for (const width of [320, 390, 1366])
    for (const large of [false, true]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/settings');
      const checkbox = page.getByLabel('Chữ lớn', { exact: true });
      await expect(checkbox).toBeVisible();
      if ((await checkbox.isChecked()) !== large) await checkbox.click();
      await expect(checkbox).toBeChecked({ checked: large });
      await page
        .getByRole('link', { name: 'Đến nội dung', exact: true })
        .focus();
      await expect(
        page.getByRole('link', { name: 'Đến nội dung', exact: true }),
      ).toBeInViewport();
      await page
        .getByRole('link', { name: 'Đến nội dung', exact: true })
        .press('Tab');
      await expect(page.locator('html')).toHaveClass(
        large ? /large-text/ : /^(?!.*large-text)/,
      );
      for (const route of ['/settings', '/weekly', '/glucose/new']) {
        await page.goto(route);
        await expect(page.locator('h1')).toBeVisible();
        await page.screenshot({
          path: `${root}/${route.replaceAll('/', '-')}-${width}-${large}.png`,
          fullPage: true,
        });
        // Pixel baselines are Windows-specific; other platforms still run the
        // workflow, font inspection and geometry checks and need visual review.
        if (
          phase === 'after' &&
          process.platform === 'win32' &&
          route !== '/glucose/new'
        ) {
          await expect(page.locator('h1')).toHaveScreenshot(
            `heading-${route.slice(1)}-${width}-${large}.png`,
          );
          await expect(page.locator('.site-header nav')).toHaveScreenshot(
            `nav-${route.slice(1)}-${width}-${large}.png`,
          );
        }
        const dom = await cdp.send('DOM.getDocument');
        if (phase === 'after')
          for (const link of await page.locator('.site-header nav a').all())
            expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(
              44,
            );
        for (const selector of ['h1', '.site-header nav', 'label', 'button']) {
          const { nodeId } = await cdp.send('DOM.querySelector', {
            nodeId: dom.root.nodeId,
            selector,
          });
          if (!nodeId) continue;
          const fonts = await cdp.send('CSS.getPlatformFontsForNode', {
            nodeId,
          });
          const styles = await page
            .locator(selector)
            .first()
            .evaluate((el) => {
              const s = getComputedStyle(el),
                text = el.textContent ?? '';
              return {
                text,
                nfc: text === text.normalize('NFC'),
                codepoints: [...text].map((c) =>
                  c.codePointAt(0)?.toString(16),
                ),
                family: s.fontFamily,
                weight: s.fontWeight,
                spacing: s.letterSpacing,
                lineHeight: s.lineHeight,
              };
            });
          evidence.push({ width, large, route, selector, fonts, ...styles });
          if (phase === 'after') {
            expect(styles.nfc).toBe(true);
            expect(
              fonts.fonts.some((f) => /Georgia|Times/.test(f.familyName)),
            ).toBe(false);
          }
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await page.goto('/meal/new');
      await page
        .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
        .click();
      await expect(page.getByTestId('carb-total')).toHaveText('32,8 g');
      if (phase === 'after') {
        expect(await page.evaluate(() => window.scrollY)).toBe(0);
        await expect(page.locator('main')).toBeFocused();
      }
      await page.screenshot({
        path: `${root}/review-${width}-${large}.png`,
        fullPage: true,
      });
      await page.screenshot({
        path: `${root}/review-viewport-${width}-${large}.png`,
      });
      if (width < 800)
        await expect(
          page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }),
        ).toBeInViewport();
      if (phase === 'after') {
        await page
          .getByRole('button', { name: 'Thử phương án khác', exact: true })
          .click();
        await page.screenshot({
          path: `${root}/simulation-${width}-${large}.png`,
          fullPage: true,
        });
        await page
          .getByRole('button', { name: 'Bỏ phương án', exact: true })
          .click();
        await page
          .getByRole('button', { name: 'Lưu bữa ăn', exact: true })
          .click();
        await expect(
          page.getByRole('heading', { name: 'Bữa ăn đã lưu', exact: true }),
        ).toBeVisible();
        await page.reload();
        await page.screenshot({
          path: `${root}/detail-${width}-${large}.png`,
          fullPage: true,
        });
        await page
          .getByRole('link', { name: 'Thêm số đo', exact: true })
          .click();
        await expect(page.getByText(/Gắn với bữa:/)).toBeVisible();
        await page.getByLabel('Giá trị', { exact: true }).fill('6,7');
        await page
          .getByRole('button', { name: 'Lưu số đo', exact: true })
          .click();
        await expect(
          page.getByText('6,7 mmol/L', { exact: true }),
        ).toBeVisible();
        await page.goto('/history');
        await page.screenshot({
          path: `${root}/history-${width}-${large}.png`,
          fullPage: true,
        });
        await page.goto('/report');
        await expect(
          page.getByText('6,7 mmol/L', { exact: true }).first(),
        ).toBeVisible();
        await page.screenshot({
          path: `${root}/report-${width}-${large}.png`,
          fullPage: true,
        });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      } else
        await page
          .getByRole('button', { name: 'Hủy bữa chưa lưu', exact: true })
          .click();
    }
  writeFileSync(`${root}/typography.json`, JSON.stringify(evidence, null, 2));
});

test('glucose syntax, unit change and saved measurement remain exact', async ({
  page,
}) => {
  await page.goto('/glucose/new');
  const input = page.getByLabel('Giá trị', { exact: true });
  await input.fill('');
  await input.evaluate((el) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', '6\n7');
    el.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  });
  await expect(input).toHaveValue('');
  await expect(page.locator('#glucose-error')).toContainText(
    'Số đo chưa hợp lệ',
  );
  for (const value of [
    '1e9',
    '1E+9',
    '1e-2',
    '1e309',
    '',
    '-1',
    '0',
    '999999999999999999',
    '6.789',
    '6,7x',
    'NaN',
    'Infinity',
    ' ',
  ]) {
    await input.fill(value);
    await page.getByRole('button', { name: 'Lưu số đo', exact: true }).click();
    await expect(page.locator('#glucose-error')).toContainText(
      'Số đo chưa hợp lệ',
    );
    expect((await readDatabase(page)).tables.glucoseReadings).toHaveLength(0);
  }
  await input.fill('6,7');
  await page
    .getByRole('combobox', { name: 'Đơn vị', exact: true })
    .selectOption('MG_DL');
  await expect(input).toHaveValue('');
  await expect(page.getByRole('status')).toContainText('nhập lại');
  await input.fill('120.5');
  await expect(page.locator('#glucose-error')).toContainText('số nguyên');
  await page
    .getByRole('combobox', { name: 'Đơn vị', exact: true })
    .selectOption('MMOL_L');
  await input.fill('6,7');
  await page.getByRole('button', { name: 'Lưu số đo', exact: true }).click();
  await expect(page.getByText('6,7 mmol/L', { exact: true })).toBeVisible();
  await page.reload();
  const saved = (await readDatabase(page)).tables.glucoseReadings!;
  expect(saved).toHaveLength(1);
  expect(saved[0].value).toMatchObject({
    value: 6.7,
    unit: 'MMOL_L',
    timingTag: null,
  });
});

for (const width of [320, 390, 1366])
  test(`historical extreme glucose is preserved and fits ${width}`, async ({
    page,
  }) => {
    const m = { ...meal(), createdAt: new Date().toISOString() };
    const g = {
      id: 'extreme' as never,
      mealId: m.id,
      measuredAt: m.createdAt,
      value: 1e308,
      unit: 'MMOL_L' as const,
      timingTag: null,
      note: null,
      isDemo: m.isDemo,
    };
    await page.setViewportSize({ width, height: 900 });
    await seedDatabase(page, {
      meals: [toMealRow(m)],
      glucoseReadings: [toGlucoseRow(g)],
    });
    for (const route of [`/meal/${m.id}`, '/report']) {
      await page.goto(route);
      if (phase === 'before') {
        await expect(page.getByText(/mmol\/L/).first()).toBeVisible();
        await page.screenshot({
          path: `${root}/extreme-${route.startsWith('/meal') ? 'detail' : 'report'}-${width}.png`,
          fullPage: true,
        });
        writeFileSync(
          `${root}/overflow-${width}-${route.startsWith('/meal') ? 'detail' : 'report'}.json`,
          JSON.stringify(
            await page.evaluate(() => ({
              viewport: innerWidth,
              document: document.documentElement.scrollWidth,
            })),
          ),
        );
        continue;
      }
      await expect(
        page.getByText('Giá trị cần kiểm tra', { exact: true }),
      ).toBeVisible();
      await page.getByText('Xem giá trị đã lưu', { exact: true }).click();
      await expect(
        page.getByText('1e+308 mmol/L', { exact: true }),
      ).toBeVisible();
      await page.screenshot({
        path: `${root}/extreme-${route.startsWith('/meal') ? 'detail' : 'report'}-${width}.png`,
        fullPage: true,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.reload();
    }
    expect(
      (await readDatabase(page)).tables.glucoseReadings![0].value.value,
    ).toBe(1e308);
    if (phase === 'before') await page.goto('/settings');
  });

test('progressive editor preserves custom names, unknown nutrition and recalculation', async ({
  page,
}) => {
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
    .click();
  const rice = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Cơm trắng', exact: true }),
  });
  await expect(
    rice.getByRole('combobox', { name: 'Vai trò', exact: true }),
  ).toBeHidden();
  await expect(
    rice.getByRole('combobox', {
      name: 'Món tham chiếu dinh dưỡng',
      exact: true,
    }),
  ).toBeHidden();
  await expect(rice.getByText(/1 phần =/)).toBeVisible();
  await rice.getByRole('button', { name: '0,5 phần', exact: true }).click();
  await expect(page.getByTestId('carb-total')).toHaveText('18,1 g');
  await rice.getByText('Chỉnh món này', { exact: true }).click();
  await rice.getByLabel('Tên thành phần', { exact: true }).fill('Cơm nhà nấu');
  const corrected = page.locator('article').filter({
    has: page.getByRole('heading', { name: 'Cơm nhà nấu', exact: true }),
  });
  await corrected
    .getByRole('combobox', { name: 'Món tham chiếu dinh dưỡng', exact: true })
    .selectOption('');
  await expect(
    corrected.getByLabel('Tên thành phần', { exact: true }),
  ).toHaveValue('Cơm nhà nấu');
  await expect(
    corrected.getByText('Carb chưa biết', { exact: false }),
  ).toBeVisible();
  await corrected
    .getByRole('combobox', { name: 'Món tham chiếu dinh dưỡng', exact: true })
    .selectOption('rice');
  await expect(
    corrected.getByLabel('Tên thành phần', { exact: true }),
  ).toHaveValue('Cơm nhà nấu');
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText('Cơm nhà nấu', { exact: true })).toBeVisible();
});

test('actual glyph fonts for composed and decomposed Vietnamese', async ({
  page,
  context,
}) => {
  await page.goto('/settings');
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const chars = [
    ...new Set([
      ...'ă â ê ô ơ ư đ ắ ằ ẳ ẵ ặ ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổỗ ộ ớ ờ ở ỡ ợ ứ ừử ữ ự Thiết lập Tuần của tôi',
    ]),
  ];
  await page.evaluate((chars) => {
    const container = document.createElement('section');
    container.id = 'font-probe';
    for (const family of [
      'Georgia, "Times New Roman", serif',
      'system-ui, "Segoe UI", Arial, sans-serif',
    ]) {
      const line = document.createElement('p');
      line.textContent = 'Thiết lập · Tuần của tôi · ă â ê ô ơ ư đ';
      line.style.fontFamily = family;
      line.style.fontSize = '32px';
      container.append(line);
      const decomposed = line.cloneNode(true) as HTMLElement;
      decomposed.textContent = line.textContent.normalize('NFD');
      container.append(decomposed);
      for (const [i, char] of chars.entries()) {
        const el = document.createElement('span');
        el.textContent = char;
        el.className = 'glyph-probe';
        el.dataset.character = char;
        el.style.fontFamily = family;
        el.style.fontSize = '32px';
        el.style.display = 'inline-block';
        container.append(el);
      }
    }
    document.querySelector('main')!.append(container);
  }, chars);
  const dom = await cdp.send('DOM.getDocument');
  const nodes = await cdp.send('DOM.querySelectorAll', {
    nodeId: dom.root.nodeId,
    selector: '.glyph-probe',
  });
  const fonts = [];
  for (const [i, nodeId] of nodes.nodeIds.entries())
    fonts.push({
      font: i < chars.length ? 'legacy' : 'system',
      character: chars[i % chars.length],
      ...(await cdp.send('CSS.getPlatformFontsForNode', { nodeId })),
    });
  writeFileSync(`${root}/glyph-fonts.json`, JSON.stringify(fonts, null, 2));
  await page
    .locator('#font-probe')
    .screenshot({ path: `${root}/font-comparison.png` });
  expect(
    fonts
      .filter((f) => f.font === 'system')
      .flatMap((f) => f.fonts)
      .some((f) => /Georgia|Times/.test(f.familyName)),
  ).toBe(false);
});

test('multi-component dish starts compact and still requires review', async ({
  page,
}) => {
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Nhập món thủ công', exact: true })
    .click();
  await page
    .getByRole('button', {
      name: '＋ Cơm phần gồm nhiều thành phần',
      exact: true,
    })
    .click();
  const cards = page.locator('.food-card');
  expect(await cards.count()).toBeGreaterThan(1);
  expect(await page.locator('.food-card[open]').count()).toBeLessThanOrEqual(1);
  const save = page.getByRole('button', { name: 'Lưu bữa ăn', exact: true });
  await expect(save).toBeDisabled();
  await page.screenshot({
    path: `${root}/multi-component-390.png`,
    fullPage: true,
  });
  for (const card of await cards.all()) {
    if (!(await card.evaluate((el) => el.hasAttribute('open'))))
      await card.locator(':scope > summary').click();
    await card
      .getByRole('button', { name: 'Xác nhận thành phần này', exact: true })
      .click();
  }
  await expect(save).toBeEnabled();
  await page.getByText('Thêm hoặc bỏ thành phần', { exact: true }).click();
  await page
    .getByRole('button', { name: '＋ Thành phần', exact: true })
    .click();
  const added = page.locator('.food-card').last();
  if (!(await added.evaluate((el) => el.hasAttribute('open'))))
    await added.locator(':scope > summary').click();
  await added
    .getByRole('button', { name: 'Xóa Thành phần tự nhập', exact: true })
    .click();
  await save.click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu', exact: true }),
  ).toBeVisible();
});
