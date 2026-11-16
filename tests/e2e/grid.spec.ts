import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

// Home-like markup: a content-sized two-column container around a row-based rich grid
const item =
  '<ytd-rich-item-renderer rendered-from-rich-grid style="display:block;width:calc(100% / var(--ytd-rich-grid-items-per-row) - var(--ytd-rich-grid-item-margin, 16px) - .01px);height:200px"></ytd-rich-item-renderer>';
const rows = Array.from(
  { length: 4 },
  () => `<ytd-rich-grid-row><div id="contents">${item.repeat(3)}</div></ytd-rich-grid-row>`,
).join('');
const PAGE = `<!doctype html><html><head><style>
body { margin: 0 }
ytd-page-manager { display: block; margin-left: 240px }
ytd-browse { display: block }
ytd-two-column-browse-results-renderer { display: inline-block }
ytd-rich-grid-renderer { display: block; padding: 0 24px }
ytd-rich-grid-renderer > #contents { display: flex; flex-wrap: wrap }
</style></head><body><ytd-app><ytd-page-manager><ytd-browse page-subtype="home">
<ytd-two-column-browse-results-renderer><ytd-rich-grid-renderer><div id="contents">${rows}</div>
</ytd-rich-grid-renderer></ytd-two-column-browse-results-renderer></ytd-browse></ytd-page-manager></ytd-app></body></html>`;

test('home grid fits the window and does not grow itself', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.route('https://www.youtube.com/**', (r) => r.fulfill({ contentType: 'text/html', body: PAGE }));
  await page.addInitScript(userscriptInitScript());
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
    perRow: getComputedStyle(document.querySelector('ytd-rich-grid-renderer') as Element).getPropertyValue(
      '--ytd-rich-grid-items-per-row',
    ),
  }));
  expect(r.scrollWidth).toBeLessThanOrEqual(r.innerWidth);
  // (1920 - 240 - 2 * 24 + 24) / (320 + 24) -> 4 columns
  expect(r.perRow.trim()).toBe('4');
});

test('watched badge shows a check mark', async ({ page }) => {
  const html = `<!doctype html><html><body><ytd-app><ytd-browse>
<ytd-rich-item-renderer><yt-thumbnail-view-model style="display:block;width:300px;height:170px"></yt-thumbnail-view-model>
<ytd-thumbnail-overlay-resume-playback-renderer><div id="progress" style="width:100%"></div></ytd-thumbnail-overlay-resume-playback-renderer>
</ytd-rich-item-renderer></ytd-browse></ytd-app></body></html>`;
  await page.route('https://www.youtube.com/**', (r) => r.fulfill({ contentType: 'text/html', body: html }));
  await page.addInitScript(userscriptInitScript());
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(1000);
  const content = await page.evaluate(() => {
    const t = document.querySelector('[data-ytc-watched="full"] yt-thumbnail-view-model');
    return t ? getComputedStyle(t, '::before').content : null;
  });
  expect(content).toBe('"✓ Watched"'); // the space after a CSS escape is part of the escape
});
