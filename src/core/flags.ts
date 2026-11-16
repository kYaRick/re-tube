import { state } from './settings';

/**
 * Classic layout: experiment flag overrides.
 * Must run at document-start to prevent YouTube from initializing modern side rails or grid views.
 */

export const FLAGS: readonly string[] = [
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
  'disable_theater_mode',
];

export function lockFlags(flags: Record<string, any>): void {
  if (!flags || (flags as any).__ytcLocked) return;
  // Ambient mode (the glow around the player) is a GPU cost: the flag is locked off unless wanted
  const locked = state.S.ambientMode ? FLAGS : [...FLAGS, 'kevlar_watch_cinematics'];
  for (const name of locked) {
    try {
      Object.defineProperty(flags, name, {
        get: () => false,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
    } catch {
      /* non-configurable, skip */
    }
  }
  Object.defineProperty(flags, '__ytcLocked', { value: true });
}

export function patchConfig(): void {
  const win = window as any;
  for (const cfg of [win.yt && win.yt.config_, win.ytcfg && win.ytcfg.data_]) {
    if (!cfg) continue;
    if (!cfg.EXPERIMENT_FLAGS) cfg.EXPERIMENT_FLAGS = {};
    lockFlags(cfg.EXPERIMENT_FLAGS);
  }
  const y = win.ytcfg;
  if (y && typeof y.set === 'function' && !y.set.__ytc) {
    const orig = y.set;
    y.set = function (...args: any[]) {
      const result = orig.apply(this, args);
      patchConfig();
      return result;
    };
    y.set.__ytc = true;
  }
}

export function initFlags(enabled: boolean): void {
  if (!enabled) return;
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
