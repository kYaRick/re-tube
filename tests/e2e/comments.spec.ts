import { expect, test } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const comment = (author: string, href: string, text: string, likes: string, extra = '') => `
<ytd-comment-view-model>
  <div id="header-author"><a id="author-text" href="${href}">${author}</a></div>
  <div id="content-text">${text}</div>
  <span id="vote-count-middle">${likes}</span>${extra}
</ytd-comment-view-model>`;

const PAGE = `<!doctype html><html><body><ytd-app>
<ytd-watch-metadata><div id="owner"><a href="/@owner">Owner</a></div></ytd-watch-metadata>
<ytd-comments id="comments">
${comment('Owner', '/@owner', 'Thanks all', '3')}
${comment('Fan', '/@fan', 'Nice video', '1,2 тис.')}
${comment('Pinned', '/@p', 'First', '0', '<ytd-pinned-comment-badge-renderer></ytd-pinned-comment-badge-renderer>')}
${comment('Hearted', '/@h', 'Heart me', '0', '<ytd-creator-heart-renderer></ytd-creator-heart-renderer>')}
${comment('Bot', '/@bot', 'write me in telegram', '0')}
</ytd-comments></ytd-app></body></html>`;

const run = async (page: import('@playwright/test').Page, script: string) => {
  await page.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: PAGE }),
  );
  await page.addInitScript(script);
  await page.goto('https://www.youtube.com/watch?v=x');
  await page.waitForTimeout(1200);
  return page.evaluate(() =>
    [...document.querySelectorAll('ytd-comment-view-model')].map((c) => ({
      mark: c.getAttribute('data-ytc-mark'),
      chip: c.querySelector('.ytc-chip')?.textContent ?? null,
      hidden: c.hasAttribute('data-ytc-hidden'),
    })),
  );
};

test('comment marks, chips and spam filter', async ({ page }) => {
  const r = await run(page, userscriptInitScript());
  expect(r).toEqual([
    { mark: 'creator', chip: null, hidden: false },
    { mark: null, chip: 'Top', hidden: false },
    { mark: 'pinned', chip: null, hidden: false },
    { mark: 'hearted', chip: null, hidden: false },
    { mark: null, chip: null, hidden: true },
  ]);
});

test('same result as v2.9.0', async ({ page }) => {
  const legacy = await run(page, userscriptInitScript('legacy/youtube-classic-plus.user.js'));
  await page.unrouteAll();
  const page2 = await page.context().newPage();
  const current = await run(page2, userscriptInitScript());
  expect(current).toEqual(legacy);
});
