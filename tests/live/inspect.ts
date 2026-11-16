/*
 * Live check on real YouTube (not part of CI).
 * Run: just build && node tests/live/inspect.ts [label] [light|dark]
 * Writes screenshots and metrics to test-results/live/<label>/.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { PRESETS, type PresetId } from '../../src/core/presets.ts';
import { userscriptInitScript } from '../support/userscript.ts';

const label = process.argv[2] || 'run';
const out = `test-results/live/${label}`;
const CHANNEL = 'https://www.youtube.com/@XGTVUA/videos';
mkdirSync(out, { recursive: true });

async function rejectConsent(page: Page): Promise<void> {
  if (!page.url().includes('consent.')) return;
  const reject = page.getByRole('button', { name: /reject all|відхилити все/i }).first();
  await reject.click({ timeout: 5000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
}

async function gridMetrics(page: Page) {
  return page.evaluate(() => {
    const guide = document.querySelector('tp-yt-app-drawer #contentContainer, ytd-guide-renderer');
    const grid = [...document.querySelectorAll<HTMLElement>('ytd-rich-grid-renderer')].find(
      (g) => g.offsetParent !== null,
    );
    const items = grid ? [...grid.querySelectorAll<HTMLElement>('ytd-rich-item-renderer')].slice(0, 12) : [];
    const rects = items.map((i) => i.getBoundingClientRect());
    const top = rects[0]?.top ?? 0;
    const row = rects.filter((r) => Math.abs(r.top - top) < 4);
    const contents = grid?.querySelector<HTMLElement>('#contents');
    return {
      guideRight: guide ? Math.round(guide.getBoundingClientRect().right) : null,
      guideVisible: !!(guide as HTMLElement | null)?.offsetParent,
      gridLeft: grid ? Math.round(grid.getBoundingClientRect().left) : null,
      gridRight: grid ? Math.round(grid.getBoundingClientRect().right) : null,
      firstItemLeft: row[0] ? Math.round(row[0].left) : null,
      lastItemRight: row.length ? Math.round(row[row.length - 1]?.right ?? 0) : null,
      perRow: row.length,
      itemWidth: row[0] ? Math.round(row[0].width) : null,
      contentsGap: contents ? getComputedStyle(contents).gap : null,
      itemsPerRowVar: grid ? getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-items-per-row') : null,
      itemMarginVar: grid ? getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-item-margin') : null,
      pageManagerLeft: Math.round(
        document.querySelector('ytd-page-manager')?.getBoundingClientRect().left ?? -1,
      ),
      viewport: `${innerWidth}x${innerHeight}`,
      chrome: ['ytd-masthead', 'ytd-guide-renderer'].map((sel) => {
        const el = document.querySelector(sel);
        const cs = el ? getComputedStyle(el) : null;
        return { sel, bg: cs?.backgroundColor, filter: cs?.backdropFilter, radius: cs?.borderRadius };
      }),
    };
  });
}

async function watchMetrics(page: Page) {
  return page.evaluate(() => {
    const cards = [
      ...document.querySelectorAll<HTMLElement>(
        'ytd-watch-metadata, ytd-comments#comments, [data-ytc-sec-card]',
      ),
    ];
    const nested = cards.filter((c) => cards.some((o) => o !== c && o.contains(c)));
    const below = document.querySelector('ytd-watch-flexy #below');
    const askButtons = [
      ...document.querySelectorAll<HTMLElement>('ytd-watch-metadata #actions :is(button, [role="button"])'),
    ]
      .filter(
        (b) =>
          b.getClientRects().length &&
          /^(ask|запитати)/i.test((b.getAttribute('aria-label') || b.textContent || '').trim()),
      )
      .map((b) => (b.closest('.ytc-ask') ? 'proxy' : 'native'));
    const player = document.querySelector<HTMLElement>('#movie_player');
    const outer = document.querySelector<HTMLElement>('#player-container-outer');
    return {
      belowChildren: below
        ? [...below.children].map((c) => ({
            tag: c.tagName.toLowerCase(),
            id: c.id || null,
            card: c.hasAttribute('data-ytc-sec-card'),
            contains: [...c.querySelectorAll('ytd-watch-metadata, ytd-comments')].map((n) =>
              n.tagName.toLowerCase(),
            ),
          }))
        : null,
      cards: cards.map((c) => `${c.tagName.toLowerCase()}${c.id ? `#${c.id}` : ''}`),
      nested: nested.map((c) => `${c.tagName.toLowerCase()}${c.id ? `#${c.id}` : ''}`),
      askButtons,
      playerRadius: player ? getComputedStyle(player).borderRadius : null,
      outerOverflow: outer ? getComputedStyle(outer).overflow : null,
      cinematics: !!document.querySelector('#cinematics canvas, #cinematics-container canvas'),
      playerBottom: player ? Math.round(player.getBoundingClientRect().bottom) : null,
      metaTop: Math.round(document.querySelector('ytd-watch-metadata')?.getBoundingClientRect().top ?? -1),
    };
  });
}

const browser = await chromium.launch();
const colorScheme = process.argv[3] === 'dark' ? 'dark' : 'light';
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, colorScheme });
// YouTube's own theme preference: f6=400 selects dark
if (colorScheme === 'dark') {
  await context.addCookies([{ name: 'PREF', value: 'f6=400', domain: '.youtube.com', path: '/' }]);
}
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(e.message));
// Optional 4th argument: performance | balanced | beauty
const preset = process.argv[4] as PresetId | undefined;
if (preset) {
  const stored = JSON.stringify({ ...PRESETS[preset], _v: 5 });
  await page.addInitScript(`localStorage.setItem('ytc:settings:v2', ${JSON.stringify(stored)});`);
}
await page.addInitScript("localStorage.setItem('ytc:debug', '1');");
await page.addInitScript(userscriptInitScript());

await page.goto(CHANNEL, { waitUntil: 'domcontentloaded' });
await rejectConsent(page);
await page.waitForSelector('ytd-rich-item-renderer', { state: 'attached', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: `${out}/grid.png` });
const grid = await gridMetrics(page);

// Frame times while scrolling the grid: the visual cost of a preset
await page.evaluate(() => {
  const w = window as any;
  w.__frames = [];
  let last = performance.now();
  const tick = (t: number) => {
    w.__frames.push(t - last);
    last = t;
    if (w.__frames.length < 600) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
await page.mouse.move(1000, 600);
for (let i = 0; i < 30; i++) {
  await page.mouse.wheel(0, 250);
  await page.waitForTimeout(40);
}
await page.waitForTimeout(300);
const frames = await page.evaluate(() => {
  const f = ((window as any).__frames as number[]).slice(5).sort((a, b) => a - b);
  const at = (q: number) => Math.round(f[Math.floor(f.length * q)] ?? 0);
  return {
    n: f.length,
    p50: at(0.5),
    p95: at(0.95),
    max: Math.round(f[f.length - 1] ?? 0),
    over33ms: f.filter((x) => x > 33).length,
  };
});
await page.evaluate(() => scrollTo(0, 0));
await page.waitForTimeout(500);

// Scroll with the cursor over the grid: cards must not pick up :hover while the page moves
await page.mouse.move(1000, 700);
await page.waitForTimeout(500);
const hoverBg = () =>
  page.evaluate(() => {
    const el = document.elementFromPoint(1000, 700)?.closest('ytd-rich-item-renderer');
    return el ? `${getComputedStyle(el).backgroundImage} ${getComputedStyle(el).backgroundColor}` : 'none';
  });
const idleHover = await hoverBg();
let during = { scrollingClass: false, hover: 'n/a', mastheadBlur: 'n/a' };
for (let i = 0; i < 12 && !during.scrollingClass; i++) {
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(25);
  during = {
    scrollingClass: await page.evaluate(() => document.documentElement.classList.contains('ytc-scrolling')),
    hover: await hoverBg(),
    mastheadBlur: await page.evaluate(
      () => getComputedStyle(document.querySelector('ytd-masthead') as Element).backdropFilter,
    ),
  };
}
await page.waitForTimeout(400);
const scroll = {
  idleHover,
  during,
  afterClass: await page.evaluate(() => document.documentElement.classList.contains('ytc-scrolling')),
};

const href = await page.locator('ytd-rich-item-renderer a[href^="/watch"]').first().getAttribute('href');
await page.goto(`https://www.youtube.com${href}`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('ytd-watch-metadata #actions', { timeout: 30000 });
await page.waitForTimeout(4000);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(3000);
await page.mouse.wheel(0, -900);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/watch.png` });
const watch = await watchMetrics(page);

const perf = await page.evaluate(() => (window as any).__ytcDiag?.().perf);
const report = {
  preset: preset ?? 'default',
  frames,
  perf,
  grid,
  scroll,
  watch,
  errors: errors.slice(0, 10),
};
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
