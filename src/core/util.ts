/** Escapes a string for literal use inside a RegExp. */
export const escapeRe = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Splits a comma or new-line separated list into lower-case, trimmed, non-empty items. */
export const parseList = (raw: unknown): string[] =>
  String(raw || '')
    .split(/[\n,]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

/** Parses localized counters such as "1.2K", "1,2 тис.", "3 млн", "1 234". */
export function parseCount(raw: unknown): number {
  const text = String(raw || '')
    .toLowerCase()
    .replace(/ /g, ' ')
    .trim();
  const match = text.match(/(\d[\d\s.,]*)\s*(k|тис|тыс|m|млн|b|млрд)?/);
  if (!match?.[1]) return 0;
  const suffix = match[2];
  const digits = match[1].replace(/\s/g, '');
  const value = suffix
    ? Number.parseFloat(digits.replace(',', '.'))
    : Number.parseInt(digits.replace(/[.,]/g, ''), 10);
  const mult = !suffix ? 1 : /^(k|тис|тыс)/.test(suffix) ? 1e3 : /^(m|млн)/.test(suffix) ? 1e6 : 1e9;
  return Math.round((value || 0) * mult);
}

/** JSON.stringify with sorted object keys, for stable equality checks. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : v,
  );
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
