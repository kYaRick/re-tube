/*
 * Presets are a starting point: each one sets a group of settings.
 * Changing any of them by hand makes the panel show "Custom".
 */
import type { Settings } from './feature.ts';

export type PresetId = 'performance' | 'balanced' | 'beauty';

export const PRESET_KEYS = [
  'fluent',
  'fluentReveal',
  'fluentVideoCards',
  'motion',
  'cardLayout',
  'watchedBadge',
  'dimWatched',
  'likeChips',
  'ambientMode',
] as const;

export const PRESETS: Record<PresetId, Record<(typeof PRESET_KEYS)[number], boolean | string>> = {
  // Least work for the browser: no blur, no cursor light, no animations, no per-video DOM marks
  performance: {
    fluent: false,
    fluentReveal: false,
    fluentVideoCards: false,
    motion: false,
    cardLayout: 'none',
    watchedBadge: false,
    dimWatched: false,
    likeChips: false,
    ambientMode: false,
  },
  balanced: {
    fluent: true,
    fluentReveal: false,
    fluentVideoCards: true,
    motion: true,
    cardLayout: 'sections',
    watchedBadge: true,
    dimWatched: true,
    likeChips: true,
    ambientMode: true,
  },
  // Everything on, including the light that follows the cursor
  beauty: {
    fluent: true,
    fluentReveal: true,
    fluentVideoCards: true,
    motion: true,
    cardLayout: 'sections',
    watchedBadge: true,
    dimWatched: true,
    likeChips: true,
    ambientMode: true,
  },
};

export const PRESET_LABELS: readonly [string, string][] = [
  ['performance', 'Performance'],
  ['balanced', 'Balanced'],
  ['beauty', 'Beauty'],
  ['custom', 'Custom'],
];

export function applyPreset(S: Settings, id: PresetId): void {
  Object.assign(S, PRESETS[id]);
  S.preset = id;
}

/** The preset whose values all match, or "custom". */
export function detectPreset(S: Settings): PresetId | 'custom' {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    const values = PRESETS[id];
    if (PRESET_KEYS.every((k) => S[k] === values[k])) return id;
  }
  return 'custom';
}
