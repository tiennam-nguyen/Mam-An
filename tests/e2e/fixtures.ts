import { test as base, expect } from '@playwright/test';
export { expect };
export type { Page } from '@playwright/test';
export const test = base.extend<{ browserHealth: void }>({
  browserHealth: [
    async ({ page }, use) => {
      const errors: string[] = [],
        failedUrls = new Set<string>();
      const consoleErrors: { text: string; url: string }[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('response', (response) => {
        if (response.status() >= 400) failedUrls.add(response.url());
      });
      page.on('requestfailed', (request) => failedUrls.add(request.url()));
      page.on('console', (message) => {
        if (message.type() === 'error')
          consoleErrors.push({
            text: message.text(),
            url: message.location().url,
          });
      });
      await use();
      expect(errors, 'Unhandled browser errors').toEqual([]);
      expect(
        consoleErrors.filter(
          (e) =>
            !(
              e.text.startsWith('Failed to load resource:') &&
              failedUrls.has(e.url)
            ),
        ),
        'Unexpected console errors',
      ).toEqual([]);
      if (!page.isClosed())
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          'Page must fit viewport',
        ).toBe(true);
    },
    { auto: true },
  ],
});
