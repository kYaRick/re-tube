import { CONFIG, DEFAULTS } from '../core/config';
import { h, icon, isTyping, logoIcon, scrollToComments, scrollToRelated, scrollToVideo } from '../core/dom';
import { applyPreset, detectPreset, PRESET_LABELS, type PresetId } from '../core/presets';
import {
  applyRootClasses,
  depActive,
  isPortraitActive,
  isWatch,
  saveSettings,
  state,
} from '../core/settings';

let onSettingsChangedCallback: ((key: string) => void) | null = null;
let schedulePassCallback: ((delay?: number) => void) | null = null;
let diagnosticsCollector: (() => Record<string, any>) | null = null;

export function setRuntimeCallbacks(callbacks: {
  onSettingsChanged: (key: string) => void;
  schedulePass: (delay?: number) => void;
  collectDiagnostics: () => Record<string, any>;
}): void {
  onSettingsChangedCallback = callbacks.onSettingsChanged;
  schedulePassCallback = callbacks.schedulePass;
  diagnosticsCollector = callbacks.collectDiagnostics;
}

export function cssPath(el: Element | null): string {
  if (!el || !(el instanceof Element)) return '';
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== document.documentElement && parts.length < 5) {
    let desc = cur.tagName.toLowerCase();
    if (cur.id) {
      desc += `#${cur.id}`;
    } else if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className
        .trim()
        .split(/\s+/)
        .filter((c) => !c.startsWith('ytc-') && !c.startsWith('style-scope'))
        .slice(0, 2);
      if (cls.length) desc += `.${cls.join('.')}`;
    }
    parts.unshift(desc);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

let toastEl: HTMLElement | null = null;
let toastTimer: any = 0;

export function toast(message: string): void {
  if (!document.body) return;
  if (!toastEl) {
    toastEl = h('div', { class: 'ytc-toast', role: 'status', 'aria-live': 'polite' });
  }
  if (!toastEl.isConnected) document.body.append(toastEl);
  toastEl.textContent = message;
  requestAnimationFrame(() => toastEl?.classList.add('ytc-toast--show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl?.classList.remove('ytc-toast--show'), 2600);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function exportSettings(): Promise<void> {
  const json = JSON.stringify(state.S, null, 2);
  if (await copyText(json)) {
    toast('Settings copied to the clipboard');
  } else {
    console.log(`[Re-Tube] settings\n${json}`);
    toast('Clipboard blocked, settings printed to the console');
  }
}

export function importSettings(): void {
  const raw = window.prompt('Paste exported Re-Tube settings (JSON):');
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    const next = { ...DEFAULTS };
    for (const key of Object.keys(DEFAULTS)) {
      if (key in parsed) next[key] = parsed[key];
    }
    replaceSettings(next);
    toast('Settings imported');
  } catch {
    toast('Could not import settings: invalid JSON');
  }
}

export async function copyDiagnostics(btn?: HTMLElement): Promise<void> {
  const report = diagnosticsCollector ? diagnosticsCollector() : {};
  const text = JSON.stringify(report, null, 2);
  const ok = await copyText(text);
  if (ok) {
    toast('Technical report copied to the clipboard');
  } else {
    console.log(`[Re-Tube] diagnostics\n${text}`);
    toast('Clipboard blocked; report printed to the console');
  }
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = ok ? 'Copied' : 'Printed to console';
    setTimeout(() => {
      btn.textContent = orig;
    }, 1800);
  }
}

export const SECTIONS = [
  {
    title: 'Watch page',
    icon: 'display',
    tint: ['#5cb3ff', '#2563eb'],
    items: [
      {
        key: 'classicLayout',
        type: 'bool',
        title: 'Classic layout',
        hint: 'Description and comments under the video, recommendations on the right',
        reload: true,
      },
      {
        key: 'compact',
        type: 'bool',
        title: 'Compact spacing',
        hint: 'Less empty space between blocks',
      },
      {
        key: 'autoExpand',
        type: 'bool',
        title: 'Expand description automatically',
        hint: 'Off keeps it collapsed, like YouTube does by default',
      },
      {
        key: 'floatingNav',
        type: 'bool',
        title: 'Quick navigation buttons',
        hint: 'Jump to the video or the comments, bottom right',
      },
      {
        key: 'askButton',
        type: 'bool',
        title: 'Ask (AI) button',
        hint: 'Brings it back under the video when YouTube moves it into a menu or drops it',
      },
      {
        key: 'extToolbarSpace',
        type: 'bool',
        title: 'Make room for extension toolbars',
        hint: 'Toolbars that extensions add under the player no longer cover the title',
      },
      {
        key: 'extToolbarStyle',
        type: 'bool',
        title: 'Match extension toolbar style',
        hint: 'Gives those toolbars the same card look as the page',
      },
    ],
  },
  {
    title: 'Comments',
    icon: 'comment',
    tint: ['#b49cff', '#7c3aed'],
    items: [
      {
        key: 'markCreator',
        type: 'bool',
        title: 'Highlight the channel owner',
        hint: 'Accent bar on comments and replies by the creator',
      },
      {
        key: 'markPinned',
        type: 'bool',
        title: 'Highlight the pinned comment',
        hint: 'Amber bar',
      },
      {
        key: 'markHearted',
        type: 'bool',
        title: 'Highlight creator-hearted comments',
        hint: 'Pink bar',
      },
      {
        key: 'likeChips',
        type: 'bool',
        title: 'Popularity chips',
        hint: '"Top" and "Popular" next to the author name',
      },
      {
        key: 'warmLikes',
        type: 'num',
        title: '"Popular" threshold',
        hint: 'Likes, at least',
        dependsOn: 'likeChips',
      },
      {
        key: 'hotLikes',
        type: 'num',
        title: '"Top" threshold',
        hint: 'Likes, at least',
        dependsOn: 'likeChips',
      },
      {
        key: 'commentSearch',
        type: 'bool',
        title: 'Comment search',
        hint: 'Filters loaded comments by text and author',
      },
      {
        key: 'hideSpam',
        type: 'bool',
        title: 'Hide spam',
        hint: 'Telegram and WhatsApp links, phone numbers, "DM me"',
      },
    ],
  },
  {
    title: 'Keywords',
    icon: 'tag',
    tint: ['#ffd166', '#f59e0b'],
    items: [
      {
        key: 'highlightWords',
        type: 'text',
        title: 'Highlight comments containing',
        hint: 'Comma or new line separated',
        placeholder: 'timestamp, source, fix',
      },
      {
        key: 'hideWords',
        type: 'text',
        title: 'Hide comments containing',
        hint: 'Hidden comments open with one click',
        placeholder: 'first, who is here in 2026',
      },
    ],
  },
  {
    title: 'Home feed',
    icon: 'home',
    tint: ['#4fe3cf', '#0d9488'],
    items: [
      {
        key: 'channelsModal',
        type: 'bool',
        title: 'Subscriptions window',
        hint: '"Show more" under Subscriptions opens a window with search instead of a long sidebar list',
      },
      ...CONFIG.hiddenSections.map((section) => ({
        key: `hideSection_${section.id}`,
        type: 'bool',
        title: section.label,
        hint: section.hint,
      })),
      {
        key: 'hiddenSectionTitles',
        type: 'text',
        title: 'Hide other sections by title',
        hint: 'Matches part of the heading. Comma or new line separated',
        placeholder: 'Trending, Mixes',
      },
    ],
  },
  {
    title: 'Video grid',
    icon: 'grid',
    tint: ['#6ee7a0', '#16a34a'],
    items: [
      {
        key: 'gridMode',
        type: 'choice',
        title: 'Videos per row',
        hint: 'Home, Subscriptions and channel pages',
        options: [
          ['auto', 'By width'],
          ['fixed', 'Fixed'],
          ['youtube', 'YouTube default'],
        ],
      },
      {
        key: 'gridCardWidth',
        type: 'num',
        title: 'Minimum card width',
        hint: 'Pixels. Smaller means more videos per row',
        min: 160,
        max: 800,
        step: 10,
        dependsOn: 'gridMode=auto',
      },
      {
        key: 'gridColumns',
        type: 'num',
        title: 'Videos per row',
        hint: `From 1 to ${CONFIG.grid.maxColumns}`,
        min: 1,
        max: CONFIG.grid.maxColumns,
        dependsOn: 'gridMode=fixed',
      },
    ],
  },
  {
    title: 'Portrait screen',
    icon: 'phone',
    tint: ['#ff8cc6', '#db2777'],
    items: [
      {
        key: 'portraitMode',
        type: 'choice',
        title: 'Single column',
        hint: '"Auto" turns it on when the window is taller than it is wide',
        options: [
          ['auto', 'Auto'],
          ['always', 'Always'],
          ['never', 'Never'],
        ],
      },
      {
        key: 'collapseComments',
        type: 'choice',
        title: 'Show only a few comments',
        hint: 'The rest stay behind "Show all comments"',
        options: [
          ['portrait', 'In portrait'],
          ['always', 'Always'],
          ['never', 'Never'],
        ],
      },
      {
        key: 'portraitComments',
        type: 'num',
        title: 'Threads to show',
        hint: 'Before "Show all comments"',
        dependsOn: 'collapseComments',
      },
      {
        key: 'portraitGrid',
        type: 'bool',
        title: 'Recommendations as a grid',
        hint: 'Large thumbnails in several columns, full width',
      },
    ],
  },
  {
    title: 'Videos',
    icon: 'library',
    tint: ['#ffb27a', '#ea580c'],
    items: [
      {
        key: 'dimWatched',
        type: 'bool',
        title: 'Fade watched videos',
        hint: 'Thumbnails with a watch-progress bar turn semi-transparent',
      },
      {
        key: 'compactRelated',
        type: 'bool',
        title: 'Smaller thumbnails on the right',
        hint: 'More recommendations per screen',
      },
      {
        key: 'hideShorts',
        type: 'bool',
        title: 'Hide Shorts',
        hint: 'On Home, in search, recommendations and the menu',
      },
    ],
  },
  {
    title: 'Appearance',
    icon: 'palette',
    tint: ['#ff9ad5', '#8b5cf6'],
    items: [
      {
        key: 'cardLayout',
        type: 'choice',
        title: 'Cards on the watch page',
        hint: 'Sections: the player, description and comments each sit in one card',
        options: [
          ['sections', 'Sections'],
          ['threads', 'Each comment'],
          ['none', 'Off'],
        ],
      },
      {
        key: 'motion',
        type: 'bool',
        title: 'Animations',
        hint: 'Transitions on cards, buttons and the panel',
      },
      {
        key: 'ambientMode',
        type: 'bool',
        title: 'Ambient glow around the player',
        hint: "YouTube's own glow; it uses the GPU. Needs a page reload",
      },
      {
        key: 'fluent',
        type: 'bool',
        title: 'Fluent style',
        hint: 'Acrylic surfaces, layered cards and Fluent controls',
      },
      {
        key: 'fluentReveal',
        type: 'bool',
        title: 'Reveal highlight',
        hint: 'A soft light follows the cursor over cards and buttons',
        dependsOn: 'fluent',
      },
      {
        key: 'fluentVideoCards',
        type: 'bool',
        title: 'Video cards',
        hint: 'Thumbnails lift into cards on hover',
        dependsOn: 'fluent',
      },
      {
        key: 'watchedBadge',
        type: 'bool',
        title: '"Watched" badge',
        hint: `On videos watched to ${CONFIG.fluent.watchedAt}% or more`,
      },
      { key: 'accent', type: 'color', title: 'Accent colour' },
    ],
  },
  {
    title: 'Keyboard shortcuts',
    icon: 'keyboard',
    tint: ['#a5b4cb', '#475569'],
    items: [
      {
        key: 'commandPalette',
        type: 'bool',
        title: 'Command palette',
        hint: 'Ctrl+K (or Alt+Shift+K) finds any setting or action by name',
      },
      {
        type: 'shortcuts',
        keys: [
          [['Ctrl', 'K'], 'Command palette'],
          [['Alt', 'Shift', 'Y'], 'Open or close settings'],
          [['Alt', 'Shift', 'C'], 'Jump to comments'],
          [['Alt', 'Shift', 'V'], 'Back to the video'],
          [['Alt', 'Shift', 'R'], 'Jump to recommendations (portrait)'],
          [['Esc'], 'Close settings or clear comment search'],
        ],
      },
    ],
  },
  {
    title: 'Backup & diagnostics',
    icon: 'bug',
    tint: ['#ff9b9b', '#dc2626'],
    items: [
      {
        type: 'actions',
        title: 'Settings backup',
        hint: 'Move your settings to another browser',
        buttons: [
          ['Export', exportSettings],
          ['Import', importSettings],
        ],
      },
      {
        type: 'actions',
        title: 'Something not working?',
        hint: 'Copy a technical report and send it over',
        buttons: [['Copy diagnostics', copyDiagnostics]],
      },
    ],
  },
];

let panel: HTMLElement | null = null;
let backdrop: HTMLElement | null = null;
let reloadNote: HTMLElement | null = null;
let reloadButton: HTMLElement | null = null;
let lastFocus: Element | null = null;

// classicLayout and ambientMode are read by the page once, at load
const needsReload = (): boolean =>
  state.S.classicLayout !== state.initialClassic || state.S.ambientMode !== state.initialAmbient;

function syncPresetControl(): void {
  state.S.preset = detectPreset(state.S);
  for (const b of panel?.querySelectorAll<HTMLElement>('[data-preset-control] button') ?? []) {
    b.setAttribute('aria-pressed', String(b.dataset.value === state.S.preset));
  }
}

function onSettingChanged(key: string): void {
  if (key !== 'preset') syncPresetControl();
  saveSettings();
  applyRootClasses();
  if (onSettingsChangedCallback) onSettingsChangedCallback(key);

  const reload = needsReload();
  if (reloadNote) reloadNote.hidden = !reload;
  if (reloadButton) reloadButton.hidden = !reload;

  for (const row of panel?.querySelectorAll<HTMLElement>('[data-depends-on]') ?? []) {
    row.toggleAttribute('data-disabled', !depActive(row.dataset.dependsOn ?? '', state.S));
  }
}

const rowText = (item: any, hint = item.hint): HTMLElement =>
  h(
    'span',
    { class: 'ytc-row-text' },
    h('span', { class: 'ytc-row-title' }, item.title),
    hint ? h('span', { class: 'ytc-row-hint' }, hint) : null,
  );

function buildControl(item: any): HTMLElement | HTMLElement[] | null {
  const S = state.S;
  const disabled = item.dependsOn ? !depActive(item.dependsOn, S) : null;

  if (item.type === 'bool') {
    return h(
      'label',
      { class: 'ytc-row', 'data-depends-on': item.dependsOn, 'data-disabled': disabled },
      rowText(item),
      h('input', {
        type: 'checkbox',
        role: 'switch',
        class: 'ytc-switch',
        checked: S[item.key],
        onchange: (e: any) => {
          state.S[item.key] = e.target.checked;
          onSettingChanged(item.key);
        },
      }),
    );
  }

  if (item.type === 'num') {
    return h(
      'label',
      { class: 'ytc-row', 'data-depends-on': item.dependsOn, 'data-disabled': disabled },
      rowText(item),
      h('input', {
        type: 'number',
        class: 'ytc-num',
        min: String(item.min ?? 1),
        max: item.max != null ? String(item.max) : null,
        step: String(item.step ?? 1),
        value: String(S[item.key]),
        onkeydown: (e: Event) => e.stopPropagation(),
        onchange: (e: any) => {
          const parsed = Number.parseInt(e.target.value, 10) || (DEFAULTS as any)[item.key];
          const n = Math.min(item.max ?? Number.POSITIVE_INFINITY, Math.max(item.min ?? 1, parsed));
          e.target.value = String(n);
          state.S[item.key] = n;
          onSettingChanged(item.key);
        },
      }),
    );
  }

  if (item.type === 'text') {
    let timer = 0;
    return h(
      'label',
      { class: 'ytc-row ytc-row--stack' },
      rowText(item),
      h('textarea', {
        class: 'ytc-textarea',
        rows: '2',
        placeholder: item.placeholder,
        value: S[item.key],
        onkeydown: (e: Event) => e.stopPropagation(),
        oninput: (e: any) => {
          clearTimeout(timer);
          timer = window.setTimeout(() => {
            state.S[item.key] = e.target.value;
            onSettingChanged(item.key);
          }, 350);
        },
      }),
    );
  }

  if (item.type === 'choice') {
    const seg = h('div', { class: 'ytc-seg', role: 'group', 'aria-label': item.title });
    const refresh = () => {
      for (const b of seg.querySelectorAll<HTMLElement>('button')) {
        b.setAttribute('aria-pressed', String(b.dataset.value === state.S[item.key]));
      }
    };
    for (const [value, label] of item.options) {
      seg.append(
        h(
          'button',
          {
            type: 'button',
            'data-value': value,
            onclick: () => {
              state.S[item.key] = value;
              onSettingChanged(item.key);
              refresh();
            },
          },
          label,
        ),
      );
    }
    refresh();
    return h('div', { class: 'ytc-row ytc-row--stack' }, rowText(item), seg);
  }

  if (item.type === 'actions') {
    return h(
      'div',
      { class: 'ytc-row ytc-row--static' },
      rowText(item),
      h(
        'div',
        { class: 'ytc-keys' },
        item.buttons.map(([label, run]: [string, (b: HTMLElement) => void]) =>
          h('button', { type: 'button', class: 'ytc-btn', onclick: (e: any) => run(e.currentTarget) }, label),
        ),
      ),
    );
  }

  if (item.type === 'shortcuts') {
    return item.keys.map(([keys, label]: [string[], string]) =>
      h(
        'div',
        { class: 'ytc-row ytc-row--static' },
        h('span', { class: 'ytc-row-text' }, h('span', { class: 'ytc-row-title' }, label)),
        h(
          'span',
          { class: 'ytc-keys' },
          keys.map((k) => h('kbd', { class: 'ytc-key' }, k)),
        ),
      ),
    );
  }

  if (item.type === 'color') {
    const wrap = h('div', { class: 'ytc-swatches', role: 'group', 'aria-label': 'Accent colour' });
    const refresh = () => {
      for (const b of wrap.querySelectorAll<HTMLElement>('.ytc-swatch')) {
        b.setAttribute(
          'aria-pressed',
          String((b.dataset.color ?? '').toLowerCase() === String(state.S.accent).toLowerCase()),
        );
      }
    };
    const pick = (color: string) => {
      state.S.accent = color;
      onSettingChanged('accent');
      refresh();
    };
    for (const color of CONFIG.accentPresets) {
      wrap.append(
        h('button', {
          type: 'button',
          class: 'ytc-swatch',
          style: `background:${color}`,
          'data-color': color,
          'aria-label': `Colour ${color}`,
          onclick: () => pick(color),
        }),
      );
    }
    wrap.append(
      h('input', {
        type: 'color',
        class: 'ytc-swatch-custom',
        value: S.accent,
        title: 'Custom colour',
        'aria-label': 'Custom colour',
        oninput: (e: any) => pick(e.target.value),
      }),
    );
    refresh();
    return h(
      'div',
      { class: 'ytc-row ytc-row--stack ytc-row--static' },
      h(
        'span',
        { class: 'ytc-row-text' },
        h('span', { class: 'ytc-row-title' }, item.title || 'Accent colour'),
      ),
      wrap,
    );
  }
  return null;
}

let activeTab = 0; // kept across rebuilds, so a preset change does not jump back to the first tab

const sectionTile = (section: any): HTMLElement => {
  const el = h('span', { class: 'ytc-tile', 'aria-hidden': 'true' }, icon(section.icon || 'tune', 16));
  el.style.setProperty('--c1', (section.tint || [])[0] || '#8b8b8b');
  el.style.setProperty('--c2', (section.tint || [])[1] || '#555');
  return el;
};

/** Performance / Balanced / Beauty / Custom, shown in the window header. */
function presetSegment(): HTMLElement {
  const seg = h('div', {
    class: 'ytc-seg',
    role: 'group',
    'aria-label': 'Preset',
    'data-preset-control': '',
  });
  for (const [value, label] of PRESET_LABELS) {
    seg.append(
      h(
        'button',
        {
          type: 'button',
          'data-value': value,
          title: value === 'custom' ? 'Your own mix of settings' : `Apply the ${label} preset`,
          'aria-pressed': String(state.S.preset === value),
          onclick: () => {
            if (value === 'custom') return;
            applyPreset(state.S, value as PresetId);
            onSettingChanged('preset');
            rebuildPanel(); // every control shows its new value
          },
        },
        label,
      ),
    );
  }
  return seg;
}

export function buildPanel(): void {
  backdrop = h('div', { class: 'ytc-backdrop', onclick: () => togglePanel(false) });

  const groups = SECTIONS.map((section) => {
    const group = h(
      'section',
      { class: 'ytc-group', role: 'tabpanel' },
      h('h3', {}, section.title),
      h('div', { class: 'ytc-card' }, section.items.flatMap(buildControl)),
    );
    group.dataset.search = section.title.toLowerCase();
    for (const r of group.querySelectorAll<HTMLElement>('.ytc-row')) {
      r.dataset.search = r.textContent?.toLowerCase() || '';
    }
    return group;
  });
  activeTab = Math.min(activeTab, groups.length - 1);

  const tabs = SECTIONS.map((section, i) =>
    h(
      'button',
      {
        type: 'button',
        class: 'ytc-tab',
        role: 'tab',
        'aria-selected': String(i === activeTab),
        tabindex: i === activeTab ? '0' : '-1',
        onclick: () => selectTab(i),
      },
      sectionTile(section),
      h('span', {}, section.title),
    ),
  ) as HTMLButtonElement[];

  const empty = h('p', { class: 'ytc-psearch-empty', hidden: true }, 'No matching settings');
  const body = h('main', { class: 'ytc-body' }, groups, empty);
  let query = '';

  // No query: only the active section. With a query: matches from every section; tabs without matches dim.
  const render = () => {
    const q = query.trim().toLowerCase();
    let any = false;
    groups.forEach((group, i) => {
      let visible = 0;
      const groupHit = !q || (group.dataset.search?.includes(q) ?? false);
      for (const r of group.querySelectorAll<HTMLElement>('.ytc-row')) {
        const show = groupHit || (r.dataset.search?.includes(q) ?? false);
        r.hidden = !show;
        if (show) visible++;
      }
      group.hidden = q ? visible === 0 : i !== activeTab;
      tabs[i]?.toggleAttribute('data-dim', !!q && visible === 0);
      if (!group.hidden) any = true;
    });
    empty.hidden = any;
  };

  const searchInput = h('input', {
    type: 'search',
    class: 'ytc-psearch-input',
    placeholder: 'Find a setting',
    'aria-label': 'Find a setting',
    oninput: (e: any) => {
      query = e.target.value;
      render();
    },
    onkeydown: (e: KeyboardEvent) => {
      if (e.key !== 'Escape') e.stopPropagation();
    },
  }) as HTMLInputElement;

  const selectTab = (i: number, focus = false) => {
    activeTab = i;
    tabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.tabIndex = j === i ? 0 : -1;
    });
    if (query) {
      query = '';
      searchInput.value = '';
    }
    render();
    body.scrollTop = 0;
    if (focus) tabs[i]?.focus();
  };

  const tabList = h(
    'nav',
    { class: 'ytc-tabs', role: 'tablist', 'aria-orientation': 'vertical', 'aria-label': 'Sections' },
    h('label', { class: 'ytc-psearch-box' }, icon('search', 18), searchInput),
    tabs,
  );
  const KEY_STEP: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
  tabList.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    let next: number | undefined;
    if (e.key in KEY_STEP) next = i + (KEY_STEP[e.key] ?? 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    selectTab((next + tabs.length) % tabs.length, true);
  });

  const reload = needsReload();
  reloadNote = h('p', { class: 'ytc-foot-note', hidden: !reload }, 'Some changes apply after a page reload.');
  reloadButton = h(
    'button',
    { type: 'button', class: 'ytc-btn ytc-btn--primary', hidden: !reload, onclick: () => location.reload() },
    'Reload',
  );
  const resetButton = h(
    'button',
    {
      type: 'button',
      class: 'ytc-btn',
      onclick: () => {
        replaceSettings({ ...DEFAULTS });
        toast('Settings reset to defaults');
      },
    },
    'Reset settings',
  );

  panel = h(
    'div',
    { class: 'ytc-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ytc-title' },
    h(
      'header',
      { class: 'ytc-head' },
      h(
        'div',
        { class: 'ytc-brand' },
        logoIcon(30),
        h('h2', { id: 'ytc-title' }, 'Re-Tube'),
        h('span', { class: 'ytc-version' }, `v${__RETUBE_VERSION__}`),
      ),
      presetSegment(),
      h(
        'button',
        {
          type: 'button',
          class: 'ytc-icon-btn ytc-close',
          'aria-label': 'Close',
          onclick: () => togglePanel(false),
        },
        icon('close'),
      ),
    ),
    h('div', { class: 'ytc-shell' }, tabList, body),
    h(
      'footer',
      { class: 'ytc-foot' },
      reloadNote,
      h('span', { class: 'ytc-kbd' }, 'Alt+Shift+Y settings · Ctrl+K commands'),
      reloadButton,
      resetButton,
    ),
  );

  render();
  document.body.append(backdrop, panel);
}

/** Changes one setting from outside the window (command palette) and refreshes the window. */
export function setSetting(key: string, value: unknown): void {
  state.S[key] = value;
  onSettingChanged(key);
  if (panel) rebuildPanel();
}

/** Applies a preset from outside the window (command palette). */
export function setPreset(id: PresetId): void {
  applyPreset(state.S, id);
  onSettingChanged('preset');
  if (panel) rebuildPanel();
}

export function replaceSettings(next: Record<string, any>): void {
  state.S = next;
  saveSettings();
  state.settingsRev++;
  state.gridColumnsNow = 0;
  applyRootClasses();
  rebuildPanel();
  if (schedulePassCallback) schedulePassCallback(0);
}

export function rebuildPanel(): void {
  const wasOpen = document.documentElement.classList.contains('ytc-panel-open');
  panel?.remove();
  backdrop?.remove();
  buildPanel();
  if (wasOpen) panel?.querySelector<HTMLElement>('.ytc-psearch-input')?.focus();
}

export function togglePanel(force?: boolean): void {
  if (!document.body) return;
  if (!panel) buildPanel();
  const root = document.documentElement;
  const open = force ?? !root.classList.contains('ytc-panel-open');
  root.classList.toggle('ytc-panel-open', open);
  if (open) {
    lastFocus = document.activeElement;
    panel?.querySelector<HTMLElement>('.ytc-psearch-input')?.focus();
  } else if (lastFocus && (lastFocus as HTMLElement).focus) {
    (lastFocus as HTMLElement).focus();
  }
}

let mastButton: HTMLElement | null = null;

export function ensureMastButton(): void {
  if (mastButton && mastButton.isConnected) return;
  const end = document.querySelector('ytd-masthead #end #buttons');
  if (!end) return;
  mastButton = h(
    'button',
    {
      type: 'button',
      class: 'ytc-mast-btn',
      title: 'Re-Tube settings (Alt+Shift+Y)',
      'aria-label': 'Re-Tube settings',
      onclick: () => togglePanel(),
    },
    icon('tune', 20), // monochrome like YouTube's own header icons
  );
  end.prepend(mastButton);
}

let nav: HTMLElement | null = null;
let navCount: HTMLElement | null = null;

export function ensureNav(): void {
  if (!state.S.floatingNav) {
    nav?.remove();
    nav = null;
    return;
  }
  if (nav && nav.isConnected) return;
  navCount = h('span', { class: 'ytc-nav-count' });
  nav = h(
    'div',
    { class: 'ytc-nav', role: 'toolbar', 'aria-label': 'Quick navigation' },
    h(
      'button',
      {
        type: 'button',
        title: 'Back to video (Alt+Shift+V)',
        'aria-label': 'Back to video',
        onclick: scrollToVideo,
      },
      icon('up', 22),
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'ytc-nav-comments',
        title: 'Go to comments (Alt+Shift+C)',
        'aria-label': 'Go to comments',
        onclick: scrollToComments,
      },
      icon('comment', 20),
      navCount,
    ),
    h(
      'button',
      {
        type: 'button',
        class: 'ytc-nav-related',
        title: 'Go to recommendations (Alt+Shift+R)',
        'aria-label': 'Go to recommendations',
        onclick: scrollToRelated,
      },
      icon('grid', 18),
    ),
    h(
      'button',
      {
        type: 'button',
        title: 'Re-Tube settings (Alt+Shift+Y)',
        'aria-label': 'Settings',
        onclick: () => togglePanel(),
      },
      icon('tune', 20),
    ),
  );
  document.body.append(nav);
}

export function commentCountLabel(): string {
  const el = document.querySelector(
    'ytd-comments#comments ytd-comments-header-renderer #count .count-text, ytd-comments#comments ytd-comments-header-renderer yt-formatted-string.count-text',
  );
  const text = el?.textContent || '';
  const match = text.match(/[\d\s.,\u00a0]+/);
  return match ? match[0].trim() : '';
}

export function updateNavCount(): void {
  if (!navCount) return;
  navCount.textContent = commentCountLabel();
}

// Global keyboard shortcuts
window.addEventListener(
  'keydown',
  (e) => {
    const panelOpen = document.documentElement.classList.contains('ytc-panel-open');
    if (panelOpen && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      togglePanel(false);
      return;
    }
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || isTyping(e)) return;
    const actions: Record<string, () => void> = {
      KeyY: () => togglePanel(),
      KeyC: () => isWatch() && scrollToComments(),
      KeyV: () => isWatch() && scrollToVideo(),
      KeyR: () => isWatch() && isPortraitActive() && scrollToRelated(),
    };
    const action = actions[e.code];
    if (action) {
      e.preventDefault();
      e.stopPropagation();
      action();
    }
  },
  true,
);
