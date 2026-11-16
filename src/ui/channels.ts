/*
 * Subscriptions modal.
 * "Show more" and the "Subscriptions" header in the left guide open a window with every channel
 * and a search box, instead of growing the narrow sidebar.
 */
import { h, icon } from '../core/dom';
import { state } from '../core/settings';

type Channel = { name: string; avatar: string; link: HTMLAnchorElement; fresh: boolean };

// The blue dot YouTube shows next to channels with new videos
const NEWNESS_SEL = '#newness-dot, [id*="newness" i], [class*="newness" i]';

/**
 * True when the guide entry shows its "new videos" dot. Uses the dot's own display value,
 * which stays readable while YouTube keeps the entry collapsed (hidden parent).
 */
export function hasNewVideos(entry: Element): boolean {
  const dot = entry.querySelector<HTMLElement>(NEWNESS_SEL);
  if (!dot || dot.hidden) return false;
  return getComputedStyle(dot).display !== 'none';
}

const CHANNEL_LINK_SEL = 'a[href^="/@"], a[href^="/channel/"], a[href^="/c/"], a[href^="/user/"]';
const SECTION_SEL = 'ytd-guide-collapsible-section-entry-renderer, ytd-guide-section-renderer';
const CLICKABLE_SEL = '#expander-item, #collapser-item, [role="button"], a, button, tp-yt-paper-item';
// "Show more" in the interface languages; "Show less" is left to YouTube
const MORE_RE = /^(show more|more|показати більше|показати ще|ще|показать больше|показать ещё)(\s|$)/i;
const HEADER_HREF = /^\/feed\/(channels|subscriptions)\/?$/;

const textOf = (el: Element): string =>
  (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * The guide section that lists channels: the nearest section around `el` with at least
 * two channel links. Nested sections are walked outwards, so the tag YouTube uses does not matter.
 */
export function channelSection(el: Element): Element | null {
  for (let s = el.closest(SECTION_SEL); s; s = s.parentElement?.closest(SECTION_SEL) ?? null) {
    if (s.querySelectorAll(CHANNEL_LINK_SEL).length >= 2) return s;
  }
  return null;
}

function findChannelSection(): Element | null {
  const guide = document.querySelector('ytd-guide-renderer');
  const first = guide?.querySelector(CHANNEL_LINK_SEL);
  return first ? channelSection(first) : null;
}

/** Reads all channels of the section, including the ones YouTube keeps collapsed. */
export function collectChannels(section: Element | null = findChannelSection()): Channel[] {
  if (!section) return [];
  const seen = new Set<string>();
  const out: Channel[] = [];
  for (const link of section.querySelectorAll<HTMLAnchorElement>(CHANNEL_LINK_SEL)) {
    const href = link.getAttribute('href') ?? '';
    if (seen.has(href)) continue;
    seen.add(href);
    const entry = link.closest('ytd-guide-entry-renderer') || link;
    const name = textOf(entry.querySelector('.title, yt-formatted-string') || link);
    const avatar = entry.querySelector<HTMLImageElement>('yt-img-shadow img, img')?.src ?? '';
    if (name) out.push({ name, avatar, link, fresh: entry !== link && hasNewVideos(entry) });
  }
  return out;
}

/** True for a click on "Show more" or the section header in the guide's channel section. */
export function isChannelsTrigger(target: EventTarget | null): boolean {
  if (!(target instanceof Element) || !target.closest('ytd-guide-renderer')) return false;

  const header = target.closest<HTMLAnchorElement>('a[href]');
  if (header && HEADER_HREF.test(header.getAttribute('href') ?? '')) return !!channelSection(header);

  const clickable = target.closest(CLICKABLE_SEL);
  if (!clickable || clickable.id === 'collapser-item') return false;
  if (clickable.matches(CHANNEL_LINK_SEL)) return false; // a channel itself
  return MORE_RE.test(textOf(clickable)) && !!channelSection(clickable);
}

let modal: HTMLElement | null = null;
let backdrop: HTMLElement | null = null;
let lastFocus: Element | null = null;

export function closeChannels(): void {
  modal?.remove();
  backdrop?.remove();
  modal = backdrop = null;
  document.documentElement.classList.remove('ytc-channels-open');
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

export function openChannels(): void {
  if (modal) return;
  const channels = collectChannels();
  if (!channels.length) return;
  lastFocus = document.activeElement;

  // Channels with new videos first; the original order is kept inside each group
  channels.sort((a, b) => Number(b.fresh) - Number(a.fresh));
  const freshCount = channels.filter((c) => c.fresh).length;
  let onlyNew = false;
  let query = '';

  const countEl = h('span', { class: 'ytc-chan-count' });
  const list = h('ul', { class: 'ytc-chan-list', role: 'listbox', 'aria-label': 'Channels' });
  const empty = h('p', { class: 'ytc-psearch-empty', hidden: true }, 'No channels match');
  const items = channels.map((c) => {
    const open = () => {
      closeChannels();
      c.link.click(); // YouTube's own navigation, no page reload
    };
    const li = h(
      'li',
      { role: 'option', tabindex: '-1', class: 'ytc-chan', onclick: open },
      c.avatar ? h('img', { class: 'ytc-chan-avatar', src: c.avatar, alt: '', loading: 'lazy' }) : null,
      h('span', { class: 'ytc-chan-name' }, c.name),
      c.fresh ? h('span', { class: 'ytc-chan-dot', title: 'New videos', 'aria-label': 'New videos' }) : null,
    );
    li.toggleAttribute('data-fresh', c.fresh);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        open();
      }
    });
    li.dataset.search = c.name.toLowerCase();
    return li;
  });
  list.append(...items);

  const visible = () => items.filter((li) => !li.hidden);
  const filter = () => {
    const q = query.trim().toLowerCase();
    for (const li of items) {
      li.hidden =
        (!!q && !(li.dataset.search ?? '').includes(q)) || (onlyNew && !li.hasAttribute('data-fresh'));
    }
    const n = visible().length;
    countEl.textContent = q || onlyNew ? `${n} of ${items.length}` : `${items.length}`;
    empty.hidden = n > 0;
  };

  const newChip = h(
    'button',
    {
      type: 'button',
      class: 'ytc-chan-new',
      'aria-pressed': 'false',
      hidden: freshCount === 0,
      onclick: () => {
        onlyNew = !onlyNew;
        newChip.setAttribute('aria-pressed', String(onlyNew));
        filter();
      },
    },
    `Only new (${freshCount})`,
  );

  const input = h('input', {
    type: 'search',
    class: 'ytc-psearch-input',
    placeholder: 'Find a channel',
    'aria-label': 'Find a channel',
    oninput: (e: Event) => {
      query = (e.target as HTMLInputElement).value;
      filter();
    },
  }) as HTMLInputElement;

  const move = (from: Element | null, dir: 1 | -1) => {
    const v = visible();
    const i = from ? v.indexOf(from as HTMLLIElement) : -1;
    v[Math.max(0, Math.min(v.length - 1, i + dir))]?.focus();
  };

  backdrop = h('div', { class: 'ytc-backdrop ytc-chan-backdrop', onclick: closeChannels });
  modal = h(
    'div',
    { class: 'ytc-chan-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Subscriptions' },
    h(
      'header',
      { class: 'ytc-chan-head' },
      h('h2', {}, 'Subscriptions', countEl),
      newChip,
      h(
        'button',
        { type: 'button', class: 'ytc-icon-btn', 'aria-label': 'Close', onclick: closeChannels },
        icon('close'),
      ),
    ),
    h('label', { class: 'ytc-psearch-box ytc-chan-search' }, icon('search', 18), input),
    list,
    empty,
    h(
      'footer',
      { class: 'ytc-chan-foot' },
      h('a', { href: '/feed/channels', onclick: () => closeChannels() }, 'Manage all subscriptions'),
    ),
  );
  modal.addEventListener('keydown', (e) => {
    e.stopPropagation(); // keep YouTube's shortcuts out of the search box
    if (e.key === 'Escape') {
      e.preventDefault();
      closeChannels();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(document.activeElement === input ? null : document.activeElement, 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (document.activeElement?.classList.contains('ytc-chan') && visible()[0] === document.activeElement)
        input.focus();
      else move(document.activeElement, -1);
    } else if (e.key === 'Enter' && document.activeElement === input) {
      e.preventDefault();
      visible()[0]?.click();
    }
  });

  document.body.append(backdrop, modal);
  document.documentElement.classList.add('ytc-channels-open');
  filter();
  input.focus();
}

/** Captures clicks on the "Show more" row before YouTube expands the list. */
export function installChannelsModal(): void {
  const wanted = (e: Event) =>
    !!state.S.channelsModal && isChannelsTrigger(e.target) && collectChannels().length > 0;

  // YouTube reacts to its own tap gesture (pointer/mouse down and up), not only to click.
  // Listening on window in the capture phase runs before YouTube's document listeners.
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'touchend']) {
    window.addEventListener(
      type,
      (e) => {
        if (wanted(e)) e.stopImmediatePropagation();
      },
      true,
    );
  }
  window.addEventListener(
    'click',
    (e) => {
      if (!wanted(e)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      openChannels();
    },
    true,
  );
}
