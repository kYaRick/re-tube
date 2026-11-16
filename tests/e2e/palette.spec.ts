import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const PAGE =
  '<!doctype html><html><body><ytd-app><ytd-page-manager></ytd-page-manager></ytd-app></body></html>';

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: PAGE }),
  );
  await page.addInitScript(userscriptInitScript());
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(500);
});

test('Ctrl+K finds a setting and Enter toggles it', async ({ page }) => {
  await page.keyboard.press('Control+KeyK');
  await expect(page.locator('.ytc-cmd-box')).toBeVisible();
  await page.keyboard.type('hide shorts');
  await expect(page.locator('.ytc-cmd').first()).toContainText('Turn on: Hide Shorts');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ytc-cmd-box')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains('ytc-no-shorts'))).toBe(true);
});

test('presets and actions are listed; Esc closes', async ({ page }) => {
  await page.keyboard.press('Alt+Shift+KeyK');
  await page.keyboard.type('preset perf');
  await expect(page.locator('.ytc-cmd')).toHaveCount(1);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => localStorage.getItem('ytc:settings:v2'))).toContain(
    '"preset":"performance"',
  );

  await page.keyboard.press('Control+KeyK');
  await page.keyboard.type('open settings');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ytc-panel')).toBeVisible();
  await page.keyboard.press('Escape');

  await page.keyboard.press('Control+KeyK');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ytc-cmd-box')).toHaveCount(0);
});
