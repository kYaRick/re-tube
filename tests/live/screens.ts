/*
 * Screenshots of ReTube's own UI on a mock page (no third-party content), for the docs.
 * Run: just screens (build + this script). Images are cropped to ReTube's own windows.
 */
import { mkdirSync } from 'node:fs';
import { chromium, type Page } from '@playwright/test';
import { userscriptInitScript } from '../support/userscript.ts';

const out = process.argv[2] || 'docs/src/assets/screens';
mkdirSync(out, { recursive: true });

const avatar = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="hsl(${hue} 70% 55%)"/></svg>`)}`;
const names = [
  'Design Notes',
  'Kyiv Tech Talks',
  'Lo-fi Studio',
  'Open Source Weekly',
  'Space Explained',
  'Retro Games UA',
  'Home Lab',
  'Cooking at Night',
  'Daily Linux',
  'Music Theory',
  'Bike Repair',
  'Indie Dev Log',
];
const entry = (i: number) =>
  `<ytd-guide-entry-renderer><a id="endpoint" href="/@c${i}"><yt-img-shadow><img src="${avatar(i * 29)}"></yt-img-shadow><yt-formatted-string class="title">${names[i]}</yt-formatted-string></a>${i % 3 === 0 ? '<div id="newness-dot"></div>' : '<div id="newness-dot" style="display:none"></div>'}</ytd-guide-entry-renderer>`;

const page = (dark: boolean) => `<!doctype html><html ${dark ? 'dark' : ''} style="font-size:10px">
<body style="margin:0;background:${dark ? '#0f0f0f' : '#fff'};color:${dark ? '#f1f1f1' : '#0f0f0f'};font-family:Roboto,Arial,sans-serif">
<style>a{color:inherit;text-decoration:none}</style>
<ytd-app><ytd-masthead><div id="end"><div id="buttons"></div></div></ytd-masthead>
<ytd-guide-renderer style="display:block;width:220px"><ytd-guide-section-renderer>
${names.map((_, i) => entry(i)).join('')}
<ytd-guide-collapsible-entry-renderer><div id="expander-item" role="button">Show more</div></ytd-guide-collapsible-entry-renderer>
</ytd-guide-section-renderer></ytd-guide-renderer><ytd-page-manager></ytd-page-manager></ytd-app></body></html>`;

// Mock watch page: player, metadata, comments with creator / pinned / hearted marks, related videos
const thumb = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 55%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360} 60% 30%)"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><path d="M146 70l34 20-34 20z" fill="#fff" fill-opacity=".85"/></svg>`)}`;
type Row = [string, string, string, string];
const related: Row[] = [
  ['Building a quiet home server', 'Home Lab', '84K views · 2 days ago', '18:42'],
  ['Why Linux desktops feel faster', 'Daily Linux', '212K views · 1 week ago', '12:05'],
  ['Open source news of the week', 'Open Source Weekly', '31K views · 5 hours ago', '24:10'],
  ['How rockets land themselves', 'Space Explained', '1.2M views · 3 weeks ago', '16:37'],
  ['Lo-fi beats for focused work', 'Lo-fi Studio', '540K views · 1 month ago', '1:02:11'],
  ['Repair a bike chain in 5 minutes', 'Bike Repair', '67K views · 4 days ago', '5:12'],
  ['Making a game in 48 hours', 'Indie Dev Log', '98K views · 6 days ago', '21:48'],
];
const lockup = ([title, channel, meta, time]: Row, i: number) => `
<yt-lockup-view-model><div class="yt-lockup-view-model yt-lockup-view-model--horizontal" style="display:flex;gap:8px;margin-bottom:8px">
  <a class="yt-lockup-view-model__content-image" href="/watch?v=r${i}" style="position:relative;display:block;width:168px;flex:none">
    <img src="${thumb(i * 47 + 200)}" style="width:100%;aspect-ratio:16/9;border-radius:8px;display:block">
    <span style="position:absolute;right:4px;bottom:4px;background:rgba(0,0,0,.8);color:#fff;font-size:1.2rem;padding:1px 4px;border-radius:4px">${time}</span>
  </a>
  <div class="yt-lockup-view-model__metadata"><a class="yt-lockup-metadata-view-model__title" href="/watch?v=r${i}" style="display:block;font-size:1.4rem;font-weight:500;line-height:2rem">${title}</a>
  <div style="color:#aaa;font-size:1.2rem;line-height:1.8rem">${channel}<br>${meta}</div></div>
</div></yt-lockup-view-model>`;
const comments: Row[] = [
  [
    'KyivTechTalks',
    'Thanks for watching! Timestamps are in the description.',
    '214',
    '<ytd-pinned-comment-badge-renderer></ytd-pinned-comment-badge-renderer>',
  ],
  [
    'Olena',
    'Clear explanation, finally got it working on my home server.',
    '1.2K',
    '<ytd-creator-heart-renderer></ytd-creator-heart-renderer>',
  ],
  ['KyivTechTalks', 'Part two comes out next Friday.', '96', ''],
  ['Marko', 'Could you do a video about backups next?', '38', ''],
  ['Taras', 'The part about power usage was very useful.', '12', ''],
];
const commentThread = ([author, text, likes, extra]: Row, i: number) => `
<ytd-comment-thread-renderer><ytd-comment-view-model id="comment" style="display:flex;gap:12px">
  <img src="${avatar(i * 61 + 20)}" style="width:40px;height:40px;border-radius:50%">
  <div><div id="header-author" style="font-size:1.3rem"><a id="author-text" href="/@${author.toLowerCase()}" style="font-weight:500">@${author}</a> <span style="color:#aaa">${i === 0 ? '1 hour' : `${i + 1} hours`} ago</span></div>
  <div id="content-text" style="font-size:1.4rem;line-height:2rem;margin:2px 0 6px">${text}</div>
  <div style="color:#aaa;font-size:1.2rem;margin-bottom:6px">👍 <span id="vote-count-middle">${likes}</span> &nbsp; Reply</div>${extra}</div>
</ytd-comment-view-model></ytd-comment-thread-renderer>`;
const watchPage = `<!doctype html><html dark style="font-size:10px">
<body style="margin:0;background:#0f0f0f;color:#f1f1f1;font-family:Roboto,Arial,sans-serif">
<style>a{color:inherit;text-decoration:none}</style>
<ytd-app><ytd-masthead><div id="end"><div id="buttons"></div></div></ytd-masthead><ytd-page-manager>
<ytd-watch-flexy style="display:block;padding:24px">
<div id="columns" style="display:flex;gap:24px;max-width:1280px;margin:0 auto">
<div id="primary" style="flex:1;min-width:0"><div id="primary-inner">
  <div id="player"><div id="movie_player" style="aspect-ratio:16/9;background:url('${thumb(230)}') center/cover"></div></div>
  <div id="below">
  <ytd-watch-metadata style="display:block">
    <div id="title"><h1 style="font-size:2rem;margin:0 0 8px">Home server on a budget: the full build</h1></div>
    <div id="top-row" style="display:flex;align-items:center;gap:12px"><img src="${avatar(30)}" style="width:40px;height:40px;border-radius:50%">
      <div id="owner"><a href="/@kyivtechtalks" style="font-weight:500;font-size:1.6rem">Kyiv Tech Talks</a><div style="color:#aaa;font-size:1.2rem">128K subscribers</div></div></div>
    <div id="description" class="ytd-watch-metadata" style="margin-top:12px;padding:12px;border-radius:12px;font-size:1.4rem;line-height:2rem"><b>84K views · 2 days ago</b><br>Parts list, power usage and the software I run at home. Chapters below.</div>
  </ytd-watch-metadata>
  <ytd-comments id="comments" style="display:block">
    <ytd-comments-header-renderer style="display:block;font-size:2rem;font-weight:700;margin:16px 0">${comments.length} Comments</ytd-comments-header-renderer>
    ${comments.map(commentThread).join('')}
  </ytd-comments>
  </div>
</div></div>
<div id="secondary" style="width:402px;flex:none"><div id="related">${related.map(lockup).join('')}</div></div>
</div></ytd-watch-flexy></ytd-page-manager></ytd-app></body></html>`;

async function open(p: Page, dark: boolean) {
  await p.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: page(dark) }),
  );
  await p.addInitScript(userscriptInitScript());
  await p.goto('https://www.youtube.com/');
  await p.waitForTimeout(600);
}

// Crop to the window with a margin, so the mock page around it stays out of the picture
async function shot(p: Page, selector: string, path: string) {
  const box = await p.locator(selector).first().boundingBox();
  if (!box) throw new Error(`${selector} not found`);
  const m = 24;
  await p.screenshot({
    path,
    clip: {
      x: Math.max(0, box.x - m),
      y: Math.max(0, box.y - m),
      width: box.width + 2 * m,
      height: box.height + 2 * m,
    },
  });
}

const browser = await chromium.launch();
for (const [name, dark, width] of [
  ['settings-dark', true, 1280],
  ['settings-light', false, 1280],
  ['settings-narrow', true, 600],
] as const) {
  const p = await browser.newPage({ viewport: { width, height: 760 }, deviceScaleFactor: 2 });
  await open(p, dark);
  // The mock menu is only needed by the subscriptions window; here it would show in the crop margin
  await p.addStyleTag({ content: 'ytd-guide-renderer{visibility:hidden!important}' });
  await p.keyboard.press('Alt+Shift+KeyY');
  await p.waitForTimeout(500);
  await shot(p, '.ytc-panel', `${out}/${name}.png`);
  if (name === 'settings-dark') {
    await p.locator('.ytc-panel .ytc-psearch-input').fill('comment');
    await p.waitForTimeout(200);
    await shot(p, '.ytc-panel', `${out}/settings-search.png`);
  }
  await p.close();
}
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 760 }, deviceScaleFactor: 2 });
  await open(p, true);
  await p.locator('#expander-item').click();
  await p.waitForTimeout(400);
  await shot(p, '.ytc-chan-modal', `${out}/subscriptions.png`);
  await p.keyboard.press('Escape');
  await p.keyboard.press('Control+KeyK');
  await p.waitForTimeout(300);
  await p.keyboard.type('shorts');
  await p.waitForTimeout(200);
  await shot(p, '.ytc-cmd-box', `${out}/palette.png`);
  await p.close();
}
{
  const p = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1.5 });
  await p.route('https://www.youtube.com/**', (r) =>
    r.fulfill({ contentType: 'text/html; charset=utf-8', body: watchPage }),
  );
  await p.addInitScript(userscriptInitScript());
  await p.goto('https://www.youtube.com/watch?v=demo');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/watch-dark.png`, fullPage: true });
  await p.close();
}
await browser.close();
console.log(`screens in ${out}`);
