/*
 * Feature contract. Every folder in src/features/ exports one defineFeature() object.
 * The runtime calls the hooks; a hook that throws is logged in diagnostics and
 * does not stop the other features.
 */

export type Scope = 'all' | 'watch' | 'browse';

export type SettingDef =
  | { type: 'bool'; default: boolean }
  | { type: 'num'; default: number; min?: number; max?: number; step?: number }
  | { type: 'text'; default: string; multiline?: boolean }
  | { type: 'choice'; default: string; options: readonly string[] }
  | { type: 'color'; default: string };

export type SettingSpec = SettingDef & {
  /** Panel section id */
  section: string;
  label: string;
  hint?: string;
  /** "key" -> shown when that setting is on; "key=value" -> shown when it equals value */
  dependsOn?: string;
};

export type Settings = Record<string, boolean | number | string>;

export interface Ctx {
  readonly S: Settings;
  readonly toast: (message: string) => void;
  readonly log: (...args: unknown[]) => void;
}

export interface Feature {
  id: string;
  scope?: Scope;
  settings?: Record<string, SettingSpec>;
  css?: string;
  rootClasses?: (S: Settings) => Record<string, boolean>;
  init?: (ctx: Ctx) => void;
  pass?: (ctx: Ctx) => void;
  onNavigate?: (ctx: Ctx) => void;
  onSettings?: (ctx: Ctx, changedKeys: readonly string[]) => void;
}

export const defineFeature = <F extends Feature>(feature: F): F => feature;
