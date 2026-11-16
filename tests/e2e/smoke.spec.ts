import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const PAGE = `<!doctype html><html><head><title>YouTube</title></head>
<body><ytd-app><ytd-page-manager></ytd-page-manager></ytd-app></body></html>`;

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: PAGE }),
  );
  await page.addInitScript(userscriptInitScript());
});

test('script starts without errors and adds root classes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('https://www.youtube.com/');
  await expect
    .poll(() =>
      page.evaluate(() => [...document.documentElement.classList].some((c) => c.startsWith('ytc-'))),
    )
    .toBe(true);
  expect(errors).toEqual([]);
});

test('Alt+Shift+Y opens the settings panel', async ({ page }) => {
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(500);
  await page.keyboard.press('Alt+Shift+KeyY');
  await expect(page.locator('.ytc-panel')).toBeVisible();
});
