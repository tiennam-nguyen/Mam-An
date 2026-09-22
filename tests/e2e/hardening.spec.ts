import { test, expect } from './fixtures';
import { seedDatabase, readDatabase } from './storage';
import { readFileSync } from 'node:fs';
import { migrateV1Meal } from '../../src/infrastructure/persistence/migrateV1';
import {
  toMealRow,
  toGlucoseRow,
} from '../../src/infrastructure/persistence/persistenceSchemas';
import { safeExplanation } from '../fixtures/realV2Api';
const oldMeal = JSON.parse(
  readFileSync('tests/fixtures/persisted-v1-meal.json', 'utf8'),
) as typeof import('../fixtures/persisted-v1-meal.json');
const meal = () => {
  const m = migrateV1Meal(structuredClone(oldMeal)).value;
  m.entries.forEach((e) =>
    e.components.forEach((c) => {
      if (c.foodId === 'rice') c.role = 'STARCH';
    }),
  );
  return m;
};

test('physical v1 browser upgrade preserves snapshots and linked glucose after reload', async ({
  page,
}) => {
  const row = structuredClone(oldMeal);
  row.value.items[0]!.userCorrected = true;
  row.value.items[0]!.includedInTotal = false;
  const glucose = {
    id: 'legacy-g',
    measuredAt: '2026-09-19T07:00:00.000Z',
    mealId: row.id,
    isDemo: 1,
    schemaVersion: 1,
    value: {
      id: 'legacy-g',
      measuredAt: '2026-09-19T07:00:00.000Z',
      mealId: row.id,
      isDemo: true,
      value: 5.5,
      unit: 'MMOL_L',
      timingTag: 'AFTER_MEAL',
      note: null,
    },
  };
  await seedDatabase(page, { meals: [row], glucoseReadings: [glucose] }, 10);
  await page.goto('/history');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await page.locator('.history-row').click();
  await expect(page.locator('.big-number')).toContainText('32,8');
  await expect(page.getByText('5,5 mmol/L', { exact: true })).toBeVisible();
  await page.reload();
  const saved = await readDatabase(page);
  expect(saved.version).toBe(20);
  expect(saved.tables.meals![0].value.items).toEqual(row.value.items);
  expect(saved.tables.meals![0].value.entries[0].components[0]).toMatchObject({
    source: 'MIGRATION',
    userCorrected: true,
    includedInTotal: false,
  });
  expect(saved.tables.glucoseReadings).toEqual([glucose]);
  await page.screenshot({
    path: 'verification/v0.2/screenshots/migrated-detail.png',
    fullPage: true,
  });
});
test('physical malformed migration stays v1, shows recovery message, and preserves all rows on retry', async ({
  page,
}) => {
  const broken = structuredClone(oldMeal);
  broken.value.items[1]!.itemId = broken.value.items[0]!.itemId;
  await seedDatabase(
    page,
    { meals: [broken], meta: [{ key: 'sentinel', value: 'preserved' }] },
    10,
  );
  for (let i = 0; i < 2; i++) {
    await page.goto('/history');
    await expect(page.getByRole('alert').first()).toContainText(/dữ liệu/i);
    const saved = await readDatabase(page);
    expect(saved.version).toBe(10);
    expect(saved.tables.meals).toEqual([broken]);
    expect(saved.tables.meta).toEqual([
      { key: 'sentinel', value: 'preserved' },
    ]);
  }
});

test('favourite persists and reuse edits a new meal without mutating the saved original', async ({
  page,
}) => {
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
    .click();
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
  ).toBeVisible();
  const original = (await readDatabase(page)).tables.meals![0];
  await page.getByRole('button', { name: 'Đánh dấu yêu thích' }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ yêu thích' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Bỏ yêu thích' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Dùng lại làm bữa mới' }).click();
  await page
    .getByLabel('Tên thành phần', { exact: true })
    .first()
    .fill('Món mới của tôi');
  expect((await readDatabase(page)).tables.meals).toEqual([original]);
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
  ).toBeVisible();
  const rows = (await readDatabase(page)).tables.meals!;
  expect(rows).toHaveLength(2);
  expect(rows.find((r) => r.id === original.id)).toEqual(original);
  await page.goto('/history');
  await page.getByLabel('Lọc nhật ký').selectOption('favourites');
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).not.toContainText(
    'Món mới của tôi',
  );
});

test('favourite write failure is visible and allows retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    let once = true;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'settings' && once) {
        once = false;
        throw new DOMException('synthetic failure', 'QuotaExceededError');
      }
      return put.apply(this, args);
    };
  });
  await page.goto('/meal/new');
  await page
    .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
    .click();
  await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
  await page.getByRole('button', { name: 'Đánh dấu yêu thích' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu yêu thích' }).click();
  await expect(
    page.getByRole('button', { name: 'Bỏ yêu thích' }),
  ).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

for (const [quality, minutes, expected] of [
  ['sufficient', [120, 120, 120], '3 bữa tương tự'],
  ['sparse', [120], 'Chưa đủ'],
  ['noncomparable', [30, 60, 90], 'chưa tương đồng'],
  ['none', [], 'Chưa có số đo'],
] as const) {
  test(`personal ${quality} stays in real mode despite abundant demo data; report respects selected period`, async ({
    page,
  }) => {
    const meals = [0, 1, 2].map((i) => ({
      ...meal(),
      id: `user-${i}` as never,
      source: 'FILE' as const,
      isDemo: false,
      createdAt: `2026-09-${17 + i}T05:00:00.000Z`,
    }));
    const demo = meals.map((m) => ({
      ...m,
      id: `demo-${m.id}` as never,
      isDemo: true,
    }));
    const readings = [
      ...meals.flatMap((m, i) =>
        minutes[i] === undefined
          ? []
          : [
              toGlucoseRow({
                id: `g-${i}` as never,
                mealId: m.id,
                measuredAt: new Date(
                  Date.parse(m.createdAt) + minutes[i]! * 60000,
                ).toISOString(),
                value: 100 + i * 10,
                unit: 'MG_DL',
                timingTag: 'AFTER_MEAL',
                note: null,
                isDemo: false,
              }),
            ],
      ),
      ...demo.map((m, i) =>
        toGlucoseRow({
          id: `demo-g-${i}` as never,
          mealId: m.id,
          measuredAt: new Date(
            Date.parse(m.createdAt) + 120 * 60000,
          ).toISOString(),
          value: 999,
          unit: 'MG_DL',
          timingTag: 'AFTER_MEAL',
          note: null,
          isDemo: true,
        }),
      ),
    ];
    await seedDatabase(page, {
      meals: [...meals, ...demo].map(toMealRow),
      glucoseReadings: readings,
    });
    await page.goto('/meal/new');
    await page
      .getByRole('button', { name: 'Nhập món thủ công', exact: true })
      .click();
    for (const name of ['Cơm trắng', 'Trứng gà luộc', 'Dưa chuột'])
      await page
        .getByRole('button', { name: `＋ ${name}`, exact: true })
        .click();
    await expect(page.getByText(new RegExp(expected)).first()).toBeVisible();
    await expect(page.locator('body')).not.toContainText('999');
    await page.goto('/report');
    await page.getByLabel('Ngày kết thúc khoảng 7 ngày').fill('2026-09-19');
    await expect(page.locator('.metric-grid .big-number')).toHaveText([
      '6',
      String(minutes.length + 3),
    ]);
    await page.getByLabel('Ngày kết thúc khoảng 7 ngày').fill('2020-01-01');
    await expect(page.locator('.metric-grid .big-number')).toHaveText([
      '0',
      '0',
    ]);
  });
}

test.describe('optional generated explanations', () => {
  test.use({ serviceWorkers: 'block' });
  test('stalled explanation reaches client deadline and returns to the local template', async ({
    page,
  }) => {
    await page.clock.install();
    await page.route('**/api/v2/explanations/generate', () => {});
    await page.goto('/meal/new');
    await page
      .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
      .click();
    await page
      .getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'Đang diễn đạt…', exact: true }),
    ).toBeDisabled();
    await page.clock.fastForward(30001);
    await expect(
      page.getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true }),
    ).toBeEnabled();
    await expect(
      page.getByText('Mẫu trên thiết bị', { exact: true }),
    ).toBeVisible();
  });
  for (const kind of [
    'valid',
    'number',
    'reference',
    'medical',
    'malformed',
    'unavailable',
  ])
    test(`generated ${kind} is validated before display`, async ({ page }) => {
      let calls = 0;
      await page.route('**/api/v2/explanations/generate', (route) => {
        calls++;
        expect(JSON.stringify(route.request().postDataJSON())).not.toMatch(
          /PRIVATE_NOTE|glucoseObservations|premealTrace|imagePreviewUrl/,
        );
        return route.fulfill(
          kind === 'malformed'
            ? { body: '{', contentType: 'application/json' }
            : kind === 'unavailable'
              ? {
                  status: 503,
                  json: { error: { code: 'CAPABILITY_UNAVAILABLE' } },
                }
              : {
                  json: {
                    explanation: {
                      ...safeExplanation,
                      ...(kind === 'number'
                        ? { summaryVi: 'Có 999 g carb.' }
                        : kind === 'reference'
                          ? { evidenceRefs: ['wrong'] }
                          : kind === 'medical'
                            ? { summaryVi: 'Bạn mắc bệnh tiểu đường.' }
                            : {}),
                    },
                  },
                },
        );
      });
      await page.goto('/meal/new');
      await page
        .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
        .click();
      await page.getByLabel('Ghi chú', { exact: true }).fill('PRIVATE_NOTE');
      await page
        .getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByText(
          kind === 'valid'
            ? 'Diễn đạt tự động từ dữ liệu'
            : 'Mẫu trên thiết bị',
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/999|mắc bệnh/);
      expect(calls).toBe(1);
    });
  for (const action of ['edit-and-B', 'navigate', 'apply', 'discard', 'cancel'])
    test(`late explanation A cannot survive ${action}`, async ({ page }) => {
      let release!: () => void, reached!: () => void;
      const held = new Promise<void>((resolve) => {
          release = resolve;
        }),
        requested = new Promise<void>((resolve) => {
          reached = resolve;
        });
      let calls = 0;
      await page.route('**/api/v2/explanations/generate', async (route) => {
        const first = ++calls === 1;
        if (first) {
          reached();
          await held;
        }
        await route
          .fulfill({
            json: {
              explanation: {
                ...safeExplanation,
                summaryVi: first
                  ? 'Kết quả cũ phải bỏ.'
                  : 'Kết quả mới đang xem.',
              },
            },
          })
          .catch(() => {});
      });
      await page.goto('/meal/new');
      await page
        .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
        .click();
      if (action === 'apply' || action === 'discard') {
        await page
          .getByRole('button', { name: 'Thử phương án khác', exact: true })
          .click();
        await page
          .getByRole('button', { name: /^0.5 ×/ })
          .first()
          .click();
      }
      await page
        .getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true })
        .click();
      await requested;
      if (action === 'edit-and-B') {
        await page
          .getByRole('button', { name: '0.5 phần', exact: true })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'Diễn đạt lại bằng AI', exact: true })
          .click();
        await expect(
          page.getByText('Kết quả mới đang xem.', { exact: true }),
        ).toBeVisible();
      }
      if (action === 'navigate')
        await page.getByRole('link', { name: 'Nhật ký', exact: true }).click();
      if (action === 'apply')
        await page
          .getByRole('button', { name: 'Áp dụng vào bữa chưa lưu' })
          .click();
      if (action === 'discard')
        await page
          .getByRole('button', { name: 'Bỏ phương án', exact: true })
          .click();
      if (action === 'cancel')
        await page.getByRole('button', { name: 'Hủy bữa chưa lưu' }).click();
      release();
      await page.waitForTimeout(100);
      await expect(
        page.getByText('Kết quả cũ phải bỏ.', { exact: true }),
      ).toHaveCount(0);
      if (action === 'edit-and-B')
        await expect(
          page.getByText('Kết quả mới đang xem.', { exact: true }),
        ).toBeVisible();
    });
});

for (const width of [320, 390, 1366])
  test(`large text product sweep ${width}px: all routes and controls fit`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/settings');
    await page.getByLabel('Chữ lớn', { exact: true }).click();
    await expect(page.getByLabel('Chữ lớn', { exact: true })).toBeChecked();
    await page.reload();
    await expect(page.getByLabel('Chữ lớn', { exact: true })).toBeChecked();
    for (const route of [
      '/',
      '/meal/new',
      '/history',
      '/glucose/new',
      '/week',
      '/report',
      '/settings',
      '/demo',
      '/about',
    ]) {
      await page.goto(route);
      await expect(page.locator('h1')).toBeVisible();
      expect(
        await page.evaluate(() =>
          [...document.querySelectorAll('body *')]
            .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
            .map((e) => ({
              tag: e.tagName,
              class: e.className,
              width: e.getBoundingClientRect().width,
              right: e.getBoundingClientRect().right,
            })),
        ),
        route,
      ).toEqual([]);
      await expect(page.locator('body')).not.toContainText(
        /TIER_[12]|SUFFICIENT_FOR_DESCRIPTION|knowledge-v1|MockLLM|AI_TIMEOUT|STARCH/,
      );
    }
    await page.goto('/meal/new');
    await page
      .getByRole('button', { name: 'Dùng bữa ăn mẫu', exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `verification/v0.2/screenshots/review-large-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole('button', { name: 'Thử phương án khác', exact: true })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('button', { name: 'Bỏ phương án', exact: true })
      .click();
    await page.getByRole('button', { name: 'Lưu bữa ăn', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Bữa ăn đã lưu' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
