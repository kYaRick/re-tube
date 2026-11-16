import { CONFIG, DEFAULTS } from './config';
import { detectPreset } from './presets';

export const STORE_KEY = CONFIG.storageKey;
export const SETTINGS_VERSION = 5;

export const isOn = (v: unknown): boolean => !!v && v !== 'never';

export const depActive = (dep: string, S: Record<string, any>): boolean => {
  const parts = String(dep).split('=');
  const key = parts[0] || '';
  const value = parts[1];
  return value === undefined ? isOn(S[key]) : S[key] === value;
};

export function loadSettings(): Record<string, any> {
  let stored: Record<string, any> = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {};
  } catch {
    stored = {};
  }
  const merged: Record<string, any> = { ...DEFAULTS, ...stored };
  if ((stored._v || 0) < 3) {
    merged.autoExpand = false;
    if ('portraitCollapse' in stored) {
      merged.collapseComments = stored.portraitCollapse ? 'portrait' : 'never';
    }
  }
  if ((stored._v || 0) < 4) {
    merged.cardLayout = 'sections';
  }
  // v5: presets; the active preset is always derived from the values
  merged.preset = detectPreset(merged);
  delete merged.portraitCollapse;
  delete merged.commentCards;
  merged._v = SETTINGS_VERSION;
  return merged;
}

export const ROOT_CLASSES: Record<string, string> = {
  classicLayout: 'ytc-classic',
  compact: 'ytc-compact',
  compactRelated: 'ytc-compact-related',
  dimWatched: 'ytc-dim-watched',
  hideShorts: 'ytc-no-shorts',
  fluent: 'ytc-fluent',
  motion: 'ytc-motion',
  watchedBadge: 'ytc-watched-badge',
};

export const portraitQuery = window.matchMedia('(orientation: portrait)');

export interface AppState {
  S: Record<string, any>;
  initialClassic: boolean;
  initialAmbient: boolean;
  searchQuery: string;
  commentsExpanded: boolean;
  lastPortrait: boolean | null;
  settingsRev: number;
  /** Bumped on every page change that is not ReTube's own; steps that only read the DOM skip a pass without it */
  domRev: number;
  navigatedAt: number;
  gridColumnsNow: number;
  expandedFor: string;
}

export const state: AppState = {
  S: loadSettings(),
  initialClassic: false,
  initialAmbient: false,
  searchQuery: '',
  commentsExpanded: false,
  lastPortrait: null,
  settingsRev: 0,
  domRev: 0,
  navigatedAt: Date.now(),
  gridColumnsNow: 0,
  expandedFor: '',
};
state.initialClassic = state.S.classicLayout;
state.initialAmbient = state.S.ambientMode;

export const isWatch = (): boolean => location.pathname === '/watch';

export const isPortraitActive = (): boolean =>
  state.S.portraitMode === 'always' || (state.S.portraitMode === 'auto' && portraitQuery.matches);

export function saveSettings(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.S));
  } catch {
    /* storage full or blocked */
  }
}

export function applyRootClasses(): void {
  const root = document.documentElement;
  if (!root) return;
  const { S } = state;
  for (const [key, cls] of Object.entries(ROOT_CLASSES)) {
    root.classList.toggle(cls, !!S[key]);
  }
  root.classList.toggle('ytc-on-watch', isWatch());
  root.style.setProperty('--ytc-accent', S.accent);
  root.style.setProperty('--ytc-portrait-max', `${CONFIG.portraitMaxWidth}px`);
  root.classList.toggle('ytc-reveal', !!(S.fluent && S.fluentReveal));
  root.classList.toggle('ytc-cards', S.cardLayout === 'threads');
  root.classList.toggle('ytc-sec-cards', S.cardLayout === 'sections');
  root.style.setProperty(
    '--ytc-rel-thumb',
    `${S.compactRelated ? CONFIG.related.compactThumbWidth : CONFIG.related.thumbWidth}px`,
  );
  root.classList.toggle('ytc-fluent-videos', !!(S.fluent && S.fluentVideoCards));
  root.style.setProperty('--ytc-blur', `${CONFIG.fluent.blur}px`);
  root.style.setProperty('--ytc-acrylic', `${CONFIG.fluent.acrylicOpacity}%`);
  root.style.setProperty('--ytc-reveal', `${CONFIG.fluent.revealRadius}px`);

  const portrait = isPortraitActive();
  root.classList.toggle('ytc-portrait', portrait);
  root.classList.toggle('ytc-related-grid', portrait && S.portraitGrid);
  const collapseMode = S.collapseComments === 'always' || (S.collapseComments === 'portrait' && portrait);
  root.classList.toggle(
    'ytc-comments-collapsed',
    collapseMode && !state.commentsExpanded && !state.searchQuery,
  );
  if (portrait !== state.lastPortrait) {
    state.lastPortrait = portrait;
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
}

// Ensure classes are applied at start
if (document.documentElement) {
  applyRootClasses();
} else {
  const rootWait = new MutationObserver(() => {
    if (!document.documentElement) return;
    rootWait.disconnect();
    applyRootClasses();
  });
  rootWait.observe(document, { childList: true });
}
portraitQuery.addEventListener('change', () => applyRootClasses());
