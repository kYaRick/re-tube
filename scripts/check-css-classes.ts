/*
 * Fails when code sets a ytc-* class or data-ytc-* attribute that no CSS rule uses.
 * This is how the modular port silently lost comment highlights.
 * Run: bun scripts/check-css-classes.ts (part of `just check`)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Names that are ids or state read only from script
const ALLOW = new Set([
  'ytc-style',
  'ytc-logo', // gradient id prefix in logoIcon()
  'ytc-grid-style',
  'ytc-section-style',
  'ytc-ext-style',
  'ytc-ext-bar',
  'ytc-close',
  'ytc-psearch-input',
  'ytc-title',
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk('src');
const read = (ext: string) =>
  files
    .filter((f) => f.endsWith(ext))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
const css = read('.css');
const ts = read('.ts');

const used = new Set<string>();
for (const m of ts.matchAll(/(?<![\w-])(data-ytc-[a-z-]+|ytc-[a-z0-9]+(?:-[a-z0-9]+)*)/g)) {
  used.add(m[1] as string);
}

const inCss = (name: string): boolean =>
  css
    .split(name)
    .slice(1)
    .some((rest, i, parts) => {
      const next = rest[0] ?? '';
      const prev = css.split(name)[i]?.slice(-1) ?? '';
      return !/[\w-]/.test(next) && !/[\w-]/.test(prev) && parts.length > 0;
    });

const missing = [...used].filter((n) => !ALLOW.has(n) && !inCss(n)).sort();

if (missing.length) {
  console.error(`No CSS for: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(`ok: ${used.size} ytc-* names have CSS`);
