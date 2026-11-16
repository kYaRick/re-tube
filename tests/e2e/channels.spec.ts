import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const entry = (href: string, name: string) => `
<ytd-guide-entry-renderer><a id="endpoint" href="${href}" title="${name}">
<yt-img-shadow><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></yt-img-shadow>
<yt-formatted-string class="title">${name}</yt-formatted-string></a></ytd-guide-entry-renderer>`;

const PAGE = `<!doctype html><html><body><ytd-app>
<ytd-guide-renderer>
<ytd-guide-section-renderer>${entry('/', 'Home')}${entry('/feed/history', 'History')}
<ytd-guide-collapsible-entry-renderer><div id="expander-item" role="button">Show more</div></ytd-guide-collapsible-entry-renderer>
</ytd-guide-section-renderer>
<ytd-guide-section-renderer>
${entry('/@dou', 'DOU')}${entry('/@primetime', 'The PrimeTime')}${entry('/@xgtv', 'XGTV UA')}${entry('/channel/UCabc', 'Українська студія')}
<ytd-guide-collapsible-entry-renderer><div id="expander-item" role="button">Show more</div></ytd-guide-collapsible-entry-renderer>
</ytd-guide-section-renderer>
</ytd-guide-renderer><ytd-page-manager></ytd-page-manager></ytd-app></body></html>`;

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: PAGE }),
  );
  await page.addInitScript(userscriptInitScript());
  await page.goto('https://www.youtube.com/');
  await page.waitForTimeout(500);
});

test('Show more under Subscriptions opens a searchable window', async ({ page }) => {
  await page.locator('ytd-guide-section-renderer').nth(1).locator('#expander-item').click();
  await expect(page.locator('.ytc-chan-modal')).toBeVisible();
  await expect(page.locator('.ytc-chan:visible')).toHaveCount(4);

  await page.locator('.ytc-chan-modal input').fill('укр'); // Cyrillic, case-insensitive
  await expect(page.locator('.ytc-chan:visible')).toHaveCount(1);
  await page.locator('.ytc-chan-modal input').fill('zzz');
  await expect(page.locator('.ytc-psearch-empty')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.ytc-chan-modal')).toHaveCount(0);
});

test('other sections keep YouTube behaviour', async ({ page }) => {
  await page.locator('ytd-guide-section-renderer').first().locator('#expander-item').click();
  await expect(page.locator('.ytc-chan-modal')).toHaveCount(0);
});

test('Enter opens the first match through YouTube navigation', async ({ page }) => {
  await page.evaluate(() => {
    for (const a of document.querySelectorAll('a#endpoint')) {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        (window as unknown as { __opened: string }).__opened = a.getAttribute('href') ?? '';
      });
    }
  });
  await page.locator('ytd-guide-section-renderer').nth(1).locator('#expander-item').click();
  await page.locator('.ytc-chan-modal input').fill('prime');
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as unknown as { __opened: string }).__opened)).toBe('/@primetime');
  await expect(page.locator('.ytc-chan-modal')).toHaveCount(0);
});

// Real guides wrap Subscriptions in ytd-guide-collapsible-section-entry-renderer with a header link
const NESTED = `<!doctype html><html><body><ytd-app><ytd-guide-renderer><div id="sections">
<ytd-guide-section-renderer>${entry('/', 'Home')}${entry('/feed/subscriptions', 'Subscriptions')}</ytd-guide-section-renderer>
<ytd-guide-section-renderer><div id="items">
<ytd-guide-collapsible-section-entry-renderer>
  <div id="header"><a href="/feed/channels" id="header-link">Subscriptions &gt;</a></div>
  <div id="section-items">${entry('/@dou', 'DOU')}${entry('/@primetime', 'The PrimeTime')}</div>
  <ytd-guide-collapsible-entry-renderer>
    <tp-yt-paper-item id="expander-item" role="button"><yt-formatted-string>Show more</yt-formatted-string></tp-yt-paper-item>
    <div id="expandable-items" hidden>${entry('/@xgtv', 'XGTV UA')}${entry('/channel/UCx', 'NetworkChuck')}</div>
    <tp-yt-paper-item id="collapser-item" role="button" hidden>Show fewer</tp-yt-paper-item>
  </ytd-guide-collapsible-entry-renderer>
</ytd-guide-collapsible-section-entry-renderer>
</div></ytd-guide-section-renderer>
</div></ytd-guide-renderer></ytd-app></body></html>`;

test.describe('nested guide markup', () => {
  test.beforeEach(async ({ page }) => {
    await page.unrouteAll();
    await page.route('https://www.youtube.com/**', (r) =>
      r.fulfill({ contentType: 'text/html; charset=utf-8', body: NESTED }),
    );
    // YouTube's own tap handler expands the list; it must not run
    await page.addInitScript(() => {
      document.addEventListener(
        'mousedown',
        (e) => {
          if ((e.target as Element).closest?.('#expander-item')) (window as any).__expanded = true;
        },
        true,
      );
    });
    await page.goto('https://www.youtube.com/');
    await page.waitForTimeout(500);
  });

  test('Show more opens the window with all channels, YouTube does not expand', async ({ page }) => {
    await page.locator('#expander-item').click();
    await expect(page.locator('.ytc-chan-modal')).toBeVisible();
    await expect(page.locator('.ytc-chan')).toHaveCount(4);
    expect(await page.evaluate(() => (window as any).__expanded ?? false)).toBe(false);
  });

  test('the Subscriptions header opens the window', async ({ page }) => {
    await page.locator('#header-link').click();
    await expect(page.locator('.ytc-chan-modal')).toBeVisible();
  });

  test('the main Subscriptions feed item keeps YouTube behaviour', async ({ page }) => {
    await page
      .locator('a[href="/feed/subscriptions"]')
      .click({ noWaitAfter: true })
      .catch(() => {});
    await expect(page.locator('.ytc-chan-modal')).toHaveCount(0);
  });
});

test.describe('new videos', () => {
  const fresh = (href: string, name: string, isNew: boolean) => `
<ytd-guide-entry-renderer><a id="endpoint" href="${href}"><yt-formatted-string class="title">${name}</yt-formatted-string></a>
<div id="newness-dot" ${isNew ? '' : 'style="display:none"'}></div></ytd-guide-entry-renderer>`;
  const DOTS = `<!doctype html><html><body><ytd-app><ytd-guide-renderer><ytd-guide-section-renderer>
${fresh('/@a', 'Alpha', false)}${fresh('/@b', 'Beta', true)}
<ytd-guide-collapsible-entry-renderer><div id="expander-item" role="button">Show more</div>
<div id="expandable-items" hidden>${fresh('/@c', 'Gamma', false)}${fresh('/@d', 'Delta', true)}</div>
</ytd-guide-collapsible-entry-renderer>
</ytd-guide-section-renderer></ytd-guide-renderer></ytd-app></body></html>`;

  test('channels with new videos come first, with a dot and an Only new filter', async ({ page }) => {
    await page.unrouteAll();
    await page.route('https://www.youtube.com/**', (r) =>
      r.fulfill({ contentType: 'text/html; charset=utf-8', body: DOTS }),
    );
    await page.goto('https://www.youtube.com/');
    await page.waitForTimeout(500);
    await page.locator('#expander-item').click();
    await expect(page.locator('.ytc-chan-name')).toHaveText(['Beta', 'Delta', 'Alpha', 'Gamma']);
    await expect(page.locator('.ytc-chan-dot')).toHaveCount(2); // Delta is collapsed and still detected
    await page.locator('.ytc-chan-new').click();
    await expect(page.locator('.ytc-chan:visible .ytc-chan-name')).toHaveText(['Beta', 'Delta']);
    await expect(page.locator('.ytc-chan-count')).toHaveText('2 of 4');
  });
});
