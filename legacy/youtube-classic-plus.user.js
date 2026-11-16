// ==UserScript==
// @name         YouTube Classic+
// @namespace    local.yt-classic-watch
// @version      2.9.0
// @description  Classic watch layout with Fluent-style cards plus compact spacing, comment highlights and search, spam filter, responsive video grid, portrait mode and feed clean-up
// @match        https://www.youtube.com/*
// @run-at       document-start
// @inject-into  page
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  /* =====================================================================
   * USER CONFIG
   * Edit the values below to change the script's built-in behaviour.
   * Anything you change later in the settings panel (Alt+Shift+Y) is stored
   * in the browser and overrides these defaults; "Reset settings" in the
   * panel brings back exactly what is written here.
   * ===================================================================== */

  const CONFIG = {
    // Default values for every option in the settings panel
    defaults: {
      classicLayout: true,        // description and comments under the video, recommendations on the right
      compact: true,              // tighter spacing on the watch page
      autoExpand: false,          // expand the video description automatically
      floatingNav: true,          // floating "video / comments / settings" buttons
      askButton: true,            // restore the AI "Ask" button under the video
      extToolbarSpace: true,      // keep extension toolbars under the player from covering the title
      extToolbarStyle: true,      // give those toolbars the same card look
      cardLayout: 'sections',     // cards on the watch page: 'sections' | 'threads' | 'none'
      markCreator: true,          // highlight comments by the channel owner
      markPinned: true,           // highlight the pinned comment
      markHearted: true,          // highlight comments hearted by the creator
      likeChips: true,            // "Top" / "Popular" chips next to the author name
      warmLikes: 100,             // likes needed for "Popular"
      hotLikes: 1000,             // likes needed for "Top"
      commentSearch: true,        // search box above the comments
      hideSpam: true,             // hide comments matching spamPatterns below
      highlightWords: '',         // comma/new-line separated words to highlight in comments
      hideWords: '',              // comma/new-line separated words that hide a comment
      dimWatched: true,           // fade videos you have already watched
      compactRelated: true,       // smaller thumbnails in the right column
      hideShorts: false,          // hide Shorts everywhere
      portraitMode: 'auto',       // single-column watch page: 'auto' | 'always' | 'never'
      collapseComments: 'portrait', // show only a few comments: 'portrait' | 'always' | 'never'
      portraitComments: 5,        // threads shown before "Show all comments"
      portraitGrid: true,         // recommendations as a grid in single-column mode
      gridMode: 'auto',           // videos per row on Home etc: 'auto' | 'fixed' | 'youtube'
      gridCardWidth: 320,         // minimum card width in px for 'auto'
      gridColumns: 4,             // videos per row for 'fixed'
      hiddenSectionTitles: '',    // extra feed sections to hide, matched by heading text
      accent: '#3ea6ff',          // accent colour for highlights and controls
      fluent: true,               // Fluent look: acrylic surfaces, layered cards, Fluent controls
      fluentReveal: true,         // light that follows the cursor on cards and buttons
      fluentVideoCards: true,     // video thumbnails become hoverable cards
      watchedBadge: true,         // "Watched" badge on fully watched videos
    },

    // Fluent effect tuning
    fluent: {
      blur: 40,           // acrylic blur radius, px
      acrylicOpacity: 76, // surface opacity behind the blur, %
      revealRadius: 260,  // size of the cursor light, px
      watchedAt: 90,      // progress (%) from which a video counts as fully watched
    },

    // Feed sections and features that can be hidden. Each entry becomes a switch in the panel.
    //   titles:    hidden when a section heading contains any of these (case-insensitive)
    //   labels:    buttons, menu items, chips and sidebar entries whose label starts with any of these
    //   selectors: CSS selectors hidden directly (menu entries, shelves without a heading)
    hiddenSections: [
      {
        id: 'playables',
        label: 'Hide YouTube Playables',
        hint: 'Games shelf on Home and the Playables entry in the menu',
        enabled: true,
        titles: ['YouTube Playables', 'Playables'],
        labels: ['Playables'],
        selectors: [
          'ytd-rich-section-renderer:has(a[href^="/playables"])',
          'ytd-guide-entry-renderer:has(a[href^="/playables"])',
          'ytd-mini-guide-entry-renderer:has(a[href^="/playables"])',
        ],
      },
      {
        id: 'exploreTopics',
        label: 'Hide "Explore more topics"',
        hint: 'Topic suggestions block in the Home feed',
        enabled: true,
        titles: ['Explore more topics', 'Explore topics'],
        selectors: ['ytd-feed-nudge-renderer'],
      },
      {
        id: 'watchTogether',
        label: 'Hide "Watch together"',
        hint: 'Its button, menu item, sidebar entry and Home shelf',
        enabled: true,
        titles: ['Watch together'],
        labels: ['Watch together', 'Дивитися разом', 'Смотреть вместе'],
        selectors: [],
      },
      {
        id: 'news',
        label: 'Hide news shelves',
        hint: '"Breaking news" and "Top news" on Home',
        enabled: false,
        titles: ['Breaking news', 'Top news'],
        selectors: [],
      },
      {
        id: 'posts',
        label: 'Hide community posts',
        hint: '"Latest YouTube posts" shelf on Home',
        enabled: false,
        titles: ['Latest YouTube posts', 'Latest posts'],
        selectors: ['ytd-rich-section-renderer:has(ytd-post-renderer, ytd-backstage-post-thread-renderer)'],
      },
    ],

    // Comment text that counts as spam (regular expression fragments, case-insensitive)
    spamPatterns: [
      't\\.me/', 'telegram', 'whats\\s?app', 'wa\\.me/', 'viber',
      '\\+\\d[\\d\\s()-]{9,}',
      '\\b(dm|pm|text) me\\b',
      'пиши(те)? (мені|мне) в', 'пиши(те)? в (тг|телеграм)',
      'заробіток без вкладень', 'заработок без вложений',
    ],

    // Labels YouTube uses for the AI "Ask" button in your interface languages
    askLabels: ['Ask', 'Запитати', 'Спитати', 'Спросить', 'Задати питання', 'Задать вопрос'],

    // Colour presets shown in the panel
    accentPresets: ['#3ea6ff', '#8b7cf6', '#2fbf8f', '#f06aa8', '#f2a900', '#ff6b5a'],

    grid: {
      gap: 16,          // horizontal gap between cards used in the column calculation
      maxColumns: 12,   // upper limit for videos per row
      shortsRatio: 1.6, // Shorts per row relative to regular videos
    },

    portraitMaxWidth: 1400, // max content width (px) in single-column mode

    // Toolbars that other extensions put under the player. Add selectors for yours.
    extensionToolbars: {
      selectors: [
        '#efyt-control-bar',       // Enhancer for YouTube
      ],
      gap: 10,                     // space kept between the toolbar and the title, px
    },

    // Thumbnail width in the right-hand recommendations column, px
    related: {
      thumbWidth: 168,             // classic YouTube size
      compactThumbWidth: 144,      // used when "Smaller thumbnails on the right" is on
    },
    storageKey: 'ytc:settings:v2',
  };

  /* =====================================================================
   * Settings
   * ===================================================================== */

  const STORE_KEY = CONFIG.storageKey;

  const DEFAULTS = { ...CONFIG.defaults };
  for (const section of CONFIG.hiddenSections) DEFAULTS[`hideSection_${section.id}`] = !!section.enabled;

  const SETTINGS_VERSION = 4;

  const loadSettings = () => {
    let stored = {};
    try { stored = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch { stored = {}; }
    const merged = { ...DEFAULTS, ...stored };
    if ((stored._v || 0) < 3) {
      // v3: description no longer expands by default; boolean collapse became a mode
      merged.autoExpand = false;
      if ('portraitCollapse' in stored) merged.collapseComments = stored.portraitCollapse ? 'portrait' : 'never';
    }
    if ((stored._v || 0) < 4) {
      // v4: per-comment cards replaced by section cards
      merged.cardLayout = 'sections';
    }
    delete merged.portraitCollapse;
    delete merged.commentCards;
    merged._v = SETTINGS_VERSION;
    return merged;
  };

  // Settings that hold a mode string count as "off" when set to 'never'
  const isOn = (v) => !!v && v !== 'never';
  // "key" -> setting is on; "key=value" -> setting equals value
  const depActive = (dep) => {
    const [key, value] = String(dep).split('=');
    return value === undefined ? isOn(S[key]) : S[key] === value;
  };

  let S = loadSettings();
  const isWatch = () => location.pathname === '/watch';

  // Shared UI state, declared early because applyRootClasses() runs at document-start
  let searchQuery = '';
  let commentsExpanded = false;
  let lastPortrait = null;
  const portraitQuery = window.matchMedia('(orientation: portrait)');
  const isPortraitActive = () =>
    S.portraitMode === 'always' || (S.portraitMode === 'auto' && portraitQuery.matches);
  // Bumped on every settings change so cached comment results are recomputed
  let settingsRev = 0;

  const saveSettings = () => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch { /* storage full or blocked */ }
  };

  /* =====================================================================
   * Classic layout: experiment flag overrides (must run at document-start)
   * ===================================================================== */

  const FLAGS = [
    'web_watch_eligible_to_switch_to_grid',
    'web_watch_enable_single_column_grid_view',
    'web_fixed_panel_watch_next_grid_swap',
    'web_live_chat_panel_watch_next_grid_swap',
    'web_watch_fixed_default_panels',
    'web_engagement_panel_show_description',
    'web_watch_move_summary_to_sd',
    'web_watch_hero_list',
    'web_watch_split_scroll',
    'web_side_rail_dismissible_panels',
    'enable_web_side_rail',
    'kevlar_watch_hide_comments_while_panel_open',
    'kevlar_watch_cinematics',
    'disable_theater_mode',
  ];

  function lockFlags(flags) {
    if (!flags || flags.__ytcLocked) return;
    for (const name of FLAGS) {
      try {
        Object.defineProperty(flags, name, {
          get: () => false,
          set: () => {},
          configurable: true,
          enumerable: true,
        });
      } catch { /* non-configurable, skip */ }
    }
    Object.defineProperty(flags, '__ytcLocked', { value: true });
  }

  function patchConfig() {
    for (const cfg of [window.yt && window.yt.config_, window.ytcfg && window.ytcfg.data_]) {
      if (!cfg) continue;
      if (!cfg.EXPERIMENT_FLAGS) cfg.EXPERIMENT_FLAGS = {};
      lockFlags(cfg.EXPERIMENT_FLAGS);
    }
    const y = window.ytcfg;
    if (y && typeof y.set === 'function' && !y.set.__ytc) {
      const orig = y.set;
      y.set = function () {
        const result = orig.apply(this, arguments);
        patchConfig();
        return result;
      };
      y.set.__ytc = true;
    }
  }

  if (S.classicLayout) {
    patchConfig();
    const flagObserver = new MutationObserver(patchConfig);
    flagObserver.observe(document, { childList: true, subtree: true });
    window.addEventListener('DOMContentLoaded', () => {
      patchConfig();
      setTimeout(() => flagObserver.disconnect(), 3000);
    });
    for (const ev of ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated']) {
      window.addEventListener(ev, patchConfig, true);
    }
  }

  /* =====================================================================
   * Styles
   * ===================================================================== */

  const CSS = `
:root {
  --ytc-accent: #3ea6ff;
  --ytc-amber: #f2a900;
  --ytc-rose: #ff4e7a;
  --ytc-mark: #e6c229;
  --ytc-text: var(--yt-spec-text-primary, #0f0f0f);
  --ytc-muted: var(--yt-spec-text-secondary, #606060);
  --ytc-line: var(--yt-spec-10-percent-layer, rgba(127, 127, 127, .22));
  --ytc-raised: var(--yt-spec-menu-background, var(--yt-spec-raised-background, #fff));
  --ytc-font: Roboto, Arial, sans-serif;
  --ytc-font-display: "YouTube Sans", Roboto, Arial, sans-serif;
}

/* ---------- Classic layout leftovers ---------- */
html.ytc-classic .ytSideRailViewModelHost { display: none !important; }
html.ytc-classic ytd-watch-flexy { --ytd-watch-flexy-fixed-side-menu-width: 0px !important; }
html.ytc-classic ytd-watch-flexy #columns::after { width: 0 !important; display: none !important; }

/* ---------- Compact watch page ---------- */
html.ytc-compact ytd-watch-metadata { margin-top: 8px !important; }
html.ytc-compact ytd-watch-metadata #title h1 { font-size: 1.8rem !important; line-height: 2.5rem !important; }
html.ytc-compact ytd-watch-metadata #top-row { margin-top: 8px !important; }
html.ytc-compact ytd-watch-metadata #description { margin-top: 10px !important; }
html.ytc-compact ytd-comments#comments { margin-top: 12px !important; }
html.ytc-compact ytd-comments-header-renderer { margin: 12px 0 14px !important; }
html.ytc-compact ytd-comment-thread-renderer { margin-bottom: 6px !important; }
html.ytc-compact #secondary #related :is(ytd-compact-video-renderer, yt-lockup-view-model) {
  margin-top: 0 !important; margin-bottom: 6px !important;
}

/* ---------- Right column thumbnails (classic two-column layout) ---------- */
html.ytc-classic:not(.ytc-portrait) #secondary #related ytd-compact-video-renderer ytd-thumbnail {
  width: var(--ytc-rel-thumb) !important; min-width: var(--ytc-rel-thumb) !important;
  height: auto !important; aspect-ratio: 16 / 9; flex: none !important;
}
html.ytc-classic:not(.ytc-portrait) #secondary #related yt-lockup-view-model :is(.yt-lockup-view-model__content-image, .yt-lockup-view-model-wiz__content-image, [class*="ContentImage"]) {
  width: var(--ytc-rel-thumb) !important; min-width: var(--ytc-rel-thumb) !important; max-width: var(--ytc-rel-thumb) !important;
  flex: none !important;
  margin-right: 10px !important;
}
html.ytc-classic:not(.ytc-portrait) #secondary #related yt-lockup-view-model :is(.yt-lockup-view-model__metadata, .yt-lockup-view-model-wiz__metadata, [class*="LockupViewModelMetadata"]) {
  flex: 1 1 auto !important; min-width: 0 !important;
}
html.ytc-compact-related:not(.ytc-portrait) #secondary :is(#video-title.ytd-compact-video-renderer, .yt-lockup-metadata-view-model__title, .yt-lockup-metadata-view-model-wiz__title) {
  font-size: 1.35rem !important; line-height: 1.9rem !important;
}

/* ---------- Comment cards ---------- */
html.ytc-cards ytd-comments ytd-comment-thread-renderer {
  display: block;
  padding: 12px 14px 4px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--ytc-text) 3.5%, transparent);
  border: 1px solid transparent;
  margin-bottom: 10px;
  transition: border-color .15s ease;
}
html.ytc-cards ytd-comments ytd-comment-thread-renderer:hover { border-color: var(--ytc-line); }

/* ---------- Comment marks (set by script) ---------- */
[data-ytc-mark="creator"] { --ytc-bar: var(--ytc-accent); }
[data-ytc-mark="pinned"]  { --ytc-bar: var(--ytc-amber); }
[data-ytc-mark="hearted"] { --ytc-bar: var(--ytc-rose); }
[data-ytc-mark="match"]   { --ytc-bar: var(--ytc-mark); }
[data-ytc-mark] {
  display: block;
  border-radius: 10px;
  box-shadow: inset 3px 0 0 var(--ytc-bar);
  background: color-mix(in srgb, var(--ytc-bar) 9%, transparent);
  padding: 8px 10px 2px 12px !important;
}

.ytc-chip {
  display: inline-flex;
  align-items: center;
  margin-left: 8px;
  padding: 0 8px;
  height: 18px;
  border-radius: 999px;
  font: 500 1.1rem/18px var(--ytc-font);
  vertical-align: middle;
  white-space: nowrap;
}
.ytc-chip--warm { color: var(--ytc-accent); background: color-mix(in srgb, var(--ytc-accent) 15%, transparent); }
.ytc-chip--hot  { color: #1c1400; background: var(--ytc-amber); }

/* ---------- Hidden comments ---------- */
[data-ytc-hidden]:not([data-ytc-revealed]) { display: none !important; }
ytd-comment-thread-renderer:has(> #comment[data-ytc-hidden]:not([data-ytc-revealed])) > #replies { display: none !important; }
.ytc-hidden-note {
  font: 400 1.25rem/1.8rem var(--ytc-font);
  color: var(--ytc-muted);
  padding: 4px 0 10px;
  cursor: pointer;
  border-radius: 6px;
}
.ytc-hidden-note:hover { color: var(--ytc-text); }
.ytc-hidden-note:focus-visible { outline: 2px solid var(--ytc-accent); outline-offset: 2px; }

/* ---------- Comment search ---------- */
[data-ytc-filtered] { display: none !important; }
.ytc-csearch {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 4px 0 18px;
  padding: 0 14px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid var(--ytc-line);
  color: var(--ytc-muted);
  transition: border-color .15s ease;
}
.ytc-csearch:focus-within { border-color: var(--ytc-accent); color: var(--ytc-text); }
.ytc-csearch input {
  flex: 1; min-width: 0;
  border: 0; outline: 0; background: transparent;
  color: var(--ytc-text);
  font: 400 1.4rem var(--ytc-font);
}
.ytc-csearch input::placeholder { color: var(--ytc-muted); }
.ytc-csearch-count { font: 400 1.2rem var(--ytc-font); color: var(--ytc-muted); white-space: nowrap; }

/* ---------- Watched videos ---------- */
html.ytc-dim-watched :is(yt-lockup-view-model, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer:not(:has(yt-lockup-view-model))):has(ytd-thumbnail-overlay-resume-playback-renderer, yt-thumbnail-overlay-progress-bar-view-model, .ytThumbnailOverlayProgressBarHost) {
  opacity: .62;
  transition: opacity .15s ease;
}
html.ytc-dim-watched :is(yt-lockup-view-model, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer)[data-ytc-watched="full"] { opacity: .36; }
html.ytc-dim-watched :is(yt-lockup-view-model, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer):hover { opacity: 1 !important; }

html.ytc-watched-badge [data-ytc-watched="full"] :is(ytd-thumbnail:not(:has(yt-thumbnail-view-model)), yt-thumbnail-view-model) { position: relative; }
html.ytc-watched-badge [data-ytc-watched="full"] :is(ytd-thumbnail:not(:has(yt-thumbnail-view-model)), yt-thumbnail-view-model)::before {
  content: "\\2713  Watched";
  position: absolute; top: 8px; left: 8px; z-index: 5;
  padding: 0 8px;
  height: 22px;
  border-radius: 6px;
  font: 500 1.2rem/22px var(--ytc-font);
  color: #fff;
  background: rgba(16, 16, 16, .62);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .12);
  pointer-events: none;
}

/* ---------- Shorts ---------- */
html.ytc-no-shorts :is(
  ytd-reel-shelf-renderer,
  ytd-rich-shelf-renderer[is-shorts],
  ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts]),
  grid-shelf-view-model:has(a[href^="/shorts/"]),
  ytd-rich-item-renderer:has(a[href^="/shorts/"]),
  ytd-video-renderer:has(a[href^="/shorts/"]),
  ytd-compact-video-renderer:has(a[href^="/shorts/"]),
  yt-lockup-view-model:has(a[href^="/shorts/"]),
  ytd-guide-entry-renderer:has(a[href="/shorts"], a[title="Shorts"]),
  ytd-mini-guide-entry-renderer:has(a[href="/shorts"], a[title="Shorts"])
) { display: none !important; }

/* ---------- Masthead button ---------- */
.ytc-mast-btn {
  width: 40px; height: 40px;
  margin-right: 8px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 50%;
  background: transparent;
  color: var(--ytc-text);
  cursor: pointer;
}
.ytc-mast-btn:hover { background: color-mix(in srgb, var(--ytc-text) 10%, transparent); }
.ytc-mast-btn:focus-visible { outline: 2px solid var(--ytc-accent); }

/* ---------- Portrait (vertical screen): single column ---------- */
html.ytc-portrait { --ytc-portrait-max: 1400px; } /* overridden from CONFIG.portraitMaxWidth */
html.ytc-portrait ytd-watch-flexy:not([fullscreen]) #columns {
  flex-direction: column !important;
  align-items: stretch !important;
  max-width: var(--ytc-portrait-max) !important;
  margin: 0 auto !important;
}
html.ytc-portrait ytd-watch-flexy:not([fullscreen]) #primary {
  flex: none !important;
  width: auto !important; min-width: 0 !important; max-width: none !important;
  margin: 0 !important;
  padding: 24px 24px 0 !important;
}
html.ytc-portrait ytd-watch-flexy:not([fullscreen]) #secondary {
  flex: none !important;
  width: auto !important; min-width: 0 !important; max-width: none !important;
  margin: 8px 24px 0 !important;
  padding: 20px 0 24px !important;
  border-top: 1px solid var(--ytc-line);
}
/* When YouTube itself is single-column it moves related into #below: keep comments first */
html.ytc-portrait ytd-watch-flexy #below { display: flex !important; flex-direction: column; }
html.ytc-portrait ytd-watch-flexy #below > * { order: 1; }
html.ytc-portrait ytd-watch-flexy #below > ytd-watch-metadata { order: 0; }
html.ytc-portrait ytd-watch-flexy #below > ytd-comments { order: 2; }
html.ytc-portrait ytd-watch-flexy #below > #related { order: 3; }

/* Collapsed comments: extra threads and the infinite-load trigger are tagged by the script */
html.ytc-comments-collapsed [data-ytc-overflow] { display: none !important; }
.ytc-showall {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 40px;
  margin: 4px 0 20px;
  border: 1px solid var(--ytc-line); border-radius: 999px;
  background: transparent;
  color: var(--ytc-accent);
  font: 500 1.4rem var(--ytc-font);
  cursor: pointer;
}
.ytc-showall:hover { background: color-mix(in srgb, var(--ytc-accent) 10%, transparent); }
.ytc-showall:focus-visible { outline: 2px solid var(--ytc-accent); outline-offset: 2px; }
.ytc-showall[hidden], html:not(.ytc-comments-collapsed) .ytc-showall { display: none; }

/* Recommendations as a grid */
html.ytc-related-grid #related :is(ytd-item-section-renderer > #contents, ytd-watch-next-secondary-results-renderer > #items:not(:has(> ytd-item-section-renderer))) {
  display: grid !important;
  grid-template-columns: repeat(auto-fill, minmax(var(--ytc-card-min, 280px), 1fr));
  gap: 24px 16px;
}
html.ytc-related-grid #related :is(#contents, #items) > :is(ytd-continuation-item-renderer, yt-chip-cloud-renderer, ytd-reel-shelf-renderer, grid-shelf-view-model, ytd-ad-slot-renderer) {
  grid-column: 1 / -1;
}
html.ytc-related-grid #related :is(ytd-compact-video-renderer, yt-lockup-view-model) { margin: 0 !important; }
html.ytc-related-grid #related ytd-compact-video-renderer #dismissible { flex-direction: column !important; }
html.ytc-related-grid #related ytd-compact-video-renderer ytd-thumbnail {
  width: 100% !important; min-width: 0 !important; height: auto !important;
  aspect-ratio: 16 / 9;
  margin: 0 0 10px !important;
}
html.ytc-related-grid #related ytd-compact-video-renderer .details { padding: 0 !important; }
html.ytc-related-grid #related :is(.yt-lockup-view-model--horizontal, .yt-lockup-view-model-wiz--horizontal) {
  flex-direction: column !important;
}
html.ytc-related-grid #related :is(.yt-lockup-view-model__content-image, .yt-lockup-view-model-wiz__content-image) {
  width: 100% !important; min-width: 0 !important; max-width: none !important;
  margin: 0 0 10px !important;
}

/* ---------- Video grid (home, subscriptions, channels) ---------- */
/* Column count itself is written by the script into #ytc-grid-style */
html.ytc-grid ytd-browse ytd-rich-grid-row,
html.ytc-grid ytd-browse ytd-rich-grid-row > #contents { display: contents !important; }
html.ytc-grid ytd-browse ytd-rich-grid-renderer ytd-rich-item-renderer[rendered-from-rich-grid] {
  margin-left: calc(var(--ytd-rich-grid-item-margin, 16px) / 2) !important;
  margin-right: calc(var(--ytd-rich-grid-item-margin, 16px) / 2) !important;
}
html.ytc-grid ytd-two-column-browse-results-renderer:has(ytd-rich-grid-renderer) { width: auto !important; max-width: none !important; }

/* ---------- Hidden feed sections (tagged by script) ---------- */
[data-ytc-section-hidden], [data-ytc-label-hidden] { display: none !important; }

/* =====================================================================
   Fluent theme
   ===================================================================== */
:root {
  --ytc-blur: 40px;
  --ytc-acrylic: 76%;
  --ytc-reveal: 260px;
  --ytc-stroke: color-mix(in srgb, var(--ytc-text) 10%, transparent);
  --ytc-stroke-strong: color-mix(in srgb, var(--ytc-text) 16%, transparent);
  --ytc-layer: color-mix(in srgb, var(--ytc-text) 4.5%, transparent);
  --ytc-layer-hover: color-mix(in srgb, var(--ytc-text) 7.5%, transparent);
  --ytc-base: var(--yt-spec-base-background, #0f0f0f);
  --ytc-noise: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.05'/%3E%3C/svg%3E");
  --ytc-ease: cubic-bezier(.2, .8, .2, 1);
}

/* ---------- Coloured section tiles (always on) ---------- */
.ytc-group h3 { display: flex; align-items: center; gap: 12px; }
.ytc-tile {
  flex: none;
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 9px;
  color: #fff;
  background: linear-gradient(140deg, var(--c1), var(--c2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .28), 0 3px 10px color-mix(in srgb, var(--c2) 38%, transparent);
}

/* ---------- Acrylic surfaces ---------- */
html.ytc-fluent :is(.ytc-panel, .ytc-nav, .ytc-toast) {
  background-color: color-mix(in srgb, var(--ytc-raised) var(--ytc-acrylic), transparent);
  background-image: var(--ytc-noise);
  backdrop-filter: blur(var(--ytc-blur)) saturate(170%);
  -webkit-backdrop-filter: blur(var(--ytc-blur)) saturate(170%);
}
html.ytc-fluent .ytc-panel {
  border-left: 1px solid var(--ytc-stroke-strong);
  box-shadow: -24px 0 64px rgba(0, 0, 0, .32);
}
/* Mica-like accent glow behind the header */
html.ytc-fluent .ytc-panel::before {
  content: "";
  position: absolute; inset: 0 0 auto 0; height: 320px;
  pointer-events: none;
  background:
    radial-gradient(420px 220px at 8% -10%, color-mix(in srgb, var(--ytc-accent) 26%, transparent), transparent 70%),
    radial-gradient(360px 200px at 100% 0%, color-mix(in srgb, #f06aa8 14%, transparent), transparent 70%);
}
html.ytc-fluent .ytc-panel > * { position: relative; }
html.ytc-fluent .ytc-head, html.ytc-fluent .ytc-foot { border-color: var(--ytc-stroke); }
html.ytc-fluent .ytc-head h2 {
  background: linear-gradient(90deg, var(--ytc-text), color-mix(in srgb, var(--ytc-accent) 70%, var(--ytc-text)));
  -webkit-background-clip: text; background-clip: text;
  color: transparent;
}
html.ytc-fluent .ytc-backdrop { background: rgba(0, 0, 0, .28); }

/* ---------- Settings cards (Windows 11 style) ---------- */
html.ytc-fluent .ytc-group { padding-top: 22px; }
html.ytc-fluent .ytc-group + .ytc-group { border-top: 0; margin-top: 0; }
html.ytc-fluent .ytc-group h3 { margin-bottom: 10px; }
html.ytc-fluent .ytc-card { display: flex; flex-direction: column; gap: 2px; }
html.ytc-fluent .ytc-card > .ytc-row {
  padding: 12px 16px;
  border-radius: 4px;
  background: var(--ytc-layer);
  box-shadow: inset 0 0 0 1px var(--ytc-stroke);
  transition: background .18s ease;
}
html.ytc-fluent .ytc-card > .ytc-row:first-child { border-top-left-radius: 10px; border-top-right-radius: 10px; }
html.ytc-fluent .ytc-card > .ytc-row:last-child { border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; }
html.ytc-fluent .ytc-card > .ytc-row:hover { background: var(--ytc-layer-hover); }

/* ---------- Fluent controls ---------- */
html.ytc-fluent .ytc-switch {
  width: 40px; height: 20px;
  background: transparent;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ytc-text) 55%, transparent);
}
html.ytc-fluent .ytc-switch::after {
  top: 4px; left: 4px; width: 12px; height: 12px;
  background: color-mix(in srgb, var(--ytc-text) 75%, transparent);
  box-shadow: none;
  transition: transform .22s var(--ytc-ease), width .12s ease, height .12s ease, top .12s ease, background .15s ease;
}
html.ytc-fluent .ytc-switch:hover::after { width: 14px; height: 14px; top: 3px; left: 3px; }
html.ytc-fluent .ytc-switch:active::after { width: 17px; }
html.ytc-fluent .ytc-switch:checked { background: var(--ytc-accent); box-shadow: none; }
html.ytc-fluent .ytc-switch:checked::after { background: #fff; transform: translateX(20px); }
html.ytc-fluent .ytc-switch:checked:active::after { transform: translateX(17px); }

html.ytc-fluent :is(.ytc-num, .ytc-textarea, .ytc-psearch-box, .ytc-csearch) {
  border: 1px solid var(--ytc-stroke);
  border-bottom-color: color-mix(in srgb, var(--ytc-text) 38%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--ytc-text) 5%, transparent);
  transition: box-shadow .15s ease, background .15s ease;
}
html.ytc-fluent :is(.ytc-num, .ytc-textarea):focus,
html.ytc-fluent :is(.ytc-psearch-box, .ytc-csearch):focus-within {
  border-color: var(--ytc-stroke);
  background: color-mix(in srgb, var(--ytc-base) 70%, transparent);
  box-shadow: inset 0 -2px 0 var(--ytc-accent);
}
html.ytc-fluent .ytc-csearch { border-radius: 8px; }
html.ytc-fluent .ytc-btn { border-radius: 6px; box-shadow: inset 0 0 0 1px var(--ytc-stroke); background: var(--ytc-layer); }
html.ytc-fluent .ytc-btn:hover { background: var(--ytc-layer-hover); }
html.ytc-fluent .ytc-btn--primary {
  background: var(--ytc-accent); color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .22), inset 0 -1px 0 rgba(0, 0, 0, .18);
}
html.ytc-fluent .ytc-btn--primary:hover { background: color-mix(in srgb, var(--ytc-accent) 88%, #fff); }
html.ytc-fluent .ytc-seg { border-radius: 8px; box-shadow: inset 0 0 0 1px var(--ytc-stroke); }
html.ytc-fluent .ytc-seg button { border-radius: 6px; }
html.ytc-fluent .ytc-seg button[aria-pressed="true"] {
  background: var(--ytc-accent); color: #fff;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ytc-accent) 40%, transparent);
}
html.ytc-fluent :is(.ytc-btn, .ytc-icon-btn, .ytc-switch, .ytc-swatch, .ytc-seg button, .ytc-nav button, .ytc-ask, .ytc-showall):focus-visible {
  outline: 2px solid var(--ytc-text);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--ytc-base);
}

/* ---------- Panel search ---------- */
.ytc-psearch {
  position: sticky; top: 0; z-index: 3;
  margin: 0 -24px; padding: 14px 24px 6px;
  background: linear-gradient(var(--ytc-raised) 70%, transparent);
}
html.ytc-fluent .ytc-psearch { background: transparent; backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.ytc-psearch-box {
  display: flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 12px;
  border: 1px solid var(--ytc-line); border-radius: 999px;
  color: var(--ytc-muted);
}
.ytc-psearch-box input {
  flex: 1; min-width: 0;
  border: 0; outline: 0; background: transparent;
  color: var(--ytc-text);
  font: 400 1.4rem var(--ytc-font);
}
.ytc-psearch-empty { margin: 24px 0; text-align: center; font: 400 1.3rem var(--ytc-font); color: var(--ytc-muted); }
.ytc-psearch-empty[hidden], .ytc-group[hidden], .ytc-row[hidden] { display: none !important; }

/* ---------- Shortcut keys ---------- */
.ytc-keys { display: inline-flex; gap: 4px; flex: none; }
.ytc-key {
  min-width: 24px; height: 24px; padding: 0 7px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 5px;
  font: 500 1.15rem var(--ytc-font);
  color: var(--ytc-text);
  background: var(--ytc-layer);
  box-shadow: inset 0 0 0 1px var(--ytc-stroke), inset 0 -2px 0 var(--ytc-stroke-strong);
}
.ytc-row--static { cursor: default; }

/* ---------- Toast ---------- */
.ytc-toast {
  position: fixed; left: 50%; bottom: 32px; z-index: 10001;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 18px;
  border-radius: 10px;
  background: var(--ytc-raised);
  color: var(--ytc-text);
  font: 500 1.35rem var(--ytc-font);
  box-shadow: 0 0 0 1px var(--ytc-stroke-strong), 0 12px 36px rgba(0, 0, 0, .3);
  transform: translate(-50%, 16px);
  opacity: 0;
  pointer-events: none;
  transition: transform .28s var(--ytc-ease), opacity .2s ease;
}
.ytc-toast::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--ytc-accent); box-shadow: 0 0 10px var(--ytc-accent); }
.ytc-toast--show { transform: translate(-50%, 0); opacity: 1; }

/* ---------- Comment cards: layered with a reveal border ---------- */
html.ytc-fluent.ytc-cards ytd-comments ytd-comment-thread-renderer {
  --ytc-card-base: color-mix(in srgb, var(--ytc-text) 3.5%, var(--ytc-base));
  border: 1px solid transparent;
  background:
    linear-gradient(var(--ytc-card-base), var(--ytc-card-base)) padding-box,
    linear-gradient(var(--ytc-stroke), var(--ytc-stroke)) border-box;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  transition: box-shadow .22s ease;
}
html.ytc-fluent.ytc-cards ytd-comments ytd-comment-thread-renderer:hover { box-shadow: 0 6px 20px rgba(0, 0, 0, .14); }
html.ytc-reveal.ytc-cards ytd-comments ytd-comment-thread-renderer:hover {
  background:
    radial-gradient(calc(var(--ytc-reveal) * 1.6) circle at var(--ytc-mx, 50%) var(--ytc-my, 50%), color-mix(in srgb, var(--ytc-accent) 8%, transparent), transparent 70%) padding-box,
    linear-gradient(var(--ytc-card-base), var(--ytc-card-base)) padding-box,
    radial-gradient(var(--ytc-reveal) circle at var(--ytc-mx, 50%) var(--ytc-my, 50%), color-mix(in srgb, var(--ytc-accent) 60%, transparent), var(--ytc-stroke) 75%) border-box;
}
html.ytc-fluent [data-ytc-mark] {
  background: linear-gradient(90deg, color-mix(in srgb, var(--ytc-bar) 16%, transparent), color-mix(in srgb, var(--ytc-bar) 4%, transparent) 70%);
  box-shadow: inset 3px 0 0 var(--ytc-bar);
  border-radius: 8px;
}
html.ytc-fluent .ytc-chip--hot { color: #2a1300; background: linear-gradient(135deg, #ffd166, #ff8a3d); box-shadow: 0 2px 8px rgba(255, 138, 61, .35); }
html.ytc-fluent .ytc-chip--warm { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ytc-accent) 30%, transparent); }

/* ---------- Video cards ---------- */
html.ytc-fluent-videos ytd-rich-item-renderer[rendered-from-rich-grid] {
  box-sizing: border-box;
  padding: 6px 6px 2px;
  border-radius: 16px;
  transition: background .2s ease, box-shadow .22s ease;
}
html.ytc-fluent-videos ytd-rich-item-renderer[rendered-from-rich-grid]:hover {
  background: var(--ytc-layer);
  box-shadow: inset 0 0 0 1px var(--ytc-stroke), 0 10px 28px rgba(0, 0, 0, .18);
}
html.ytc-reveal.ytc-fluent-videos ytd-rich-item-renderer[rendered-from-rich-grid]:hover {
  background: radial-gradient(var(--ytc-reveal) circle at var(--ytc-mx, 50%) var(--ytc-my, 50%), color-mix(in srgb, var(--ytc-accent) 12%, transparent), var(--ytc-layer) 80%);
}
html.ytc-fluent-videos #related :is(yt-lockup-view-model, ytd-compact-video-renderer) {
  border-radius: 12px;
  transition: background .2s ease, box-shadow .2s ease;
}
html.ytc-fluent-videos #related :is(yt-lockup-view-model, ytd-compact-video-renderer):hover {
  background: var(--ytc-layer);
  box-shadow: 0 0 0 6px var(--ytc-layer);
}

/* ---------- Floating nav & Ask ---------- */
html.ytc-fluent .ytc-nav { border-radius: 14px; box-shadow: 0 0 0 1px var(--ytc-stroke-strong), 0 12px 32px rgba(0, 0, 0, .3); }
html.ytc-fluent .ytc-nav button { border-radius: 10px; }
html.ytc-reveal :is(.ytc-nav button, .ytc-ask, .ytc-showall, .ytc-card > .ytc-row):hover {
  background-image: radial-gradient(calc(var(--ytc-reveal) * .7) circle at var(--ytc-mx, 50%) var(--ytc-my, 50%), color-mix(in srgb, var(--ytc-accent) 16%, transparent), transparent 75%);
}
html.ytc-fluent .ytc-ask svg { color: var(--ytc-accent); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ytc-accent) 55%, transparent)); }
html.ytc-fluent .ytc-showall { border-radius: 8px; border-color: var(--ytc-stroke); background-color: var(--ytc-layer); }

/* ---------- Motion ---------- */
@keyframes ytc-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
html.ytc-fluent.ytc-panel-open .ytc-group { animation: ytc-rise .38s var(--ytc-ease) both; animation-delay: calc(var(--i, 0) * 28ms + 60ms); }
@media (prefers-reduced-motion: reduce) {
  html.ytc-fluent.ytc-panel-open .ytc-group { animation: none; }
  .ytc-toast, .ytc-switch::after { transition: none !important; }
}

/* ---------- Section cards: player, description, comments, recommendations ---------- */
html.ytc-sec-cards {
  --ytc-sec-base: color-mix(in srgb, var(--ytc-text) 3%, var(--ytc-base));
}
html.ytc-sec-cards :is(ytd-watch-metadata, ytd-comments#comments, ytd-watch-flexy #related, [data-ytc-sec-card]) {
  display: block;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 16px;
  background:
    linear-gradient(var(--ytc-sec-base), var(--ytc-sec-base)) padding-box,
    linear-gradient(var(--ytc-stroke), var(--ytc-stroke)) border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .1);
}
html.ytc-sec-cards ytd-watch-flexy ytd-watch-metadata { margin-top: 14px !important; padding: 14px 18px 16px !important; }
html.ytc-sec-cards ytd-watch-flexy ytd-comments#comments { margin-top: 14px !important; padding: 2px 20px 12px !important; }
html.ytc-sec-cards ytd-watch-flexy #related { padding: 12px 12px 4px !important; }
html.ytc-sec-cards [data-ytc-sec-card] { margin-top: 14px !important; padding: 10px 18px !important; }

/* ---------- Extension toolbars ---------- */
.ytc-ext-spacer { display: block; pointer-events: none; }
html.ytc-sec-cards ytd-watch-metadata #description.ytd-watch-metadata { background: var(--ytc-layer) !important; }
html.ytc-sec-cards.ytc-portrait ytd-watch-flexy:not([fullscreen]) #secondary { border-top: 0 !important; padding-top: 6px !important; }

/* The player gets depth instead of a frame */
html.ytc-sec-cards ytd-watch-flexy:not([theater]):not([fullscreen]) #ytd-player {
  border-radius: 16px;
  box-shadow: 0 0 0 1px var(--ytc-stroke), 0 16px 44px rgba(0, 0, 0, .32);
}
html.ytc-sec-cards.ytc-fluent ytd-watch-flexy:not([theater]):not([fullscreen]) #ytd-player {
  box-shadow: 0 0 0 1px var(--ytc-stroke), 0 16px 44px rgba(0, 0, 0, .32), 0 30px 90px -30px color-mix(in srgb, var(--ytc-accent) 45%, transparent);
}

/* Comments inside the section: dividers and a soft hover, no per-comment cards */
html.ytc-sec-cards ytd-comments ytd-comment-thread-renderer {
  display: block;
  margin: 0 -10px !important;
  padding: 12px 10px 2px;
  border-radius: 10px;
  transition: background .15s ease;
}
html.ytc-sec-cards ytd-comments ytd-comment-thread-renderer + ytd-comment-thread-renderer { box-shadow: inset 0 1px 0 var(--ytc-stroke); }
html.ytc-sec-cards ytd-comments ytd-comment-thread-renderer:hover { background: var(--ytc-layer); box-shadow: none; }
html.ytc-sec-cards ytd-comments ytd-comment-thread-renderer:hover + ytd-comment-thread-renderer { box-shadow: none; }

/* Fluent: deeper shadow and a reveal border that follows the cursor */
html.ytc-fluent.ytc-sec-cards :is(ytd-watch-metadata, ytd-comments#comments, ytd-watch-flexy #related, [data-ytc-sec-card]) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, .1), 0 12px 32px rgba(0, 0, 0, .12);
  transition: box-shadow .25s ease;
}
html.ytc-reveal.ytc-sec-cards :is(ytd-watch-metadata, ytd-comments#comments, ytd-watch-flexy #related, [data-ytc-sec-card]):hover {
  background:
    linear-gradient(var(--ytc-sec-base), var(--ytc-sec-base)) padding-box,
    radial-gradient(calc(var(--ytc-reveal) * 1.5) circle at var(--ytc-mx, 50%) var(--ytc-my, 50%), color-mix(in srgb, var(--ytc-accent) 55%, transparent), var(--ytc-stroke) 72%) border-box;
}

/* ---------- Ask (AI) proxy button ---------- */
.ytc-ask {
  flex: none;
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px 0 12px; margin-left: 8px;
  border: 0; border-radius: 18px;
  background: var(--yt-spec-badge-chip-background, color-mix(in srgb, var(--ytc-text) 10%, transparent));
  color: var(--ytc-text);
  font: 500 1.4rem/36px var(--ytc-font);
  white-space: nowrap;
  cursor: pointer;
}
.ytc-ask:hover { background: var(--yt-spec-button-chip-background-hover, color-mix(in srgb, var(--ytc-text) 18%, transparent)); }
.ytc-ask:focus-visible { outline: 2px solid var(--ytc-accent); outline-offset: 2px; }
.ytc-ask[aria-busy="true"] { opacity: .6; cursor: progress; }

/* ---------- Floating navigation ---------- */
.ytc-nav {
  position: fixed;
  right: 20px; bottom: 24px;
  z-index: 2020;
  display: flex; flex-direction: column; align-items: stretch;
  padding: 4px;
  border-radius: 18px;
  background: var(--ytc-raised);
  box-shadow: 0 0 0 1px var(--ytc-line), 0 8px 28px rgba(0, 0, 0, .28);
}
html:not(.ytc-portrait) .ytc-nav .ytc-nav-related,
html:not(.ytc-on-watch) .ytc-nav,
html.ytc-panel-open .ytc-nav,
ytd-app[fullscreen] ~ .ytc-nav,
html:fullscreen .ytc-nav { display: none; }
.ytc-nav button {
  min-width: 40px; height: 40px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
  border: 0; border-radius: 14px;
  background: transparent;
  color: var(--ytc-text);
  cursor: pointer;
}
.ytc-nav button:hover { background: color-mix(in srgb, var(--ytc-text) 9%, transparent); }
.ytc-nav button:focus-visible { outline: 2px solid var(--ytc-accent); outline-offset: -2px; }
.ytc-nav .ytc-nav-count { font: 500 1rem/1.2rem var(--ytc-font); color: var(--ytc-muted); }
.ytc-nav .ytc-nav-count:empty { display: none; }
.ytc-nav .ytc-nav-comments:has(.ytc-nav-count:not(:empty)) { height: 50px; }

/* ---------- Settings panel ---------- */
.ytc-backdrop {
  position: fixed; inset: 0;
  z-index: 9998;
  background: rgba(0, 0, 0, .4);
  opacity: 0; pointer-events: none;
  transition: opacity .2s ease;
}
.ytc-panel {
  position: fixed; top: 0; right: 0;
  width: min(420px, 100vw); height: 100vh;
  z-index: 9999;
  display: flex; flex-direction: column;
  background: var(--ytc-raised);
  color: var(--ytc-text);
  box-shadow: -16px 0 48px rgba(0, 0, 0, .3);
  transform: translateX(102%);
  visibility: hidden;
  transition: transform .24s cubic-bezier(.2, .8, .2, 1), visibility 0s linear .24s;
  font-family: var(--ytc-font);
}
html.ytc-panel-open .ytc-backdrop { opacity: 1; pointer-events: auto; }
html.ytc-panel-open .ytc-panel { transform: none; visibility: visible; transition: transform .24s cubic-bezier(.2, .8, .2, 1); }
@media (prefers-reduced-motion: reduce) {
  .ytc-panel, .ytc-backdrop, html.ytc-panel-open .ytc-panel { transition: none; }
}

.ytc-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 16px 14px 24px;
  border-bottom: 1px solid var(--ytc-line);
}
.ytc-head h2 { margin: 0; font: 600 2rem/2.8rem var(--ytc-font-display); letter-spacing: -.01em; }
.ytc-head p { margin: 2px 0 0; font: 400 1.2rem/1.7rem var(--ytc-font); color: var(--ytc-muted); }
.ytc-icon-btn {
  width: 40px; height: 40px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 0; border-radius: 50%;
  background: transparent; color: var(--ytc-text);
  cursor: pointer;
}
.ytc-icon-btn:hover { background: color-mix(in srgb, var(--ytc-text) 10%, transparent); }

.ytc-body { flex: 1; overflow-y: auto; padding: 0 24px 24px; overscroll-behavior: contain; }
.ytc-group { padding-top: 20px; }
.ytc-group + .ytc-group { border-top: 1px solid var(--ytc-line); margin-top: 12px; }
.ytc-group h3 { margin: 0 0 4px; font: 500 1.6rem/2.2rem var(--ytc-font-display); }

.ytc-row {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 10px 0;
  cursor: pointer;
}
.ytc-row--stack { flex-direction: column; align-items: stretch; gap: 8px; cursor: default; }
.ytc-row-text { display: flex; flex-direction: column; gap: 2px; }
.ytc-row-title { font: 400 1.4rem/2rem var(--ytc-font); }
.ytc-row-hint { font: 400 1.2rem/1.7rem var(--ytc-font); color: var(--ytc-muted); }
.ytc-row[data-disabled] { opacity: .45; pointer-events: none; }

.ytc-switch {
  appearance: none; -webkit-appearance: none;
  flex: none;
  position: relative;
  width: 36px; height: 20px; margin: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ytc-text) 22%, transparent);
  cursor: pointer;
  transition: background .15s ease;
}
.ytc-switch::after {
  content: "";
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .35);
  transition: transform .15s ease;
}
.ytc-switch:checked { background: var(--ytc-accent); }
.ytc-switch:checked::after { transform: translateX(16px); }

.ytc-num, .ytc-textarea {
  box-sizing: border-box;
  border: 1px solid var(--ytc-line);
  border-radius: 10px;
  background: transparent;
  color: var(--ytc-text);
  font: 400 1.4rem var(--ytc-font);
}
.ytc-num { width: 96px; height: 34px; padding: 0 10px; text-align: right; }
.ytc-textarea { width: 100%; min-height: 64px; padding: 8px 12px; resize: vertical; line-height: 2rem; }
.ytc-num:focus, .ytc-textarea:focus { outline: 0; border-color: var(--ytc-accent); }

.ytc-seg {
  display: inline-flex; align-self: flex-start;
  padding: 3px; gap: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ytc-text) 8%, transparent);
}
.ytc-seg button {
  height: 30px; padding: 0 14px;
  border: 0; border-radius: 999px;
  background: transparent; color: var(--ytc-muted);
  font: 500 1.3rem var(--ytc-font);
  cursor: pointer;
}
.ytc-seg button[aria-pressed="true"] { background: var(--ytc-raised); color: var(--ytc-text); box-shadow: 0 1px 3px rgba(0, 0, 0, .25); }
.ytc-seg button:focus-visible { outline: 2px solid var(--ytc-accent); outline-offset: 1px; }

.ytc-swatches { display: flex; flex-wrap: wrap; gap: 10px; padding: 8px 0 4px; }
.ytc-swatch {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 0;
  cursor: pointer;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .15);
}
.ytc-swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--ytc-raised), 0 0 0 4px var(--ytc-text); }
.ytc-swatch-custom {
  width: 28px; height: 28px; padding: 0;
  border: 1px dashed var(--ytc-muted); border-radius: 50%;
  background: transparent; cursor: pointer; overflow: hidden;
}
.ytc-swatch-custom::-webkit-color-swatch-wrapper { padding: 0; }
.ytc-swatch-custom::-webkit-color-swatch { border: 0; border-radius: 50%; }
.ytc-swatch-custom::-moz-color-swatch { border: 0; border-radius: 50%; }

.ytc-foot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 14px 24px;
  border-top: 1px solid var(--ytc-line);
}
.ytc-foot-note { flex: 1 1 100%; margin: 0 0 6px; font: 400 1.2rem/1.7rem var(--ytc-font); color: var(--ytc-muted); }
.ytc-foot-note[hidden] { display: none; }
.ytc-btn {
  height: 36px; padding: 0 16px;
  border: 0; border-radius: 999px;
  font: 500 1.4rem var(--ytc-font);
  cursor: pointer;
  background: color-mix(in srgb, var(--ytc-text) 9%, transparent);
  color: var(--ytc-text);
}
.ytc-btn:hover { background: color-mix(in srgb, var(--ytc-text) 15%, transparent); }
.ytc-btn--primary { background: var(--ytc-text); color: var(--ytc-raised); }
.ytc-btn--primary:hover { background: color-mix(in srgb, var(--ytc-text) 85%, transparent); }
.ytc-btn[hidden] { display: none; }
.ytc-panel :is(.ytc-btn, .ytc-icon-btn, .ytc-switch, .ytc-swatch, .ytc-swatch-custom):focus-visible {
  outline: 2px solid var(--ytc-accent); outline-offset: 2px;
}
.ytc-kbd { margin-left: auto; font: 400 1.2rem var(--ytc-font); color: var(--ytc-muted); }
`;

  function injectStyle() {
    const style = document.createElement('style');
    style.id = 'ytc-style';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  if (document.documentElement) injectStyle();
  else document.addEventListener('DOMContentLoaded', injectStyle, { once: true });

  const ROOT_CLASSES = {
    classicLayout: 'ytc-classic',
    compact: 'ytc-compact',
    compactRelated: 'ytc-compact-related',
    dimWatched: 'ytc-dim-watched',
    hideShorts: 'ytc-no-shorts',
    fluent: 'ytc-fluent',
    watchedBadge: 'ytc-watched-badge',
  };

  function applyRootClasses() {
    const root = document.documentElement;
    if (!root) return;
    for (const [key, cls] of Object.entries(ROOT_CLASSES)) root.classList.toggle(cls, !!S[key]);
    root.classList.toggle('ytc-on-watch', isWatch());
    root.style.setProperty('--ytc-accent', S.accent);
    root.style.setProperty('--ytc-portrait-max', `${CONFIG.portraitMaxWidth}px`);
    root.classList.toggle('ytc-reveal', !!(S.fluent && S.fluentReveal));
    root.classList.toggle('ytc-cards', S.cardLayout === 'threads');
    root.classList.toggle('ytc-sec-cards', S.cardLayout === 'sections');
    root.style.setProperty('--ytc-rel-thumb', `${S.compactRelated ? CONFIG.related.compactThumbWidth : CONFIG.related.thumbWidth}px`);
    root.classList.toggle('ytc-fluent-videos', !!(S.fluent && S.fluentVideoCards));
    root.style.setProperty('--ytc-blur', `${CONFIG.fluent.blur}px`);
    root.style.setProperty('--ytc-acrylic', `${CONFIG.fluent.acrylicOpacity}%`);
    root.style.setProperty('--ytc-reveal', `${CONFIG.fluent.revealRadius}px`);

    const portrait = isPortraitActive();
    root.classList.toggle('ytc-portrait', portrait);
    root.classList.toggle('ytc-related-grid', portrait && S.portraitGrid);
    const collapseMode = S.collapseComments === 'always' || (S.collapseComments === 'portrait' && portrait);
    root.classList.toggle('ytc-comments-collapsed', collapseMode && !commentsExpanded && !searchQuery);
    if (portrait !== lastPortrait) {
      lastPortrait = portrait;
      // Let the player recompute its size for the new column width
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  }

  // In rare cases the script runs before <html> exists
  if (document.documentElement) applyRootClasses();
  else {
    const rootWait = new MutationObserver(() => {
      if (!document.documentElement) return;
      rootWait.disconnect();
      applyRootClasses();
    });
    rootWait.observe(document, { childList: true });
  }
  portraitQuery.addEventListener('change', () => applyRootClasses());

  /* =====================================================================
   * DOM helpers (no innerHTML: YouTube enforces Trusted Types)
   * ===================================================================== */

  function h(tag, props = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const child of children.flat()) if (child != null) el.append(child);
    return el;
  }

  const ICONS = {
    tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
    comment: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    grid: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
    display: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9.5 16.5v-9l7 4.5-7 4.5z',
    tag: 'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    phone: 'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
    library: 'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z',
    palette: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    keyboard: 'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
    bug: 'M20 8h-2.81a5.985 5.985 0 0 0-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z',
    sparkle: 'M12 2Q13 11 22 12Q13 13 12 22Q11 13 2 12Q11 11 12 2Z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  };

  function icon(name, size = 24) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', ICONS[name]);
    path.setAttribute('fill', 'currentColor');
    svg.append(path);
    return svg;
  }

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTyping = (e) => {
    const t = e.target;
    return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  };

  function scrollToY(y) {
    window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
  function scrollToComments() {
    const target = document.querySelector('ytd-comments#comments');
    if (!target) return;
    const mastheadHeight = document.querySelector('#masthead-container')?.offsetHeight || 56;
    scrollToY(target.getBoundingClientRect().top + window.scrollY - mastheadHeight - 12);
  }
  const scrollToVideo = () => scrollToY(0);
  function scrollToRelated() {
    const target = document.querySelector('ytd-watch-flexy #related');
    if (!target) return;
    const mastheadHeight = document.querySelector('#masthead-container')?.offsetHeight || 56;
    scrollToY(target.getBoundingClientRect().top + window.scrollY - mastheadHeight - 12);
  }

  /* =====================================================================
   * Comments: creator / pinned / hearted marks, like chips, spam & keywords
   * ===================================================================== */

  const COMMENT_SEL = 'ytd-comments ytd-comment-view-model, ytd-comments ytd-comment-renderer';

  const SPAM_RE = new RegExp(CONFIG.spamPatterns.join('|'), 'i');

  let highlightList = [];
  let hideList = [];
  const parseList = (s) => String(s || '').split(/[\n,]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  function compileLists() {
    highlightList = parseList(S.highlightWords);
    hideList = parseList(S.hideWords);
  }
  compileLists();

  // Parses localized counters such as "1.2K", "1,2 тис.", "3 млн", "1 234"
  function parseCount(raw) {
    const t = String(raw || '').toLowerCase().replace(/\u00a0/g, ' ').trim();
    const m = t.match(/(\d[\d\s.,]*)\s*(k|тис|тыс|m|млн|b|млрд)?/);
    if (!m) return 0;
    const suffix = m[2];
    const digits = m[1].replace(/\s/g, '');
    const value = suffix ? parseFloat(digits.replace(',', '.')) : parseInt(digits.replace(/[.,]/g, ''), 10);
    const mult = !suffix ? 1 : /^(k|тис|тыс)/.test(suffix) ? 1e3 : /^(m|млн)/.test(suffix) ? 1e6 : 1e9;
    return Math.round((value || 0) * mult);
  }

  const normPath = (href) => {
    try {
      return decodeURIComponent(new URL(href, location.origin).pathname).toLowerCase().replace(/\/$/, '');
    } catch {
      return '';
    }
  };

  function channelOwnerPath() {
    const a = document.querySelector(
      'ytd-watch-metadata #owner ytd-channel-name a, ytd-watch-metadata #owner a[href^="/@"], ytd-video-owner-renderer a[href^="/@"]'
    );
    return a ? normPath(a.getAttribute('href') || '') : '';
  }

  const hiddenNotes = new WeakMap();

  function setHidden(el, hidden, reason) {
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
      const reveal = () => { el.setAttribute('data-ytc-revealed', ''); note.remove(); };
      note = h('div', {
        class: 'ytc-hidden-note',
        role: 'button',
        tabindex: '0',
        onclick: reveal,
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reveal(); } },
      });
      hiddenNotes.set(el, note);
    }
    note.textContent = `Comment hidden (${reason}). Click to show`;
    if (note.nextSibling !== el) el.before(note);
  }

  function processComment(el, owner) {
    const textEl = el.querySelector('#content-text');
    if (!textEl) return;

    const text = textEl.textContent || '';
    const author = normPath(el.querySelector('#author-text')?.getAttribute('href') || '');
    const likesRaw = (el.querySelector('#vote-count-middle')?.textContent || '').trim();
    const pinned = !!el.querySelector('ytd-pinned-comment-badge-renderer');
    const hearted = !!el.querySelector('ytd-creator-heart-renderer');

    // Comment renderers are recycled by YouTube, so cache by content rather than by element
    const sig = [settingsRev, owner, author, likesRaw, pinned, hearted, text.length, text.slice(0, 48)].join('|');
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

    el.querySelectorAll('.ytc-chip').forEach((c) => c.remove());
    if (S.likeChips) {
      const likes = parseCount(likesRaw);
      const tier = likes >= S.hotLikes ? 'hot' : likes >= S.warmLikes ? 'warm' : '';
      const header = el.querySelector('#header-author');
      if (tier && header) {
        header.append(h('span', { class: `ytc-chip ytc-chip--${tier}`, title: `${likesRaw} likes` },
          tier === 'hot' ? 'Top' : 'Popular'));
      }
    }

    const spam = S.hideSpam && SPAM_RE.test(text);
    const blocked = hideList.length > 0 && hideList.some((w) => lower.includes(w));
    setHidden(el, (spam || blocked) && !isCreator, spam ? 'looks like spam' : 'blocked word');
  }

  /* ---------- Comment search ---------- */

  let searchBar = null;
  let searchInput = null;
  let searchCount = null;

  function buildSearchBar() {
    searchCount = h('span', { class: 'ytc-csearch-count', 'aria-live': 'polite' });
    searchInput = h('input', {
      type: 'search',
      placeholder: 'Search loaded comments',
      'aria-label': 'Search comments',
      oninput: () => { searchQuery = searchInput.value.trim().toLowerCase(); applyRootClasses(); applySearch(); },
      onkeydown: (e) => {
        e.stopPropagation();
        if (e.key === 'Escape') { searchInput.value = ''; searchQuery = ''; applySearch(); searchInput.blur(); }
      },
    });
    searchBar = h('label', { class: 'ytc-csearch' }, icon('search', 20), searchInput, searchCount);
  }

  function ensureSearchBar() {
    if (!S.commentSearch) {
      searchBar?.remove();
      if (searchQuery) { searchQuery = ''; applySearch(); }
      return;
    }
    const header = document.querySelector('ytd-comments#comments ytd-comments-header-renderer');
    if (!header) return;
    if (!searchBar) buildSearchBar();
    if (header.nextElementSibling !== searchBar) header.after(searchBar);
  }

  function applySearch() {
    const threads = document.querySelectorAll('ytd-comments ytd-comment-thread-renderer');
    let shown = 0;
    for (const t of threads) {
      let match = true;
      if (searchQuery) {
        const haystack = Array.from(t.querySelectorAll('#content-text, #author-text'), (n) => n.textContent).join(' ').toLowerCase();
        match = haystack.includes(searchQuery);
      }
      if (match) { t.removeAttribute('data-ytc-filtered'); shown++; } else t.setAttribute('data-ytc-filtered', '');
    }
    if (searchCount) searchCount.textContent = searchQuery ? `${shown} of ${threads.length}` : '';
  }

  function resetSearch() {
    searchQuery = '';
    applyRootClasses();
    if (searchInput) searchInput.value = '';
    applySearch();
  }

  /* =====================================================================
   * Description auto-expand
   * ===================================================================== */

  let expandedFor = '';
  let navigatedAt = Date.now();

  function autoExpandDescription() {
    if (!S.autoExpand) return;
    const vid = new URLSearchParams(location.search).get('v');
    if (!vid || expandedFor === vid) return;
    const expander = document.querySelector('ytd-watch-metadata ytd-text-inline-expander');
    if (!expander) return;
    if (expander.hasAttribute('is-expanded')) {
      // Metadata can lag behind navigation; only trust the expanded state after it settles
      if (Date.now() - navigatedAt > 3000) expandedFor = vid;
      return;
    }
    const btn = expander.querySelector('#expand');
    if (btn && btn.offsetParent !== null) {
      btn.click();
      expandedFor = vid;
    }
  }

  /* =====================================================================
   * Floating navigation & masthead button
   * ===================================================================== */

  let nav = null;
  let navCount = null;
  let mastButton = null;

  function ensureNav() {
    if (!S.floatingNav) { nav?.remove(); nav = null; return; }
    if (nav && nav.isConnected) return;
    navCount = h('span', { class: 'ytc-nav-count' });
    nav = h('div', { class: 'ytc-nav', role: 'toolbar', 'aria-label': 'Quick navigation' },
      h('button', { type: 'button', title: 'Back to video (Alt+Shift+V)', 'aria-label': 'Back to video', onclick: scrollToVideo }, icon('up', 22)),
      h('button', { type: 'button', class: 'ytc-nav-comments', title: 'Go to comments (Alt+Shift+C)', 'aria-label': 'Go to comments', onclick: scrollToComments },
        icon('comment', 20), navCount),
      h('button', { type: 'button', class: 'ytc-nav-related', title: 'Go to recommendations (Alt+Shift+R)', 'aria-label': 'Go to recommendations', onclick: scrollToRelated }, icon('grid', 18)),
      h('button', { type: 'button', title: 'Classic+ settings (Alt+Shift+Y)', 'aria-label': 'Settings', onclick: () => togglePanel() }, icon('tune', 20)),
    );
    document.body.append(nav);
  }

  function commentCountLabel() {
    const raw = document.querySelector('ytd-comments-header-renderer #count')?.textContent || '';
    const m = raw.replace(/\u00a0/g, ' ').match(/\d[\d\s.,]*\s*(k|тис\.?|тыс\.?|m|млн)?/i);
    return m ? m[0].replace(/\s+/g, ' ').trim() : '';
  }

  function updateNavCount() {
    if (!navCount) return;
    const value = commentCountLabel();
    if (navCount.textContent !== value) navCount.textContent = value;
  }

  let showAllButton = null;

  // Finds the list that holds top-level comment threads without relying on one tag name
  function findCommentList() {
    const root = document.querySelector('ytd-comments#comments');
    const firstText = root && root.querySelector('#content-text');
    if (!firstText) return null;
    let node = firstText.closest('ytd-comment-thread-renderer, yt-comment-thread-view-model');
    if (!node) {
      node = firstText;
      while (node.parentElement && node.parentElement !== root) {
        const parent = node.parentElement;
        let withText = 0;
        for (const child of parent.children) if (child.querySelector('#content-text')) withText++;
        if (withText >= 2) break;
        node = parent;
      }
    }
    const container = node.parentElement;
    if (!container) return null;
    const threads = Array.from(container.children).filter((c) => c.querySelector('#content-text'));
    const loaders = Array.from(container.children).filter((c) =>
      c.matches('ytd-continuation-item-renderer, [class*="continuation" i]'));
    return { container, threads, loaders };
  }

  function ensureShowAll() {
    const list = findCommentList();
    if (!list) return;
    const limit = Math.max(1, S.portraitComments | 0);

    list.threads.forEach((t, i) => {
      if (i >= limit) t.setAttribute('data-ytc-overflow', '');
      else t.removeAttribute('data-ytc-overflow');
    });
    // Hide the infinite-load trigger only once some comments exist, otherwise they never load
    list.loaders.forEach((l) => l.toggleAttribute('data-ytc-overflow', list.threads.length > 0));

    if (!showAllButton) {
      showAllButton = h('button', {
        type: 'button', class: 'ytc-showall',
        onclick: () => { commentsExpanded = true; applyRootClasses(); },
      });
    }
    const hasMore = list.threads.length > limit || (list.threads.length > 0 && list.loaders.length > 0);
    showAllButton.hidden = !hasMore;
    const total = commentCountLabel();
    const text = total ? `Show all comments (${total})` : 'Show all comments';
    if (showAllButton.textContent !== text) showAllButton.textContent = text;
    if (list.container.nextElementSibling !== showAllButton) list.container.after(showAllButton);
  }

  function ensureMastButton() {
    if (mastButton && mastButton.isConnected) return;
    const buttons = document.querySelector('ytd-masthead #end #buttons');
    if (!buttons) return;
    mastButton = h('button', {
      type: 'button',
      class: 'ytc-mast-btn',
      title: 'Classic+ settings (Alt+Shift+Y)',
      'aria-label': 'Classic+ settings',
      onclick: () => togglePanel(),
    }, icon('tune'));
    buttons.prepend(mastButton);
  }

  /* =====================================================================
   * Ask (AI) button
   * The classic layout can drop the native button or push it into the
   * overflow menu, so a proxy button is added that triggers the original.
   * ===================================================================== */

  const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const ASK_ALT = CONFIG.askLabels.map(escapeRe).join('|');
  const ASK_RE = new RegExp(`^(${ASK_ALT})(\\s|$)`, 'i');
  const ASK_JSON_RE = new RegExp(`"(?:text|title|label|simpleText|accessibilityText|content)":"(?:${ASK_ALT})(?:"|\\s)|youchat`, 'i');
  const ASK_ITEM_SEL = 'ytd-menu-service-item-renderer, ytd-menu-navigation-item-renderer, yt-list-item-view-model, tp-yt-paper-item';

  const labelOf = (el) =>
    (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim();
  const isVisible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function findNativeAsk() {
    const nodes = document.querySelectorAll(
      ':is(ytd-watch-metadata, ytd-watch-flexy #panels, .ytSideRailViewModelHost) :is(button, [role="button"])'
    );
    let fallback = null;
    for (const el of nodes) {
      if (el.closest('.ytc-ask, ytd-masthead, ytd-comments, #related')) continue;
      const label = labelOf(el);
      if (!label || label.length > 40 || !ASK_RE.test(label)) continue;
      const inActions = !!el.closest('ytd-watch-metadata #actions');
      const visible = isVisible(el);
      if (inActions && visible) return { el, label, inActions, visible };
      if (!fallback) fallback = { el, label, inActions, visible };
    }
    return fallback;
  }

  const askProbe = { vid: '', found: false, checkedAt: 0 };

  function menuHasAsk() {
    const vid = new URLSearchParams(location.search).get('v') || '';
    if (askProbe.vid === vid && (askProbe.found || Date.now() - askProbe.checkedAt < 2000)) return askProbe.found;
    const menu = document.querySelector('ytd-watch-metadata ytd-menu-renderer');
    const data = menu && (menu.data || (menu.__data && menu.__data.data));
    let found = false;
    if (data) {
      try { found = ASK_JSON_RE.test(JSON.stringify(data)); } catch { found = false; }
    }
    Object.assign(askProbe, { vid, found, checkedAt: Date.now() });
    return found;
  }

  function askPanel() {
    return document.querySelector(
      'ytd-engagement-panel-section-list-renderer:is([target-id*="youchat" i], [target-id*="ask" i], [target-id*="conversation" i])'
    );
  }

  async function clickAskViaOverflow() {
    const more = document.querySelector(
      'ytd-watch-metadata #actions ytd-menu-renderer :is(#button-shape button, yt-icon-button#button button, yt-button-shape > button[aria-haspopup])'
    );
    if (!more) return false;
    more.click();
    for (let i = 0; i < 20; i++) {
      await sleep(50);
      const items = document.querySelectorAll(`ytd-popup-container tp-yt-iron-dropdown:not([aria-hidden="true"]) :is(${ASK_ITEM_SEL})`);
      for (const item of items) {
        if (ASK_RE.test(labelOf(item))) {
          (item.querySelector('tp-yt-paper-item, [role="menuitem"]') || item).click();
          return true;
        }
      }
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
    return false;
  }

  function openAskPanel(panelEl) {
    const expanded = 'ENGAGEMENT_PANEL_VISIBILITY_EXPANDED';
    try { panelEl.visibility = expanded; } catch { /* read-only in some builds */ }
    panelEl.setAttribute('visibility', expanded);
    panelEl.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

  let askButton = null;
  let askLabel = null;

  async function triggerAsk() {
    if (askButton.getAttribute('aria-busy') === 'true') return;
    askButton.setAttribute('aria-busy', 'true');
    try {
      const native = findNativeAsk();
      if (native) { native.el.click(); return; }
      if (await clickAskViaOverflow()) return;
      const p = askPanel();
      if (p) { openAskPanel(p); return; }
      askButton.title = 'YouTube offers no Ask for this video';
    } finally {
      askButton.removeAttribute('aria-busy');
    }
  }

  function ensureAskButton() {
    const host = document.querySelector('ytd-watch-metadata #top-level-buttons-computed');
    if (!S.askButton || !host) { if (!S.askButton) askButton?.remove(); return; }

    const native = findNativeAsk();
    if (native && native.inActions && native.visible) { askButton?.remove(); return; }

    const available = !!native || menuHasAsk() || !!askPanel();
    if (!available) { askButton?.remove(); return; }

    if (!askButton) {
      askLabel = h('span', {}, 'Ask');
      askButton = h('button', {
        type: 'button', class: 'ytc-ask', 'aria-label': 'Ask AI about this video',
        onclick: () => triggerAsk(),
      }, icon('sparkle', 20), askLabel);
    }
    const text = native && native.label.length <= 20 ? native.label : 'Ask';
    if (askLabel.textContent !== text) askLabel.textContent = text;
    if (askButton.parentNode !== host) host.append(askButton);
  }

  /* ---------- Diagnostics ---------- */

  function cssPath(el) {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 6; n = n.parentElement) {
      let part = n.tagName.toLowerCase();
      if (n.id) part += `#${n.id}`;
      else if (n.classList.length) part += `.${Array.from(n.classList).slice(0, 2).join('.')}`;
      parts.unshift(part);
    }
    return parts.join(' > ');
  }

  function collectDiagnostics() {
    const candidates = [];
    document.querySelectorAll('button, [role="button"], a').forEach((el) => {
      if (candidates.length >= 30 || el.closest('.ytc-panel')) return;
      const label = labelOf(el);
      if (label && label.length < 60 && (ASK_RE.test(label) || /\bask\b|gemini|youchat/i.test(label))) {
        candidates.push({ tag: el.tagName.toLowerCase(), label, visible: isVisible(el), path: cssPath(el) });
      }
    });
    const { highlightWords, hideWords, ...settings } = S;
    return {
      script: 'YouTube Classic+ 2.9.0',
      page: location.pathname,
      settings,
      menuHasAsk: isWatch() ? menuHasAsk() : null,
      askCandidates: candidates,
      engagementPanels: Array.from(document.querySelectorAll('ytd-engagement-panel-section-list-renderer'), (p) => ({
        targetId: p.getAttribute('target-id'),
        visibility: p.getAttribute('visibility'),
      })),
      sideRailPresent: !!document.querySelector('.ytSideRailViewModelHost'),
      portrait: { matches: portraitQuery.matches, active: isPortraitActive(), viewport: `${innerWidth}x${innerHeight}` },
      comments: (() => {
        const list = findCommentList();
        return {
          collapsedClass: document.documentElement.classList.contains('ytc-comments-collapsed'),
          expandedByUser: commentsExpanded,
          containerPath: list ? cssPath(list.container) : null,
          threadTags: list ? Array.from(new Set(list.threads.map((t) => t.tagName.toLowerCase()))) : [],
          threads: list ? list.threads.length : 0,
          loaders: list ? list.loaders.length : 0,
        };
      })(),
      grid: (() => {
        const grid = visibleRichGrid();
        return {
          mode: S.gridMode,
          columns: gridColumnsNow,
          availableWidth: grid ? Math.round(gridAvailableWidth(grid)) : null,
          hasRows: !!document.querySelector('ytd-rich-grid-row'),
          inlineVar: grid ? grid.style.getPropertyValue('--ytd-rich-grid-items-per-row') : null,
        };
      })(),
      extensionToolbars: extensionToolbars().map((el) => ({ path: cssPath(el), position: getComputedStyle(el).position, height: el.offsetHeight })),
      spacer: extShift,
      below: (() => {
        const below = document.querySelector('ytd-watch-flexy #below');
        return below ? Array.from(below.children, (c) => ({
          tag: c.tagName.toLowerCase(), id: c.id || null, height: c.offsetHeight, card: c.hasAttribute('data-ytc-sec-card'),
        })) : null;
      })(),
      related: (() => {
        const rel = document.querySelector('ytd-watch-flexy #related');
        const item = rel && rel.querySelector('yt-lockup-view-model, ytd-compact-video-renderer, ytd-rich-item-renderer');
        const thumb = item && item.querySelector('yt-thumbnail-view-model, ytd-thumbnail, img');
        return rel ? {
          width: rel.offsetWidth,
          richGrid: !!rel.querySelector('ytd-rich-grid-renderer'),
          item: item ? cssPath(item) : null,
          itemChildren: item ? Array.from(item.querySelectorAll('*')).slice(0, 12).map((n) => `${n.tagName.toLowerCase()}${n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`) : [],
          thumbWidth: thumb ? Math.round(thumb.getBoundingClientRect().width) : null,
        } : null;
      })(),
      descriptionExpanded: !!document.querySelector('ytd-watch-metadata ytd-text-inline-expander[is-expanded]'),
      actionsPath: (() => { const a = document.querySelector('ytd-watch-metadata #actions'); return a ? cssPath(a) : null; })(),
    };
  }

  let toastEl = null;
  let toastTimer = 0;
  function toast(message) {
    if (!document.body) return;
    if (!toastEl) toastEl = h('div', { class: 'ytc-toast', role: 'status', 'aria-live': 'polite' });
    if (!toastEl.isConnected) document.body.append(toastEl);
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add('ytc-toast--show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('ytc-toast--show'), 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async function exportSettings() {
    const json = JSON.stringify(S, null, 2);
    if (await copyText(json)) toast('Settings copied to the clipboard');
    else { console.log('[YouTube Classic+] settings\n' + json); toast('Clipboard blocked, settings printed to the console'); }
  }

  function importSettings() {
    const raw = window.prompt('Paste exported Classic+ settings (JSON):');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
      const next = { ...DEFAULTS };
      for (const key of Object.keys(DEFAULTS)) if (key in parsed) next[key] = parsed[key];
      replaceSettings(next);
      toast('Settings imported');
    } catch {
      toast('That does not look like exported settings');
    }
  }

  async function copyDiagnostics(btn) {
    const json = JSON.stringify(collectDiagnostics(), null, 2);
    if (await copyText(json)) toast('Diagnostics copied to the clipboard');
    else { console.log('[YouTube Classic+] diagnostics\n' + json); toast('Clipboard blocked, report printed to the console (F12)'); }
  }

  /* =====================================================================
   * Settings panel
   * ===================================================================== */

  const SECTIONS = [
    {
      title: 'Watch page', icon: 'display', tint: ['#5cb3ff', '#2563eb'],
      items: [
        { key: 'classicLayout', type: 'bool', title: 'Classic layout', hint: 'Description and comments under the video, recommendations on the right', reload: true },
        { key: 'compact', type: 'bool', title: 'Compact spacing', hint: 'Less empty space between blocks' },
        { key: 'autoExpand', type: 'bool', title: 'Expand description automatically', hint: 'Off keeps it collapsed, like YouTube does by default' },
        { key: 'floatingNav', type: 'bool', title: 'Quick navigation buttons', hint: 'Jump to the video or the comments, bottom right' },
        { key: 'askButton', type: 'bool', title: 'Ask (AI) button', hint: 'Brings it back under the video when YouTube moves it into a menu or drops it' },
        { key: 'extToolbarSpace', type: 'bool', title: 'Make room for extension toolbars', hint: 'Toolbars that extensions add under the player (Enhancer for YouTube and others) no longer cover the title. Detected automatically' },
        { key: 'extToolbarStyle', type: 'bool', title: 'Match extension toolbar style', hint: 'Gives those toolbars the same card look as the page' },
      ],
    },
    {
      title: 'Comments', icon: 'comment', tint: ['#b49cff', '#7c3aed'],
      items: [
        { key: 'markCreator', type: 'bool', title: 'Highlight the channel owner', hint: 'Accent bar on comments and replies by the creator' },
        { key: 'markPinned', type: 'bool', title: 'Highlight the pinned comment', hint: 'Amber bar' },
        { key: 'markHearted', type: 'bool', title: 'Highlight creator-hearted comments', hint: 'Pink bar' },
        { key: 'likeChips', type: 'bool', title: 'Popularity chips', hint: '"Top" and "Popular" next to the author name' },
        { key: 'warmLikes', type: 'num', title: '"Popular" threshold', hint: 'Likes, at least', dependsOn: 'likeChips' },
        { key: 'hotLikes', type: 'num', title: '"Top" threshold', hint: 'Likes, at least', dependsOn: 'likeChips' },
        { key: 'commentSearch', type: 'bool', title: 'Comment search', hint: 'Filters loaded comments by text and author' },
        { key: 'hideSpam', type: 'bool', title: 'Hide spam', hint: 'Telegram and WhatsApp links, phone numbers, "DM me"' },
      ],
    },
    {
      title: 'Keywords', icon: 'tag', tint: ['#ffd166', '#f59e0b'],
      items: [
        { key: 'highlightWords', type: 'text', title: 'Highlight comments containing', hint: 'Comma or new line separated', placeholder: 'timestamp, source, fix' },
        { key: 'hideWords', type: 'text', title: 'Hide comments containing', hint: 'Hidden comments open with one click', placeholder: 'first, who is here in 2026' },
      ],
    },
    {
      title: 'Home feed', icon: 'home', tint: ['#4fe3cf', '#0d9488'],
      items: [
        ...CONFIG.hiddenSections.map((section) => ({
          key: `hideSection_${section.id}`, type: 'bool', title: section.label, hint: section.hint,
        })),
        { key: 'hiddenSectionTitles', type: 'text', title: 'Hide other sections by title', hint: 'Matches part of the heading. Comma or new line separated', placeholder: 'Trending, Mixes' },
      ],
    },
    {
      title: 'Video grid', icon: 'grid', tint: ['#6ee7a0', '#16a34a'],
      items: [
        { key: 'gridMode', type: 'choice', title: 'Videos per row', hint: 'Home, Subscriptions and channel pages', options: [['auto', 'By width'], ['fixed', 'Fixed'], ['youtube', 'YouTube default']] },
        { key: 'gridCardWidth', type: 'num', title: 'Minimum card width', hint: 'Pixels. Smaller means more videos per row', min: 160, max: 800, step: 10, dependsOn: 'gridMode=auto' },
        { key: 'gridColumns', type: 'num', title: 'Videos per row', hint: `From 1 to ${CONFIG.grid.maxColumns}`, min: 1, max: CONFIG.grid.maxColumns, dependsOn: 'gridMode=fixed' },
      ],
    },
    {
      title: 'Portrait screen', icon: 'phone', tint: ['#ff8cc6', '#db2777'],
      items: [
        { key: 'portraitMode', type: 'choice', title: 'Single column', hint: '"Auto" turns it on when the window is taller than it is wide', options: [['auto', 'Auto'], ['always', 'Always'], ['never', 'Never']] },
        { key: 'collapseComments', type: 'choice', title: 'Show only a few comments', hint: 'The rest stay behind "Show all comments", so recommendations are closer', options: [['portrait', 'In portrait'], ['always', 'Always'], ['never', 'Never']] },
        { key: 'portraitComments', type: 'num', title: 'Threads to show', hint: 'Before "Show all comments"', dependsOn: 'collapseComments' },
        { key: 'portraitGrid', type: 'bool', title: 'Recommendations as a grid', hint: 'Large thumbnails in several columns, full width' },
      ],
    },
    {
      title: 'Videos', icon: 'library', tint: ['#ffb27a', '#ea580c'],
      items: [
        { key: 'dimWatched', type: 'bool', title: 'Fade watched videos', hint: 'Thumbnails with a watch-progress bar turn semi-transparent' },
        { key: 'compactRelated', type: 'bool', title: 'Smaller thumbnails on the right', hint: 'More recommendations per screen' },
        { key: 'hideShorts', type: 'bool', title: 'Hide Shorts', hint: 'On Home, in search, recommendations and the menu' },
      ],
    },
    {
      title: 'Appearance', icon: 'palette', tint: ['#ff9ad5', '#8b5cf6'],
      items: [
        { key: 'cardLayout', type: 'choice', title: 'Cards on the watch page', hint: 'Sections: the player, description, comments and recommendations each sit in one card', options: [['sections', 'Sections'], ['threads', 'Each comment'], ['none', 'Off']] },
        { key: 'fluent', type: 'bool', title: 'Fluent style', hint: 'Acrylic surfaces, layered cards and Fluent controls' },
        { key: 'fluentReveal', type: 'bool', title: 'Reveal highlight', hint: 'A soft light follows the cursor over cards and buttons', dependsOn: 'fluent' },
        { key: 'fluentVideoCards', type: 'bool', title: 'Video cards', hint: 'Thumbnails lift into cards on hover', dependsOn: 'fluent' },
        { key: 'watchedBadge', type: 'bool', title: '"Watched" badge', hint: `On videos watched to ${CONFIG.fluent.watchedAt}% or more` },
        { key: 'accent', type: 'color', title: 'Accent colour' },
      ],
    },
    {
      title: 'Keyboard shortcuts', icon: 'keyboard', tint: ['#a5b4cb', '#475569'],
      items: [{
        type: 'shortcuts',
        keys: [
          [['Alt', 'Shift', 'Y'], 'Open or close settings'],
          [['Alt', 'Shift', 'C'], 'Jump to comments'],
          [['Alt', 'Shift', 'V'], 'Back to the video'],
          [['Alt', 'Shift', 'R'], 'Jump to recommendations (portrait)'],
          [['Esc'], 'Close settings or clear comment search'],
        ],
      }],
    },
    {
      title: 'Backup & diagnostics', icon: 'bug', tint: ['#ff9b9b', '#dc2626'],
      items: [
        { type: 'actions', title: 'Settings backup', hint: 'Move your settings to another browser', buttons: [['Export', exportSettings], ['Import', importSettings]] },
        { type: 'actions', title: 'Something not working?', hint: 'Copy a technical report and send it over. Your keyword lists are not included', buttons: [['Copy diagnostics', copyDiagnostics]] },
      ],
    },
  ];

  const ACCENTS = CONFIG.accentPresets;

  let panel = null;
  let backdrop = null;
  let reloadNote = null;
  let reloadButton = null;
  let lastFocus = null;
  const initialClassic = S.classicLayout;

  function onSettingChanged(key) {
    saveSettings();
    if (key === 'highlightWords' || key === 'hideWords') compileLists();
    settingsRev++;
    gridColumnsNow = 0;
    applyRootClasses();
    if (key === 'classicLayout') {
      const changed = S.classicLayout !== initialClassic;
      reloadNote.hidden = !changed;
      reloadButton.hidden = !changed;
    }
    panel?.querySelectorAll('[data-depends-on]').forEach((row) => {
      row.toggleAttribute('data-disabled', !depActive(row.dataset.dependsOn));
    });
    schedulePass(0);
  }

  function buildControl(item) {
    if (item.type === 'bool') {
      return h('label', { class: 'ytc-row', 'data-depends-on': item.dependsOn, 'data-disabled': item.dependsOn ? !depActive(item.dependsOn) : null },
        h('span', { class: 'ytc-row-text' },
          h('span', { class: 'ytc-row-title' }, item.title),
          item.hint ? h('span', { class: 'ytc-row-hint' }, item.hint) : null),
        h('input', {
          type: 'checkbox', role: 'switch', class: 'ytc-switch', checked: S[item.key],
          onchange: (e) => { S[item.key] = e.target.checked; onSettingChanged(item.key); },
        }));
    }

    if (item.type === 'num') {
      return h('label', { class: 'ytc-row', 'data-depends-on': item.dependsOn, 'data-disabled': !depActive(item.dependsOn) },
        h('span', { class: 'ytc-row-text' },
          h('span', { class: 'ytc-row-title' }, item.title),
          h('span', { class: 'ytc-row-hint' }, item.hint)),
        h('input', {
          type: 'number', class: 'ytc-num', min: String(item.min ?? 1), max: item.max != null ? String(item.max) : null, step: String(item.step ?? 1), value: String(S[item.key]),
          onkeydown: (e) => e.stopPropagation(),
          onchange: (e) => {
            const parsed = parseInt(e.target.value, 10) || DEFAULTS[item.key];
            const n = Math.min(item.max ?? Infinity, Math.max(item.min ?? 1, parsed));
            e.target.value = String(n);
            S[item.key] = n;
            onSettingChanged(item.key);
          },
        }));
    }

    if (item.type === 'text') {
      let timer = 0;
      return h('label', { class: 'ytc-row ytc-row--stack' },
        h('span', { class: 'ytc-row-text' },
          h('span', { class: 'ytc-row-title' }, item.title),
          h('span', { class: 'ytc-row-hint' }, item.hint)),
        h('textarea', {
          class: 'ytc-textarea', rows: '2', placeholder: item.placeholder, value: S[item.key],
          onkeydown: (e) => e.stopPropagation(),
          oninput: (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => { S[item.key] = e.target.value; onSettingChanged(item.key); }, 350);
          },
        }));
    }

    if (item.type === 'choice') {
      const seg = h('div', { class: 'ytc-seg', role: 'group', 'aria-label': item.title });
      const refresh = () => seg.querySelectorAll('button').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.value === S[item.key]));
      });
      for (const [value, label] of item.options) {
        seg.append(h('button', {
          type: 'button', 'data-value': value,
          onclick: () => { S[item.key] = value; onSettingChanged(item.key); refresh(); },
        }, label));
      }
      refresh();
      return h('div', { class: 'ytc-row ytc-row--stack' },
        h('span', { class: 'ytc-row-text' },
          h('span', { class: 'ytc-row-title' }, item.title),
          h('span', { class: 'ytc-row-hint' }, item.hint)),
        seg);
    }

    if (item.type === 'actions') {
      return h('div', { class: 'ytc-row ytc-row--static' },
        h('span', { class: 'ytc-row-text' },
          h('span', { class: 'ytc-row-title' }, item.title),
          h('span', { class: 'ytc-row-hint' }, item.hint)),
        h('div', { class: 'ytc-keys' }, item.buttons.map(([label, run]) =>
          h('button', { type: 'button', class: 'ytc-btn', onclick: (e) => run(e.currentTarget) }, label))));
    }

    if (item.type === 'shortcuts') {
      return item.keys.map(([keys, label]) => h('div', { class: 'ytc-row ytc-row--static' },
        h('span', { class: 'ytc-row-text' }, h('span', { class: 'ytc-row-title' }, label)),
        h('span', { class: 'ytc-keys' }, keys.map((k) => h('kbd', { class: 'ytc-key' }, k)))));
    }

    if (item.type === 'color') {
      const wrap = h('div', { class: 'ytc-swatches', role: 'group', 'aria-label': 'Accent colour' });
      const refresh = () => wrap.querySelectorAll('.ytc-swatch').forEach((b) => {
        b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === S.accent.toLowerCase()));
      });
      const pick = (color) => { S.accent = color; onSettingChanged('accent'); refresh(); };
      for (const color of ACCENTS) {
        wrap.append(h('button', {
          type: 'button', class: 'ytc-swatch', style: `background:${color}`,
          'data-color': color, 'aria-label': `Colour ${color}`, onclick: () => pick(color),
        }));
      }
      wrap.append(h('input', {
        type: 'color', class: 'ytc-swatch-custom', value: S.accent, title: 'Custom colour', 'aria-label': 'Custom colour',
        oninput: (e) => pick(e.target.value),
      }));
      refresh();
      return h('div', { class: 'ytc-row ytc-row--stack ytc-row--static' },
        h('span', { class: 'ytc-row-text' }, h('span', { class: 'ytc-row-title' }, item.title || 'Accent colour')),
        wrap);
    }
    return null;
  }

  function buildPanel() {
    backdrop = h('div', { class: 'ytc-backdrop', onclick: () => togglePanel(false) });

    const tile = (section) => {
      const el = h('span', { class: 'ytc-tile', 'aria-hidden': 'true' }, icon(section.icon || 'tune', 18));
      el.style.setProperty('--c1', (section.tint || [])[0] || '#8b8b8b');
      el.style.setProperty('--c2', (section.tint || [])[1] || '#555');
      return el;
    };

    const groups = SECTIONS.map((section, i) => {
      const group = h('section', { class: 'ytc-group' },
        h('h3', {}, tile(section), section.title),
        h('div', { class: 'ytc-card' }, section.items.map(buildControl)));
      group.style.setProperty('--i', String(i));
      group.dataset.search = section.title.toLowerCase();
      group.querySelectorAll('.ytc-row').forEach((row) => { row.dataset.search = row.textContent.toLowerCase(); });
      return group;
    });

    const empty = h('p', { class: 'ytc-psearch-empty', hidden: true }, 'No matching settings');
    const filterSettings = (query) => {
      const q = query.trim().toLowerCase();
      let any = false;
      for (const group of groups) {
        const groupHit = !q || group.dataset.search.includes(q);
        let visible = 0;
        group.querySelectorAll('.ytc-row').forEach((row) => {
          const show = groupHit || row.dataset.search.includes(q);
          row.hidden = !show;
          if (show) visible++;
        });
        group.hidden = visible === 0;
        if (visible) any = true;
      }
      empty.hidden = any;
    };
    const search = h('div', { class: 'ytc-psearch' },
      h('label', { class: 'ytc-psearch-box' }, icon('search', 18),
        h('input', {
          type: 'search', class: 'ytc-psearch-input', placeholder: 'Find a setting', 'aria-label': 'Find a setting',
          oninput: (e) => filterSettings(e.target.value),
          onkeydown: (e) => { if (e.key !== 'Escape') e.stopPropagation(); },
        })));

    const body = h('div', { class: 'ytc-body' }, search, groups, empty);

    const needsReload = S.classicLayout !== initialClassic;
    reloadNote = h('p', { class: 'ytc-foot-note', hidden: !needsReload }, 'The layout change applies after a page reload.');
    reloadButton = h('button', { type: 'button', class: 'ytc-btn ytc-btn--primary', hidden: !needsReload, onclick: () => location.reload() }, 'Reload');

    const resetButton = h('button', {
      type: 'button', class: 'ytc-btn',
      onclick: () => { replaceSettings({ ...DEFAULTS }); toast('Settings reset to defaults'); },
    }, 'Reset settings');

    panel = h('aside', { class: 'ytc-panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ytc-title' },
      h('header', { class: 'ytc-head' },
        h('div', {},
          h('h2', { id: 'ytc-title' }, 'Classic+'),
          h('p', {}, 'Changes apply instantly')),
        h('button', { type: 'button', class: 'ytc-icon-btn ytc-close', 'aria-label': 'Close', onclick: () => togglePanel(false) }, icon('close'))),
      body,
      h('footer', { class: 'ytc-foot' }, reloadNote, reloadButton, resetButton, h('span', { class: 'ytc-kbd' }, 'Alt+Shift+Y')));

    document.body.append(backdrop, panel);
  }

  function replaceSettings(next) {
    S = next;
    saveSettings();
    compileLists();
    settingsRev++;
    gridColumnsNow = 0;
    applyRootClasses();
    rebuildPanel();
    schedulePass(0);
  }

  function rebuildPanel() {
    const wasOpen = document.documentElement.classList.contains('ytc-panel-open');
    panel?.remove();
    backdrop?.remove();
    buildPanel();
    if (wasOpen) panel.querySelector('.ytc-psearch-input')?.focus();
  }

  function togglePanel(force) {
    if (!document.body) return;
    if (!panel) buildPanel();
    const root = document.documentElement;
    const open = force ?? !root.classList.contains('ytc-panel-open');
    root.classList.toggle('ytc-panel-open', open);
    if (open) {
      lastFocus = document.activeElement;
      // Wait for visibility transition so focus lands on a visible element
      requestAnimationFrame(() => panel.querySelector('.ytc-psearch-input')?.focus());
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  /* =====================================================================
   * Keyboard shortcuts
   * ===================================================================== */

  window.addEventListener('keydown', (e) => {
    const panelOpen = document.documentElement.classList.contains('ytc-panel-open');
    if (panelOpen && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      togglePanel(false);
      return;
    }
    if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey || isTyping(e)) return;
    const actions = {
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
  }, true);

  /* =====================================================================
   * Main loop
   * ===================================================================== */

  /* =====================================================================
   * Watched state: part / full, read from the thumbnail progress bar
   * ===================================================================== */

  const WATCH_ITEM_SEL = 'yt-lockup-view-model, ytd-compact-video-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-item-renderer:not(:has(yt-lockup-view-model))';
  const PROGRESS_SEL = [
    'ytd-thumbnail-overlay-resume-playback-renderer #progress',
    '.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment',
    'yt-thumbnail-overlay-progress-bar-view-model [style*="width"]',
  ].join(', ');

  function markWatched() {
    if (!S.dimWatched && !S.watchedBadge) return;
    for (const item of document.querySelectorAll(WATCH_ITEM_SEL)) {
      const bar = item.querySelector(PROGRESS_SEL);
      let state = '';
      if (bar) state = parseFloat(bar.style.width) >= CONFIG.fluent.watchedAt ? 'full' : 'part';
      if ((item.dataset.ytcWatched || '') === state) continue;
      if (state) item.dataset.ytcWatched = state;
      else delete item.dataset.ytcWatched;
    }
  }

  /* =====================================================================
   * Reveal highlight: cursor position as CSS variables on the hovered card
   * ===================================================================== */

  const REVEAL_BASE = [
    '.ytc-card > .ytc-row', '.ytc-nav button', '.ytc-ask', '.ytc-showall',
    'ytd-rich-item-renderer[rendered-from-rich-grid]',
  ];
  const REVEAL_SEL = {
    threads: [...REVEAL_BASE, 'ytd-comments ytd-comment-thread-renderer'].join(', '),
    sections: [...REVEAL_BASE, 'ytd-watch-metadata', 'ytd-comments#comments', 'ytd-watch-flexy #related', '[data-ytc-sec-card]'].join(', '),
    none: REVEAL_BASE.join(', '),
  };
  let revealFrame = 0;
  let revealEvent = null;

  document.addEventListener('pointermove', (e) => {
    if (!S.fluent || !S.fluentReveal || e.pointerType === 'touch') return;
    revealEvent = e;
    if (revealFrame) return;
    revealFrame = requestAnimationFrame(() => {
      revealFrame = 0;
      const target = revealEvent.target && revealEvent.target.closest && revealEvent.target.closest(REVEAL_SEL[S.cardLayout] || REVEAL_SEL.none);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--ytc-mx', `${revealEvent.clientX - rect.left}px`);
      target.style.setProperty('--ytc-my', `${revealEvent.clientY - rect.top}px`);
    });
  }, { passive: true, capture: true });

  /* =====================================================================
   * Feed clean-up: hide sections by heading text or selector
   * ===================================================================== */

  const SECTION_SEL = [
    'ytd-rich-section-renderer', 'ytd-rich-shelf-renderer', 'ytd-shelf-renderer', 'ytd-reel-shelf-renderer',
    'ytd-horizontal-card-list-renderer', 'grid-shelf-view-model', 'ytd-feed-nudge-renderer',
    'ytd-chips-shelf-with-video-shelf-renderer', 'ytd-statement-banner-renderer',
  ].join(', ');
  const SECTION_HEADER_SEL = '#title-container, #header, #title, #title-text, h2, h3, .yt-shelf-header-layout, yt-section-header-view-model';
  const VIDEO_ITEM_SEL = 'ytd-rich-item-renderer, yt-lockup-view-model, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer, ytd-reel-item-renderer';

  let sectionStyle = null;
  let sectionCss = '';

  function activeSectionRules() {
    const titles = [];
    const selectors = [];
    for (const section of CONFIG.hiddenSections) {
      if (!S[`hideSection_${section.id}`]) continue;
      titles.push(...section.titles);
      selectors.push(...(section.selectors || []));
    }
    titles.push(...parseList(S.hiddenSectionTitles));
    return { titles: titles.map((t) => t.toLowerCase()), selectors };
  }

  // Heading of a section, ignoring titles that belong to videos inside it
  function sectionHeading(el) {
    for (const header of el.querySelectorAll(SECTION_HEADER_SEL)) {
      if (header.closest(VIDEO_ITEM_SEL)) continue;
      const text = header.textContent.replace(/\s+/g, ' ').trim();
      if (text) return text.toLowerCase();
    }
    return '';
  }

  function hideSections() {
    const { titles, selectors } = activeSectionRules();

    const css = selectors.length ? `${selectors.join(',\n')} { display: none !important; }` : '';
    if (!sectionStyle) {
      sectionStyle = document.createElement('style');
      sectionStyle.id = 'ytc-section-style';
    }
    if (!sectionStyle.isConnected) (document.head || document.documentElement).appendChild(sectionStyle);
    if (css !== sectionCss) sectionStyle.textContent = sectionCss = css;

    for (const el of document.querySelectorAll(SECTION_SEL)) {
      if (el.closest('ytd-comments')) continue;
      const heading = titles.length ? sectionHeading(el) : '';
      const hide = !!heading && titles.some((t) => heading.includes(t));
      if (hide) el.setAttribute('data-ytc-section-hidden', '');
      else el.removeAttribute('data-ytc-section-hidden');
    }
  }

  /* ---------- Buttons, menu items and sidebar entries by label ---------- */

  const LABEL_SCOPE_SEL = [
    'ytd-watch-metadata #actions', 'ytd-watch-metadata #description', 'ytd-watch-flexy #panels',
    'ytd-guide-renderer', 'ytd-mini-guide-renderer', 'ytd-masthead', 'ytd-popup-container',
    'yt-chip-cloud-renderer', '.ytSideRailViewModelHost',
  ].join(', ');
  const LABEL_ITEM_SEL = 'button, a, [role="button"], [role="menuitem"], [role="tab"], yt-chip-cloud-chip-renderer';
  const LABEL_WRAP_SEL = [
    'ytd-button-renderer', 'yt-button-view-model', 'ytd-guide-entry-renderer', 'ytd-mini-guide-entry-renderer',
    'ytd-menu-service-item-renderer', 'ytd-menu-navigation-item-renderer', 'yt-list-item-view-model',
    'yt-chip-cloud-chip-renderer', 'tp-yt-paper-item',
  ].join(', ');
  let labelRe = null;
  let labelKey = null;

  function hideLabeled() {
    const labels = [];
    for (const section of CONFIG.hiddenSections) {
      if (S[`hideSection_${section.id}`]) labels.push(...(section.labels || []));
    }
    const key = labels.join('|');
    if (key !== labelKey) {
      labelKey = key;
      labelRe = labels.length ? new RegExp(`^(${labels.map(escapeRe).join('|')})(\\s|$)`, 'i') : null;
    }

    // Menu items are recycled by YouTube, so every pass re-checks what is hidden
    const matched = new Set();
    if (labelRe) {
      for (const scope of document.querySelectorAll(LABEL_SCOPE_SEL)) {
        for (const el of scope.querySelectorAll(LABEL_ITEM_SEL)) {
          if (el.closest('.ytc-panel, .ytc-nav, .ytc-ask')) continue;
          const label = labelOf(el);
          if (!label || label.length > 40 || !labelRe.test(label)) continue;
          // Climb to the outermost wrapper (e.g. paper-item -> menu-service-item)
          let target = el.closest(LABEL_WRAP_SEL) || el;
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
    matched.forEach((el) => el.setAttribute('data-ytc-label-hidden', ''));
  }

  /* =====================================================================
   * Extension toolbars under the player (Enhancer for YouTube etc.)
   * ===================================================================== */

  let extSpacer = null;
  let extShift = 0;
  let extStyle = null;
  let extCss = '';

  function extensionToolbars() {
    const found = [];
    for (const sel of CONFIG.extensionToolbars.selectors) {
      try { document.querySelectorAll(sel).forEach((el) => { if (isVisible(el)) found.push(el); }); } catch { /* bad selector in config */ }
    }
    return found;
  }

  function fitExtensionToolbars() {
    const root = document.documentElement;
    const sels = CONFIG.extensionToolbars.selectors.join(', ');
    const css = S.extToolbarStyle && sels ? `
html.ytc-ext-bar :is(${sels}) {
  border-radius: 12px !important;
  background-color: var(--ytc-layer) !important;
  box-shadow: inset 0 0 0 1px var(--ytc-stroke), 0 4px 14px rgba(0, 0, 0, .14) !important;
}
html.ytc-fluent.ytc-ext-bar :is(${sels}) {
  background-color: color-mix(in srgb, var(--ytc-raised) 70%, transparent) !important;
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}` : '';
    if (!extStyle) { extStyle = document.createElement('style'); extStyle.id = 'ytc-ext-style'; }
    if (!extStyle.isConnected) (document.head || document.documentElement).appendChild(extStyle);
    if (css !== extCss) extStyle.textContent = extCss = css;

    const bars = isWatch() ? extensionToolbars() : [];
    root.classList.toggle('ytc-ext-bar', bars.length > 0);

    const meta = document.querySelector('ytd-watch-flexy ytd-watch-metadata');
    let shift = 0;
    if (S.extToolbarSpace && meta && bars.length) {
      const m = meta.getBoundingClientRect();
      // Position the title would have without our spacer
      const naturalTop = m.top - extShift;
      for (const bar of bars) {
        if (meta.contains(bar) || getComputedStyle(bar).position === 'fixed') continue;
        const r = bar.getBoundingClientRect();
        const overlapsX = r.right > m.left && r.left < m.right;
        if (!overlapsX || r.top > naturalTop + m.height) continue;
        shift = Math.max(shift, Math.ceil(r.bottom - naturalTop + CONFIG.extensionToolbars.gap));
      }
    }
    shift = Math.max(0, shift);

    if (!shift) {
      extSpacer?.remove();
      extShift = 0;
      return;
    }
    if (!extSpacer) extSpacer = h('div', { class: 'ytc-ext-spacer', 'aria-hidden': 'true' });
    if (meta.previousElementSibling !== extSpacer) meta.before(extSpacer);
    if (shift !== extShift) {
      extShift = shift;
      extSpacer.style.height = `${shift}px`;
    }
  }

  /* ---------- Other blocks under the video become section cards too ---------- */

  const BELOW_SKIP_SEL = 'ytd-watch-metadata, ytd-comments, #related, .ytc-ext-spacer, script, style, template, dom-if, dom-repeat';

  function markExtraSectionCards() {
    const below = document.querySelector('ytd-watch-flexy #below');
    if (!below) return;
    const extSels = CONFIG.extensionToolbars.selectors;
    for (const child of below.children) {
      let want = S.cardLayout === 'sections' && !child.matches(BELOW_SKIP_SEL);
      if (want) want = !child.querySelector('ytd-watch-metadata, ytd-comments, #related');
      if (want) want = !extSels.some((sel) => { try { return child.matches(sel); } catch { return false; } });
      // Only real, visible blocks (empty shelves stay invisible)
      if (want) want = child.offsetHeight > 24 && isVisible(child);
      if (want) child.setAttribute('data-ytc-sec-card', '');
      else child.removeAttribute('data-ytc-sec-card');
    }
  }

  /* =====================================================================
   * Video grid: columns per row from the available width
   * ===================================================================== */

  const GRID_GAP = CONFIG.grid.gap;
  let gridStyle = null;
  let gridColumnsNow = 0;

  function visibleRichGrid() {
    for (const grid of document.querySelectorAll('ytd-rich-grid-renderer')) {
      if (grid.offsetParent !== null && !grid.closest('ytd-watch-flexy')) return grid;
    }
    return null;
  }

  function gridAvailableWidth(grid) {
    // Measure the page host, not the grid: the grid's own width depends on the column count
    const host = grid.closest('ytd-browse, ytd-search, #primary') || grid.parentElement;
    const contents = grid.querySelector(':scope > #contents') || grid;
    const cs = getComputedStyle(contents);
    const inset = ['paddingLeft', 'paddingRight', 'marginLeft', 'marginRight']
      .reduce((sum, prop) => sum + (parseFloat(cs[prop]) || 0), 0);
    return Math.max(0, host.clientWidth - inset);
  }

  function computeColumns(grid) {
    if (S.gridMode === 'fixed') return Math.min(CONFIG.grid.maxColumns, Math.max(1, S.gridColumns | 0));
    const width = gridAvailableWidth(grid);
    if (!width) return 0;
    const card = Math.max(160, S.gridCardWidth | 0);
    return Math.min(CONFIG.grid.maxColumns, Math.max(1, Math.floor((width + GRID_GAP) / (card + GRID_GAP))));
  }

  function updateGrid() {
    const root = document.documentElement;
    root.style.setProperty('--ytc-card-min', `${Math.max(160, S.gridCardWidth | 0)}px`);
    const enabled = S.gridMode === 'auto' || S.gridMode === 'fixed';
    root.classList.toggle('ytc-grid', enabled);

    if (!gridStyle) {
      gridStyle = document.createElement('style');
      gridStyle.id = 'ytc-grid-style';
    }
    if (!gridStyle.isConnected) (document.head || document.documentElement).appendChild(gridStyle);

    if (!enabled) {
      if (gridStyle.textContent) gridStyle.textContent = '';
      gridColumnsNow = 0;
      return;
    }
    const grid = visibleRichGrid();
    if (!grid) return;
    const n = computeColumns(grid);
    if (!n || n === gridColumnsNow) return;
    gridColumnsNow = n;
    // Shorts are narrower, so fit more of them per row
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

  let passTimer = 0;
  function schedulePass(delay = 300) {
    if (passTimer) return;
    passTimer = setTimeout(() => { passTimer = 0; pass(); }, delay);
  }

  function pass() {
    applyRootClasses();
    if (!document.body) return;
    ensureMastButton();
    ensureNav();
    updateGrid();
    hideSections();
    hideLabeled();
    markWatched();
    fitExtensionToolbars();
    markExtraSectionCards();
    if (!isWatch()) return;

    const owner = channelOwnerPath();
    document.querySelectorAll(COMMENT_SEL).forEach((el) => processComment(el, owner));
    ensureSearchBar();
    ensureAskButton();
    ensureShowAll();
    if (searchQuery) applySearch();
    autoExpandDescription();
    updateNavCount();
  }

  function start() {
    new MutationObserver(() => schedulePass()).observe(document.body, { childList: true, subtree: true });
    // Guide open/close and window resizes change the space for the grid
    const resizeObserver = new ResizeObserver(() => schedulePass(80));
    resizeObserver.observe(document.body);
    const watchHost = setInterval(() => {
      const manager = document.querySelector('ytd-page-manager');
      if (manager) { resizeObserver.observe(manager); clearInterval(watchHost); }
    }, 500);
    window.addEventListener('yt-navigate-finish', () => {
      navigatedAt = Date.now();
      commentsExpanded = false;
      resetSearch();
      schedulePass(0);
    });
    schedulePass(0);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
