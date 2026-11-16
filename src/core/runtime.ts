import { installChannelsModal } from '../ui/channels';
import { installPalette } from '../ui/palette';
import {
  commentCountLabel,
  cssPath,
  ensureMastButton,
  ensureNav,
  setRuntimeCallbacks,
  updateNavCount,
} from '../ui/panel';
import { CONFIG } from './config';
import { h, icon, prefersReducedMotion } from './dom';
import { applyRootClasses, isPortraitActive, isWatch, state } from './settings';
import { escapeRe, parseCount, parseList } from './util';

/* =====================================================================
 * Comments: creator / pinned / hearted marks, like chips, spam & keywords
 * Ported verbatim from v2.9.0 (the CSS keys on data-ytc-mark, .ytc-chip, data-ytc-hidden)
 * ===================================================================== */

let highlightList: string[] = [];
let hideList: string[] = [];
const SPAM_RE = new RegExp(CONFIG.spamPatterns.join('|'), 'i');

export function compileLists(): void {
  highlightList = parseList(state.S.highlightWords);
  hideList = parseList(state.S.hideWords);
}

export const normPath = (href: string): string => {
  try {
    return decodeURIComponent(new URL(href, location.origin).pathname).toLowerCase().replace(/\/$/, '');
  } catch {
    return '';
  }
};

export function channelOwnerPath(): string {
  const a = document.querySelector(
    'ytd-watch-metadata #owner ytd-channel-name a, ytd-watch-metadata #owner a[href^="/@"], ytd-video-owner-renderer a[href^="/@"]',
  );
  return a ? normPath(a.getAttribute('href') || '') : '';
}

const hiddenNotes = new WeakMap<Element, HTMLElement>();

function setHidden(el: HTMLElement, hidden: boolean, reason: string): void {
  let note = hiddenNotes.get(el);
  if (!hidden) {
    el.removeAttribute('data-ytc-hidden');
    el.removeAttribute('data-ytc-revealed');
    note?.remove();
    return;
  }
  if (el.hasAttribute('data-ytc-revealed')) return;
  el.setAttribute('data-ytc-hidden', '');
  if (!note) {
    const reveal = () => {
      el.setAttribute('data-ytc-revealed', '');
      note?.remove();
    };
    note = h('div', {
      class: 'ytc-hidden-note',
      role: 'button',
      tabindex: '0',
      onclick: reveal,
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          reveal();
        }
      },
    });
    hiddenNotes.set(el, note);
  }
  note.textContent = `Comment hidden (${reason}). Click to show`;
  if (note.nextSibling !== el) el.before(note);
}

export const COMMENT_SEL = 'ytd-comments ytd-comment-view-model, ytd-comments ytd-comment-renderer';

export function processComment(el: HTMLElement, owner: string): void {
  const textEl = el.querySelector('#content-text');
  if (!textEl) return;

  const S = state.S;
  const text = textEl.textContent || '';
  const author = normPath(el.querySelector('#author-text')?.getAttribute('href') || '');
  const likesRaw = (el.querySelector('#vote-count-middle')?.textContent || '').trim();
  const pinned = !!el.querySelector('ytd-pinned-comment-badge-renderer');
  const hearted = !!el.querySelector('ytd-creator-heart-renderer');

  // Comment renderers are recycled by YouTube, so cache by content rather than by element
  const sig = [
    state.settingsRev,
    owner,
    author,
    likesRaw,
    pinned,
    hearted,
    text.length,
    text.slice(0, 48),
  ].join('|');
  if (el.dataset.ytcSig === sig) return;
  el.dataset.ytcSig = sig;

  const lower = text.toLowerCase();
  const isCreator = !!owner && author === owner;

  let mark = '';
  if (highlightList.length && highlightList.some((w) => lower.includes(w))) mark = 'match';
  else if (S.markCreator && isCreator) mark = 'creator';
  else if (S.markPinned && pinned) mark = 'pinned';
  else if (S.markHearted && hearted) mark = 'hearted';
  if (mark) el.setAttribute('data-ytc-mark', mark);
  else el.removeAttribute('data-ytc-mark');

  for (const c of el.querySelectorAll('.ytc-chip')) c.remove();
  if (S.likeChips) {
    const likes = parseCount(likesRaw);
    const tier = likes >= Number(S.hotLikes) ? 'hot' : likes >= Number(S.warmLikes) ? 'warm' : '';
    const header = el.querySelector('#header-author');
    if (tier && header) {
      header.append(
        h(
          'span',
          { class: `ytc-chip ytc-chip--${tier}`, title: `${likesRaw} likes` },
          tier === 'hot' ? 'Top' : 'Popular',
        ),
      );
    }
  }

  const spam = !!S.hideSpam && SPAM_RE.test(text);
  const blocked = hideList.length > 0 && hideList.some((w) => lower.includes(w));
  setHidden(el, (spam || blocked) && !isCreator, spam ? 'looks like spam' : 'blocked word');
}

/* =====================================================================
 * Comment search
 * ===================================================================== */

let searchBar: HTMLElement | null = null;
let searchInput: HTMLInputElement | null = null;
let searchCount: HTMLElement | null = null;

export function buildSearchBar(): void {
  searchCount = h('span', { class: 'ytc-csearch-count', 'aria-live': 'polite' });
  searchInput = h('input', {
    type: 'search',
    placeholder: 'Search loaded comments',
    'aria-label': 'Search comments',
    oninput: () => {
      state.searchQuery = searchInput?.value.trim().toLowerCase() || '';
      applyRootClasses();
      applySearch();
    },
    onkeydown: (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Escape' && searchInput) {
        searchInput.value = '';
        state.searchQuery = '';
        applySearch();
        searchInput.blur();
      }
    },
  });
  searchBar = h('label', { class: 'ytc-csearch' }, icon('search', 20), searchInput, searchCount);
}

export function ensureSearchBar(): void {
  if (!state.S.commentSearch) {
    searchBar?.remove();
    if (state.searchQuery) {
      state.searchQuery = '';
      applySearch();
    }
    return;
  }
  const header = document.querySelector('ytd-comments#comments ytd-comments-header-renderer');
  if (!header) return;
  if (!searchBar) buildSearchBar();
  if (searchBar && header.nextElementSibling !== searchBar) header.after(searchBar);
}

export function applySearch(): void {
  const threads = document.querySelectorAll<HTMLElement>('ytd-comments ytd-comment-thread-renderer');
  let shown = 0;
  for (const t of threads) {
    let match = true;
    if (state.searchQuery) {
      const haystack = Array.from(
        t.querySelectorAll('#content-text, #author-text'),
        (n) => n.textContent || '',
      )
        .join(' ')
        .toLowerCase();
      match = haystack.includes(state.searchQuery);
    }
    if (match) {
      t.removeAttribute('data-ytc-filtered');
      shown++;
    } else {
      t.setAttribute('data-ytc-filtered', '');
    }
  }
  if (searchCount) {
    searchCount.textContent = state.searchQuery ? `${shown} of ${threads.length}` : '';
  }
}

export function resetSearch(): void {
  state.searchQuery = '';
  applyRootClasses();
  if (searchInput) searchInput.value = '';
  applySearch();
}

/* =====================================================================
 * Description auto-expand
 * ===================================================================== */

export function autoExpandDescription(): void {
  if (!state.S.autoExpand) return;
  const vid = new URLSearchParams(location.search).get('v');
  if (!vid || state.expandedFor === vid) return;
  const expander = document.querySelector('ytd-watch-metadata ytd-text-inline-expander');
  if (!expander) return;
  if (expander.hasAttribute('is-expanded')) {
    if (Date.now() - state.navigatedAt > 3000) state.expandedFor = vid;
    return;
  }
  const btn = expander.querySelector<HTMLElement>('#expand');
  if (btn && btn.offsetParent !== null) {
    btn.click();
    state.expandedFor = vid;
  }
}

/* =====================================================================
 * Collapse / Show All Comments (ported from v2.9.0)
 * ===================================================================== */

type CommentList = { container: HTMLElement; threads: HTMLElement[]; loaders: HTMLElement[] };

// Finds the list that holds top-level comment threads without relying on one tag name
export function findCommentList(): CommentList | null {
  const root = document.querySelector('ytd-comments#comments');
  const firstText = root?.querySelector('#content-text');
  if (!root || !firstText) return null;
  let node: Element | null = firstText.closest('ytd-comment-thread-renderer, yt-comment-thread-view-model');
  if (!node) {
    node = firstText;
    while (node.parentElement && node.parentElement !== root) {
      const parent: HTMLElement = node.parentElement;
      let withText = 0;
      for (const child of parent.children) if (child.querySelector('#content-text')) withText++;
      if (withText >= 2) break;
      node = parent;
    }
  }
  const container = node.parentElement;
  if (!container) return null;
  const kids = Array.from(container.children) as HTMLElement[];
  const threads = kids.filter((c) => c.querySelector('#content-text'));
  const loaders = kids.filter((c) => c.matches('ytd-continuation-item-renderer, [class*="continuation" i]'));
  return { container, threads, loaders };
}

let showAllButton: HTMLButtonElement | null = null;

export function ensureShowAll(): void {
  const list = findCommentList();
  if (!list) return;
  const limit = Math.max(1, Number(state.S.portraitComments) | 0);

  list.threads.forEach((t, i) => {
    if (i >= limit) t.setAttribute('data-ytc-overflow', '');
    else t.removeAttribute('data-ytc-overflow');
  });
  // Hide the infinite-load trigger only once some comments exist, otherwise they never load
  for (const l of list.loaders) l.toggleAttribute('data-ytc-overflow', list.threads.length > 0);

  if (!showAllButton) {
    showAllButton = h('button', {
      type: 'button',
      class: 'ytc-showall',
      onclick: () => {
        state.commentsExpanded = true;
        applyRootClasses();
      },
    }) as HTMLButtonElement;
  }
  const hasMore = list.threads.length > limit || (list.threads.length > 0 && list.loaders.length > 0);
  showAllButton.hidden = !hasMore;
  const total = commentCountLabel();
  const text = total ? `Show all comments (${total})` : 'Show all comments';
  if (showAllButton.textContent !== text) showAllButton.textContent = text;
  if (list.container.nextElementSibling !== showAllButton) list.container.after(showAllButton);
}

/* =====================================================================
 * Ask (AI) Button
 * ===================================================================== */

const ASK_ALT = CONFIG.askLabels.map(escapeRe).join('|');
const ASK_RE = new RegExp(`^(${ASK_ALT})(\\s|$)`, 'i');
const ASK_JSON_RE = new RegExp(
  `"(?:text|title|label|simpleText|accessibilityText|content)":"(?:${ASK_ALT})(?:"|\\s)|youchat`,
  'i',
);
const ASK_ITEM_SEL =
  'ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, yt-list-item-view-model, tp-yt-paper-item';

const labelOf = (el: Element): string =>
  (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

const isVisible = (el: HTMLElement): boolean =>
  el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

// Buttons already read and found not to be Ask
const notAsk = new WeakSet<Element>();

export function findNativeAsk(): {
  el: HTMLElement;
  label: string;
  inActions: boolean;
  visible: boolean;
} | null {
  const nodes = document.querySelectorAll<HTMLElement>(
    ':is(ytd-watch-metadata, ytd-watch-flexy #panels, .ytSideRailViewModelHost) :is(button, [role="button"])',
  );
  let fallback: { el: HTMLElement; label: string; inActions: boolean; visible: boolean } | null = null;
  for (const el of nodes) {
    if (notAsk.has(el) || el.closest('.ytc-ask, ytd-masthead, ytd-comments, #related')) continue;
    const label = labelOf(el);
    if (!label || label.length > 40 || !ASK_RE.test(label)) {
      if (label) notAsk.add(el);
      continue;
    }
    const inActions = !!el.closest('ytd-watch-metadata #actions');
    const visible = isVisible(el);
    if (inActions && visible) return { el, label, inActions, visible };
    if (!fallback) fallback = { el, label, inActions, visible };
  }
  return fallback;
}

const askProbe = { vid: '', found: false, checkedAt: 0 };

export function menuHasAsk(): boolean {
  const vid = new URLSearchParams(location.search).get('v') || '';
  if (askProbe.vid === vid && (askProbe.found || Date.now() - askProbe.checkedAt < 2000)) {
    return askProbe.found;
  }
  const menu = document.querySelector<any>('ytd-watch-metadata ytd-menu-renderer');
  const data = menu && (menu.data || (menu.__data && menu.__data.data));
  let found = false;
  if (data) {
    try {
      found = ASK_JSON_RE.test(JSON.stringify(data));
    } catch {
      found = false;
    }
  }
  Object.assign(askProbe, { vid, found, checkedAt: Date.now() });
  return found;
}

export function askPanel(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    'ytd-engagement-panel-section-list-renderer:is([target-id*="youchat" i], [target-id*="ask" i], [target-id*="conversation" i])',
  );
}

export async function clickAskViaOverflow(): Promise<boolean> {
  const more = document.querySelector<HTMLElement>(
    'ytd-watch-metadata #actions ytd-menu-renderer :is(#button-shape button, yt-icon-button#button button, yt-button-shape > button[aria-haspopup])',
  );
  if (!more) return false;
  more.click();
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 50));
    const items = document.querySelectorAll<HTMLElement>(
      `ytd-popup-container tp-yt-iron-dropdown:not([aria-hidden="true"]) :is(${ASK_ITEM_SEL})`,
    );
    for (const item of items) {
      if (ASK_RE.test(labelOf(item))) {
        (item.querySelector<HTMLElement>('tp-yt-paper-item, [role="menuitem"]') || item).click();
        return true;
      }
    }
  }
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  return false;
}

export function openAskPanel(panelEl: any): void {
  const expanded = 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED';
  try {
    panelEl.visibility = expanded;
  } catch {
    /* read-only */
  }
  panelEl.setAttribute('visibility', expanded);
  panelEl.scrollIntoView({
    block: 'nearest',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  });
}

let askButton: HTMLElement | null = null;
let askLabel: HTMLElement | null = null;

export async function triggerAsk(): Promise<void> {
  if (!askButton || askButton.getAttribute('aria-busy') === 'true') return;
  askButton.setAttribute('aria-busy', 'true');
  try {
    const native = findNativeAsk();
    if (native) {
      native.el.click();
      return;
    }
    if (await clickAskViaOverflow()) return;
    const p = askPanel();
    if (p) {
      openAskPanel(p);
      return;
    }
    askButton.title = 'YouTube offers no Ask for this video';
  } finally {
    askButton.removeAttribute('aria-busy');
  }
}

export function ensureAskButton(): void {
  if (!state.S.askButton) {
    askButton?.remove();
    askButton = null;
    return;
  }
  const actions = document.querySelector('ytd-watch-metadata #actions #top-level-buttons-computed');
  if (!actions) return;
  const native = findNativeAsk();
  // YouTube shows its own Ask button under the video: no proxy needed
  const nativeShown = !!native && native.inActions && native.visible;
  const hasAsk = !nativeShown && ((native && !native.inActions) || menuHasAsk() || !!askPanel());
  if (!hasAsk) {
    askButton?.remove();
    askButton = null;
    return;
  }
  if (askButton && askButton.isConnected) {
    if (native && native.label && askLabel && askLabel.textContent !== native.label) {
      askLabel.textContent = native.label;
    }
    return;
  }
  askLabel = h('span', {}, native?.label || 'Ask');
  askButton = h(
    'button',
    {
      type: 'button',
      class: 'ytc-ask',
      title: 'Ask about this video',
      'aria-label': 'Ask',
      onclick: triggerAsk,
    },
    icon('sparkle', 18),
    askLabel,
  );
  actions.append(askButton);
}

/* =====================================================================
 * Watched State
 * ===================================================================== */

const WATCH_ITEM_SEL =
  'yt-lockup-view-model, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer:not(:has(yt-lockup-view-model))';
const PROGRESS_SEL = [
  'ytd-thumbnail-overlay-resume-playback-renderer #progress',
  '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
  'yt-thumbnail-overlay-progress-bar-view-model [style*="width"]',
].join(', ');

export function markWatched(): void {
  if (!state.S.dimWatched && !state.S.watchedBadge) return;
  for (const item of document.querySelectorAll<HTMLElement>(WATCH_ITEM_SEL)) {
    const bar = item.querySelector<HTMLElement>(PROGRESS_SEL);
    let st = '';
    if (bar) {
      st = Number.parseFloat(bar.style.width) >= CONFIG.fluent.watchedAt ? 'full' : 'part';
    }
    if ((item.dataset.ytcWatched || '') === st) continue;
    if (st) item.dataset.ytcWatched = st;
    else delete item.dataset.ytcWatched;
  }
}

/* =====================================================================
 * Reveal highlight: cursor position as CSS variables
 * ===================================================================== */

const REVEAL_BASE = [
  '.ytc-card > .ytc-row',
  '.ytc-nav button',
  '.ytc-ask',
  '.ytc-showall',
  'ytd-rich-item-renderer[rendered-from-rich-grid]',
  'ytd-browse[page-subtype="channels"] :is(ytd-grid-video-renderer, ytd-rich-item-renderer)',
  'ytd-search ytd-video-renderer',
];
const REVEAL_SEL: Record<string, string> = {
  threads: [...REVEAL_BASE, 'ytd-comments ytd-comment-thread-renderer'].join(', '),
  sections: [...REVEAL_BASE, 'ytd-watch-metadata', 'ytd-comments#comments', '[data-ytc-sec-card]'].join(', '),
  none: REVEAL_BASE.join(', '),
};
/* While the page scrolls, cards pass under a still cursor and each one gets :hover in turn
   (our card styles, YouTube's inline preview). html.ytc-scrolling turns that off. */
const SCROLL_IDLE_MS = 150;
let scrolling = false;
let scrollTimer = 0;
window.addEventListener(
  'scroll',
  () => {
    if (!scrolling) {
      scrolling = true;
      document.documentElement.classList.add('ytc-scrolling');
    }
    clearTimeout(scrollTimer);
    scrollTimer = window.setTimeout(() => {
      scrolling = false;
      document.documentElement.classList.remove('ytc-scrolling');
    }, SCROLL_IDLE_MS);
  },
  { passive: true },
);

let revealFrame = 0;
let revealEvent: PointerEvent | null = null;

document.addEventListener(
  'pointermove',
  (e) => {
    if (!state.S.fluent || !state.S.fluentReveal || e.pointerType === 'touch' || scrolling) return;
    revealEvent = e;
    if (revealFrame) return;
    revealFrame = requestAnimationFrame(() => {
      revealFrame = 0;
      if (!revealEvent) return;
      const eventTarget = revealEvent.target as Element | null;
      const selector = REVEAL_SEL[state.S.cardLayout] || REVEAL_SEL.none || '';
      const target = eventTarget?.closest?.(selector) as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--ytc-mx', `${revealEvent.clientX - rect.left}px`);
      target.style.setProperty('--ytc-my', `${revealEvent.clientY - rect.top}px`);
    });
  },
  { passive: true, capture: true },
);

/* =====================================================================
 * Feed clean-up
 * ===================================================================== */

const SECTION_SEL = [
  'ytd-rich-section-renderer',
  'ytd-rich-shelf-renderer',
  'ytd-shelf-renderer',
  'ytd-reel-shelf-renderer',
  'ytd-horizontal-card-list-renderer',
  'grid-shelf-view-model',
  'ytd-feed-nudge-renderer',
  'ytd-chips-shelf-with-video-shelf-renderer',
  'ytd-statement-banner-renderer',
].join(', ');
const SECTION_HEADER_SEL =
  '#title-container, #header, #title, #title-text, h2, h3, .yt-shelf-header-layout, yt-section-header-view-model';
const VIDEO_ITEM_SEL =
  'ytd-rich-item-renderer, yt-lockup-view-model, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer';

let sectionStyle: HTMLStyleElement | null = null;
let sectionCss = '';

export function activeSectionRules(): { titles: string[]; selectors: string[] } {
  const titles: string[] = [];
  const selectors: string[] = [];
  for (const section of CONFIG.hiddenSections) {
    if (!state.S[`hideSection_${section.id}`]) continue;
    titles.push(...section.titles);
    selectors.push(...(section.selectors || []));
  }
  titles.push(...parseList(state.S.hiddenSectionTitles));
  return { titles: titles.map((t) => t.toLowerCase()), selectors };
}

// A section's heading does not change once it has text; only empty results are retried
const headingCache = new WeakMap<Element, string>();

export function sectionHeading(el: Element): string {
  const cached = headingCache.get(el);
  if (cached) return cached;
  const heading = readSectionHeading(el);
  if (heading) headingCache.set(el, heading);
  return heading;
}

function readSectionHeading(el: Element): string {
  for (const header of el.querySelectorAll(SECTION_HEADER_SEL)) {
    if (header.closest(VIDEO_ITEM_SEL)) continue;
    const text = header.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (text) return text.toLowerCase();
  }
  return '';
}

export function hideSections(): void {
  const { titles, selectors } = activeSectionRules();

  const css = selectors.length ? `${selectors.join(',\n')} { display: none !important; }` : '';
  if (!sectionStyle) {
    sectionStyle = document.createElement('style');
    sectionStyle.id = 'ytc-section-style';
  }
  if (!sectionStyle.isConnected) (document.head || document.documentElement).appendChild(sectionStyle);
  if (css !== sectionCss) sectionStyle.textContent = sectionCss = css;

  for (const el of document.querySelectorAll<HTMLElement>(SECTION_SEL)) {
    if (el.closest('ytd-comments')) continue;
    const heading = titles.length ? sectionHeading(el) : '';
    const hide = !!heading && titles.some((t) => heading.includes(t));
    if (hide) el.setAttribute('data-ytc-section-hidden', '');
    else el.removeAttribute('data-ytc-section-hidden');
  }
}

const LABEL_SCOPE_SEL = [
  'ytd-watch-metadata #actions',
  'ytd-watch-metadata #description',
  'ytd-watch-flexy #panels',
  'ytd-guide-renderer',
  'ytd-mini-guide-renderer',
  'ytd-masthead',
  'ytd-popup-container',
  'yt-chip-cloud-renderer',
  '.ytSideRailViewModelHost',
].join(', ');
const LABEL_ITEM_SEL =
  'button, a, [role="button"], [role="menuitem"], [role="tab"], yt-chip-cloud-chip-renderer';
const LABEL_WRAP_SEL = [
  'ytd-button-renderer',
  'yt-button-view-model',
  'ytd-guide-entry-renderer',
  'ytd-mini-guide-entry-renderer',
  'ytd-menu-service-item-renderer',
  'ytd-menu-navigation-item-renderer',
  'yt-list-item-view-model',
  'yt-chip-cloud-chip-renderer',
  'tp-yt-paper-item',
].join(', ');
let labelRe: RegExp | null = null;
let labelKey: string | null = null;
// Elements with a non-empty label that did not match: not read again until the label list changes
let labelChecked = new WeakSet<Element>();

export function hideLabeled(): void {
  const labels: string[] = [];
  for (const section of CONFIG.hiddenSections) {
    if (!state.S[`hideSection_${section.id}`]) continue;
    const s = section as { labels?: readonly string[] };
    if (s.labels) labels.push(...s.labels);
  }
  const key = labels.join('|');
  if (key !== labelKey) {
    labelKey = key;
    labelChecked = new WeakSet();
    labelRe = labels.length ? new RegExp(`^(${labels.map(escapeRe).join('|')})(\\s|$)`, 'i') : null;
  }

  const matched = new Set<Element>();
  if (labelRe) {
    for (const scope of document.querySelectorAll(LABEL_SCOPE_SEL)) {
      for (const el of scope.querySelectorAll(LABEL_ITEM_SEL)) {
        if (labelChecked.has(el) || el.closest('.ytc-panel, .ytc-nav, .ytc-ask')) continue;
        const label = labelOf(el);
        if (!label || label.length > 40 || !labelRe.test(label)) {
          if (label) labelChecked.add(el);
          continue;
        }
        let target: Element = el.closest(LABEL_WRAP_SEL) || el;
        for (let i = 0; i < 3; i++) {
          const outer = target.parentElement && target.parentElement.closest(LABEL_WRAP_SEL);
          if (!outer || !scope.contains(outer)) break;
          target = outer;
        }
        matched.add(target);
      }
    }
  }
  document.querySelectorAll('[data-ytc-label-hidden]').forEach((el) => {
    if (!matched.has(el)) el.removeAttribute('data-ytc-label-hidden');
  });
  for (const el of matched) {
    el.setAttribute('data-ytc-label-hidden', '');
  }
}

/* =====================================================================
 * Extension toolbars
 * ===================================================================== */

export let extShift = 0;
let extStyle: HTMLStyleElement | null = null;
let extCss = '';

export function extensionToolbars(): HTMLElement[] {
  const found: HTMLElement[] = [];
  for (const sel of CONFIG.extensionToolbars.selectors) {
    try {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (isVisible(el)) found.push(el);
      });
    } catch {
      /* bad selector */
    }
  }
  return found;
}

export function fitExtensionToolbars(): void {
  const root = document.documentElement;
  const sels = CONFIG.extensionToolbars.selectors.join(', ');
  const css =
    state.S.extToolbarStyle && sels
      ? `
html.ytc-ext-bar :is(${sels}) {
  border-radius: 12px !important;
  background-color: var(--ytc-layer) !important;
  box-shadow: inset 0 0 0 1px var(--ytc-stroke), 0 4px 14px rgba(0, 0, 0, .14) !important;
}
html.ytc-fluent.ytc-ext-bar :is(${sels}) {
  background-color: color-mix(in srgb, var(--ytc-raised) 70%, transparent) !important;
  backdrop-filter: blur(var(--ytc-blur)) saturate(140%) !important;
  -webkit-backdrop-filter: blur(var(--ytc-blur)) saturate(140%) !important;
}`
      : '';

  if (!extStyle) {
    extStyle = document.createElement('style');
    extStyle.id = 'ytc-ext-style';
  }
  if (!extStyle.isConnected) (document.head || document.documentElement).appendChild(extStyle);
  if (css !== extCss) extStyle.textContent = extCss = css;

  if (!state.S.extToolbarSpace) {
    root.classList.remove('ytc-ext-bar');
    root.style.removeProperty('--ytc-ext-shift');
    extShift = 0;
    return;
  }
  const bars = extensionToolbars();
  let shift = 0;
  for (const b of bars) {
    if (getComputedStyle(b).position === 'absolute') {
      shift = Math.max(shift, b.offsetHeight + CONFIG.extensionToolbars.gap);
    }
  }
  root.classList.toggle('ytc-ext-bar', shift > 0);
  if (shift > 0) root.style.setProperty('--ytc-ext-shift', `${shift}px`);
  else root.style.removeProperty('--ytc-ext-shift');
  extShift = shift;
}

const OWN_CARD_SEL = 'ytd-watch-metadata, ytd-comments#comments, #related';

export function markExtraSectionCards(): void {
  if (state.S.cardLayout !== 'sections') return;
  const below = document.querySelector('ytd-watch-flexy #below');
  if (!below) return;
  for (const child of below.children) {
    if (child.matches('.ytc-ask, style, script, link')) continue;
    // YouTube wraps metadata and comments in plain divs; those blocks already have their own card
    if (child.matches(OWN_CARD_SEL) || child.querySelector(OWN_CARD_SEL)) {
      child.removeAttribute('data-ytc-sec-card');
      continue;
    }
    if ((child as HTMLElement).offsetHeight > 40 && !child.hasAttribute('data-ytc-sec-card')) {
      child.setAttribute('data-ytc-sec-card', '');
    }
  }
}

/* =====================================================================
 * Responsive Video Grid
 * ===================================================================== */

const GRID_GAP = CONFIG.grid.gap;
const HISTORY_MAX = 20;
const gridCap = { width: 0, max: 0 };
const gridHistory: { t: number; n: number; width: number; reason: string }[] = [];

/* Layout shifts for diagnostics: shows which element moves when cards "float" */
type ShiftRecord = { t: number; value: number; sources: { node: string | null; from: string; to: string }[] };
const layoutShifts: ShiftRecord[] = [];
const rectText = (r: DOMRectReadOnly): string =>
  `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as any[]) {
      if (entry.value < 0.001) continue;
      layoutShifts.push({
        t: Math.round(entry.startTime),
        value: Number(entry.value.toFixed(4)),
        sources: (entry.sources || []).slice(0, 3).map((src: any) => ({
          node: src.node instanceof Element ? cssPath(src.node) : null,
          from: rectText(src.previousRect),
          to: rectText(src.currentRect),
        })),
      });
      if (layoutShifts.length > HISTORY_MAX) layoutShifts.shift();
    }
  }).observe({ type: 'layout-shift', buffered: true });
} catch {
  /* layout-shift is not supported (Firefox): the report says so */
}
let gridStyle: HTMLStyleElement | null = null;

export function visibleRichGrid(): HTMLElement | null {
  for (const grid of document.querySelectorAll<HTMLElement>('ytd-rich-grid-renderer')) {
    if (grid.offsetParent !== null && !grid.closest('ytd-watch-flexy')) return grid;
  }
  return null;
}

/** Side margins YouTube keeps around the grid (one side), in px. */
function gridGutter(grid: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-gutter-margin')) || 24;
}

/*
 * Width the grid may use. Measured on ytd-page-manager, which YouTube sizes from the window
 * and the guide, never from the grid's content: measuring the grid's own container lets
 * a wider grid ask for more columns, which makes it wider again.
 */
export function gridAvailableWidth(grid: HTMLElement): number {
  const manager = grid.closest<HTMLElement>('ytd-page-manager') || document.querySelector('ytd-page-manager');
  const base = manager?.clientWidth || grid.parentElement?.clientWidth || 0;
  return Math.max(0, base - 2 * gridGutter(grid));
}

export function computeColumns(grid: HTMLElement): number {
  if (state.S.gridMode === 'fixed') {
    return Math.min(CONFIG.grid.maxColumns, Math.max(1, state.S.gridColumns | 0));
  }
  const width = gridAvailableWidth(grid);
  if (!width) return 0;
  const card = Math.max(160, state.S.gridCardWidth | 0);
  // Use the gap YouTube actually lays out with (themes may change --ytd-rich-grid-item-margin)
  const gap =
    Number.parseFloat(getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-item-margin')) || GRID_GAP;
  return Math.min(CONFIG.grid.maxColumns, Math.max(1, Math.floor((width + gap) / (card + gap))));
}

export function updateGrid(): void {
  const root = document.documentElement;
  root.style.setProperty('--ytc-card-min', `${Math.max(160, state.S.gridCardWidth | 0)}px`);
  const enabled = state.S.gridMode === 'auto' || state.S.gridMode === 'fixed';
  root.classList.toggle('ytc-grid', enabled);

  if (!gridStyle) {
    gridStyle = document.createElement('style');
    gridStyle.id = 'ytc-grid-style';
  }
  if (!gridStyle.isConnected) (document.head || document.documentElement).appendChild(gridStyle);

  if (!enabled) {
    if (gridStyle.textContent) gridStyle.textContent = '';
    state.gridColumnsNow = 0;
    return;
  }
  const grid = visibleRichGrid();
  if (!grid) return;
  const width = Math.round(gridAvailableWidth(grid));
  if (width !== gridCap.width) Object.assign(gridCap, { width, max: 0 }); // new width: forget the cap
  let n = computeColumns(grid);
  let reason = 'width';
  // Safety net: if the page scrolls sideways with the current count, take one column off and
  // keep that as the limit until the available width changes (no back-and-forth)
  const overflow =
    document.documentElement.scrollWidth > window.innerWidth + 2 &&
    grid.getBoundingClientRect().right > window.innerWidth + 2; // the grid itself sticks out
  if (state.gridColumnsNow > 1 && overflow) {
    gridCap.max = state.gridColumnsNow - 1;
    reason = 'overflow';
  }
  if (gridCap.max) n = Math.min(n, gridCap.max);
  if (!n || n === state.gridColumnsNow) return;
  state.gridColumnsNow = n;
  gridHistory.push({ t: Math.round(performance.now()), n, width, reason });
  if (gridHistory.length > HISTORY_MAX) gridHistory.shift();
  const slim = Math.min(CONFIG.grid.maxColumns + 4, Math.max(2, Math.round(n * CONFIG.grid.shortsRatio)));
  gridStyle.textContent = `
html.ytc-grid ytd-browse ytd-rich-grid-renderer {
  --ytd-rich-grid-items-per-row: ${n} !important;
  --ytd-rich-grid-slim-items-per-row: ${slim} !important;
  --ytd-rich-grid-item-max-width: 100000px !important;
  --ytd-rich-grid-item-min-width: 0px !important;
  --ytd-rich-grid-slim-item-min-width: 0px !important;
}`;
}

/* =====================================================================
 * Diagnostics collector
 * ===================================================================== */

export function collectDiagnostics(): Record<string, any> {
  const candidates: Array<{ tag: string; label: string; visible: boolean; path: string }> = [];
  document
    .querySelectorAll<HTMLElement>(
      ':is(ytd-watch-metadata, ytd-watch-flexy #panels, .ytSideRailViewModelHost) :is(button, [role="button"])',
    )
    .forEach((el) => {
      const label = labelOf(el);
      if (label && label.length < 60 && (ASK_RE.test(label) || /\bask\b|gemini|youchat/i.test(label))) {
        candidates.push({
          tag: el.tagName.toLowerCase(),
          label,
          visible: isVisible(el),
          path: cssPath(el),
        });
      }
    });
  const { highlightWords: _h1, hideWords: _h2, ...settings } = state.S;
  return {
    script: `ReTube ${__RETUBE_VERSION__}`,
    page: location.pathname,
    settings,
    menuHasAsk: isWatch() ? menuHasAsk() : null,
    askCandidates: candidates,
    engagementPanels: Array.from(
      document.querySelectorAll('ytd-engagement-panel-section-list-renderer'),
      (p) => ({
        targetId: p.getAttribute('target-id'),
        visibility: p.getAttribute('visibility'),
      }),
    ),
    sideRailPresent: !!document.querySelector('.ytSideRailViewModelHost'),
    portrait: {
      matches: window.matchMedia('(orientation: portrait)').matches,
      active: isPortraitActive(),
      viewport: `${innerWidth}x${innerHeight}`,
    },
    comments: (() => {
      const list = findCommentList();
      return {
        collapsedClass: document.documentElement.classList.contains('ytc-comments-collapsed'),
        expandedByUser: state.commentsExpanded,
        containerPath: list ? cssPath(list.container) : null,
        threadTags: list ? Array.from(new Set(list.threads.map((t) => t.tagName.toLowerCase()))) : [],
        threads: list ? list.threads.length : 0,
        loaders: list ? list.loaders.length : 0,
      };
    })(),
    grid: (() => {
      const grid = visibleRichGrid();
      return {
        mode: state.S.gridMode,
        columns: state.gridColumnsNow,
        availableWidth: grid ? Math.round(gridAvailableWidth(grid)) : null,
        hasRows: !!document.querySelector('ytd-rich-grid-row'),
        inlineVar: grid ? grid.style.getPropertyValue('--ytd-rich-grid-items-per-row') : null,
        itemWidths: grid
          ? [
              ...new Set(
                Array.from(grid.querySelectorAll<HTMLElement>('ytd-rich-item-renderer'))
                  .filter((i) => i.offsetParent !== null)
                  .slice(0, 40)
                  .map((i) => Math.round(i.getBoundingClientRect().width)),
              ),
            ]
          : [],
        history: gridHistory,
        widths: (() => {
          const w = (sel: string) => {
            const el = document.querySelector<HTMLElement>(sel);
            return el ? Math.round(el.getBoundingClientRect().width) : null;
          };
          return {
            pageManager: w('ytd-page-manager'),
            browse: w('ytd-browse:not([hidden])'),
            twoColumn: w('ytd-browse:not([hidden]) ytd-two-column-browse-results-renderer'),
            grid: grid ? Math.round(grid.getBoundingClientRect().width) : null,
            gridRight: grid ? Math.round(grid.getBoundingClientRect().right) : null,
            scrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            gutter: grid ? getComputedStyle(grid).getPropertyValue('--ytd-rich-grid-gutter-margin') : null,
          };
        })(),
      };
    })(),
    perf: perfReport(),
    preset: state.S.preset,
    // Guide structure for the subscriptions window: tags, counts and button texts, no channel names
    guide: Array.from(
      document.querySelectorAll(
        'ytd-guide-renderer :is(ytd-guide-section-renderer, ytd-guide-collapsible-section-entry-renderer)',
      ),
    ).map((section) => ({
      path: cssPath(section),
      children: Array.from(section.querySelectorAll(':scope > *, :scope > #items > *'), (c) =>
        c.tagName.toLowerCase(),
      ).slice(0, 20),
      channelLinks: section.querySelectorAll(
        'a[href^="/@"], a[href^="/channel/"], a[href^="/c/"], a[href^="/user/"]',
      ).length,
      headerLinks: Array.from(section.querySelectorAll<HTMLAnchorElement>('a[href^="/feed/"]'), (a) =>
        a.getAttribute('href'),
      ),
      buttons: Array.from(
        section.querySelectorAll(
          '#expander-item, #collapser-item, ytd-guide-collapsible-entry-renderer, [role="button"]',
        ),
        (b) => `${cssPath(b)} :: ${(b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)}`,
      ).slice(0, 8),
    })),
    guideEntry: (() => {
      const link = document.querySelector('ytd-guide-renderer :is(a[href^="/@"], a[href^="/channel/"])');
      const entry = link?.closest('ytd-guide-entry-renderer');
      if (!entry) return null;
      return {
        attributes: entry.getAttributeNames(),
        newness: Array.from(entry.querySelectorAll('[id*="newness" i], [class*="newness" i]'), (n) => ({
          path: cssPath(n),
          display: getComputedStyle(n).display,
          hidden: (n as HTMLElement).hidden,
        })),
      };
    })(),
    layoutShifts:
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver.supportedEntryTypes?.includes('layout-shift')
        ? layoutShifts
        : 'not supported in this browser',
    extensionToolbars: extensionToolbars().map((el) => ({
      path: cssPath(el),
      position: getComputedStyle(el).position,
      height: el.offsetHeight,
    })),
    spacer: extShift,
    below: (() => {
      const below = document.querySelector('ytd-watch-flexy #below');
      return below
        ? Array.from(below.children, (c) => ({
            tag: c.tagName.toLowerCase(),
            id: c.id || null,
            height: (c as HTMLElement).offsetHeight,
            card: c.hasAttribute('data-ytc-sec-card'),
          }))
        : null;
    })(),
    related: (() => {
      const rel = document.querySelector<HTMLElement>('ytd-watch-flexy #related');
      const item =
        rel &&
        rel.querySelector<HTMLElement>(
          'yt-lockup-view-model, ytd-compact-video-renderer, ytd-rich-item-renderer',
        );
      const thumb = item && item.querySelector<HTMLElement>('yt-thumbnail-view-model, ytd-thumbnail, img');
      return rel
        ? {
            width: rel.offsetWidth,
            richGrid: !!rel.querySelector('ytd-rich-grid-renderer'),
            item: item ? cssPath(item) : null,
            itemChildren: item
              ? Array.from(item.querySelectorAll('*'))
                  .slice(0, 12)
                  .map(
                    (n) =>
                      `${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? `.${n.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`,
                  )
              : [],
            thumbWidth: thumb ? Math.round(thumb.getBoundingClientRect().width) : null,
          }
        : null;
    })(),
    descriptionExpanded: !!document.querySelector('ytd-watch-metadata ytd-text-inline-expander[is-expanded]'),
    actionsPath: (() => {
      const a = document.querySelector('ytd-watch-metadata #actions');
      return a ? cssPath(a) : null;
    })(),
  };
}

/* =====================================================================
 * Runtime loop & scheduling
 * ===================================================================== */

/* =====================================================================
 * Pass scheduling and profiling
 * ===================================================================== */

type Step = {
  name: string;
  scope: 'all' | 'watch';
  /** Only reads the DOM and settings: skip the step when neither changed since its last run */
  cached?: boolean;
  run: () => void;
};

// Order matters: it is the order of the v2.9.0 main loop
const STEPS: Step[] = [
  { name: 'mastButton', scope: 'all', run: ensureMastButton },
  { name: 'nav', scope: 'all', run: ensureNav },
  { name: 'grid', scope: 'all', run: updateGrid },
  { name: 'hideSections', cached: true, scope: 'all', run: hideSections },
  { name: 'hideLabeled', cached: true, scope: 'all', run: hideLabeled },
  { name: 'watched', cached: true, scope: 'all', run: markWatched },
  { name: 'extToolbars', scope: 'all', run: fitExtensionToolbars },
  { name: 'sectionCards', cached: true, scope: 'all', run: markExtraSectionCards },
  {
    name: 'comments',
    cached: true,
    scope: 'watch',
    run: () => {
      const owner = channelOwnerPath();
      for (const el of document.querySelectorAll<HTMLElement>(COMMENT_SEL)) processComment(el, owner);
    },
  },
  { name: 'searchBar', cached: true, scope: 'watch', run: ensureSearchBar },
  { name: 'ask', cached: true, scope: 'watch', run: ensureAskButton },
  { name: 'showAll', cached: true, scope: 'watch', run: ensureShowAll },
  {
    name: 'search',
    scope: 'watch',
    run: () => {
      if (state.searchQuery) applySearch();
    },
  },
  { name: 'description', scope: 'watch', run: autoExpandDescription },
  { name: 'navCount', scope: 'watch', run: updateNavCount },
];

/** Per-step cost, shown in "Copy diagnostics" as perf. Times are in ms. */
export const perf: Record<string, { calls: number; total: number; max: number; errors: number }> = {};
const perfTotal = { passes: 0, total: 0, max: 0 };

const lastRun = new Map<string, string>();
const IDLE_TIMEOUT_MS = 400;
let passTimer: any = 0;

export function schedulePass(delay = 300): void {
  if (passTimer) return;
  passTimer = setTimeout(() => {
    // Not urgent: run when the browser is idle, but never later than IDLE_TIMEOUT_MS
    const run = () => {
      passTimer = 0;
      pass();
    };
    if (delay === 0 || !('requestIdleCallback' in window)) run();
    else (window as any).requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  }, delay);
}

export function pass(): void {
  const t0 = performance.now();
  applyRootClasses();
  if (!document.body) return;
  const watch = isWatch();
  for (const step of STEPS) {
    if (step.scope === 'watch' && !watch) continue;
    if (step.cached) {
      const key = `${state.domRev}|${state.settingsRev}|${location.href}`;
      if (lastRun.get(step.name) === key) continue;
      lastRun.set(step.name, key);
    }
    perf[step.name] ??= { calls: 0, total: 0, max: 0, errors: 0 };
    const s = perf[step.name] as (typeof perf)[string];
    const start = performance.now();
    try {
      step.run();
    } catch (err) {
      // One broken feature must not stop the others
      s.errors++;
      if (s.errors === 1) console.warn(`[Re-Tube] ${step.name} failed`, err);
    }
    const took = performance.now() - start;
    s.calls++;
    s.total += took;
    s.max = Math.max(s.max, took);
  }
  const took = performance.now() - t0;
  perfTotal.passes++;
  perfTotal.total += took;
  perfTotal.max = Math.max(perfTotal.max, took);
}

/** Rounded copy of the profile for the diagnostics report. */
export function perfReport(): Record<string, unknown> {
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    passes: perfTotal.passes,
    totalMs: round(perfTotal.total),
    avgMs: perfTotal.passes ? round(perfTotal.total / perfTotal.passes) : 0,
    maxMs: round(perfTotal.max),
    steps: Object.fromEntries(
      Object.entries(perf).map(([k, v]) => [
        k,
        { calls: v.calls, totalMs: round(v.total), maxMs: round(v.max), errors: v.errors },
      ]),
    ),
  };
}

export function startRuntime(): void {
  installChannelsModal();
  installPalette();
  // Test hook: set localStorage ytc:debug=1 to read the report from window.__ytcDiag()
  if (localStorage.getItem('ytc:debug')) (window as any).__ytcDiag = collectDiagnostics;
  compileLists();

  setRuntimeCallbacks({
    onSettingsChanged: (key) => {
      if (key === 'highlightWords' || key === 'hideWords') {
        compileLists();
      }
      state.settingsRev++;
      state.gridColumnsNow = 0;
      schedulePass(0);
    },
    schedulePass,
    collectDiagnostics,
  });

  // Ignore changes made by ReTube itself (its own nodes, toasts, the panel): they cannot need a pass
  const isOwn = (n: Node): boolean =>
    n instanceof Element &&
    (n.matches('[class*="ytc-"], style#ytc-style') || n.closest('.ytc-panel, .ytc-toast, .ytc-nav') !== null);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.target instanceof Element && r.target.closest('.ytc-panel, .ytc-toast')) continue;
      const nodes = [...r.addedNodes, ...r.removedNodes];
      if (nodes.length && nodes.every(isOwn)) continue;
      state.domRev++;
      schedulePass();
      return;
    }
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });

  const resizeObserver = new ResizeObserver(() => schedulePass(80));
  resizeObserver.observe(document.body);
  const watchHost = setInterval(() => {
    const manager = document.querySelector('ytd-page-manager');
    if (manager) {
      resizeObserver.observe(manager);
      clearInterval(watchHost);
    }
  }, 500);

  window.addEventListener('yt-navigate-finish', () => {
    state.navigatedAt = Date.now();
    state.domRev++;
    state.commentsExpanded = false;
    resetSearch();
    schedulePass(0);
  });

  schedulePass(0);
}
