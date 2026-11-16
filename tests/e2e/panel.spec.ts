import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const PAGE = `<!doctype html><html><body><ytd-app><ytd-page-manager></ytd-page-manager></ytd-app></body></html>`;

async function panelFacts(page: import('@playwright/test').Page, script: string) {
  await page.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: PAGE }),
  );
  await page.addInitScript(script);
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(600);
  await page.keyboard.press('Alt+Shift+KeyY');
  await page.waitForTimeout(400);
  return page.evaluate(() => ({
    rows: document.querySelectorAll('.ytc-panel .ytc-row').length,
    titles: [...document.querySelectorAll('.ytc-panel .ytc-row-title')].map((e) => e.textContent),
    switches: document.querySelectorAll('.ytc-panel input.ytc-switch').length,
    groups: document.querySelectorAll('.ytc-panel .ytc-group').length,
  }));
}

test('settings panel matches v2.9.0', async ({ browser }) => {
  const legacy = await panelFacts(
    await browser.newPage(),
    userscriptInitScript('legacy/youtube-classic-plus.user.js'),
  );
  const current = await panelFacts(await browser.newPage(), userscriptInitScript());
  expect(current.groups).toBe(legacy.groups); // the preset lives in the header, not in a section
  expect(current.switches).toBe(legacy.switches + 4); // animations, ambient, subscriptions window, command palette
  // v2.9.0 never rendered the shortcut rows (nested arrays passed to h()); ReTube does
  const shortcuts = [
    'Open or close settings',
    'Jump to comments',
    'Back to the video',
    'Jump to recommendations (portrait)',
    'Close settings or clear comment search',
  ];
  // ReTube adds the animations, ambient and subscriptions window rows
  const added = ['Animations', 'Ambient glow around the player', 'Subscriptions window', 'Command palette'];
  expect(current.titles.filter((t) => !shortcuts.includes(t ?? '') && !added.includes(t ?? ''))).toEqual(
    legacy.titles,
  );
  expect(current.titles).toEqual(expect.arrayContaining(shortcuts));
});

test('switching a setting is saved', async ({ page }) => {
  await panelFacts(page, userscriptInitScript());
  await page.locator('.ytc-panel input.ytc-switch').first().click();
  const saved = await page.evaluate(() => localStorage.getItem('ytc:settings:v2'));
  expect(saved).toContain('"classicLayout":false');
});

test('window: Re-Tube title, tabs and search across sections', async ({ page }) => {
  await panelFacts(page, userscriptInitScript());
  await expect(page.locator('#ytc-title')).toHaveText('Re-Tube');
  await expect(page.locator('.ytc-version')).toHaveText(/^v\d+\.\d+\.\d+$/);

  // One section at a time
  await expect(page.locator('.ytc-group:visible')).toHaveCount(1);
  await page.locator('.ytc-tab', { hasText: 'Comments' }).click();
  await expect(page.locator('.ytc-group:visible h3')).toHaveText('Comments');

  // Arrow keys move between tabs
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.ytc-tab[aria-selected="true"]')).toContainText('Keywords');

  // A query shows matches from every section
  await page.locator('.ytc-panel .ytc-psearch-input').fill('shorts');
  await expect(page.locator('.ytc-group:visible').first()).toBeVisible();
  expect(await page.locator('.ytc-group:visible').count()).toBeGreaterThanOrEqual(1);
  await expect(page.locator('.ytc-row:visible', { hasText: 'Hide Shorts' })).toBeVisible();

  // Preset in the header
  await page.locator('.ytc-head [data-value="performance"]').click();
  await expect(page.locator('.ytc-head [data-value="performance"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('ytc:settings:v2'))).toContain(
    '"preset":"performance"',
  );

  await page.keyboard.press('Escape');
  await expect(page.locator('.ytc-panel')).toBeHidden();
});
