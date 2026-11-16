/**
 * DOM helpers and utilities.
 * Uses trusted createElement methods (no innerHTML) to comply with YouTube Trusted Types.
 */

export const ICONS: Record<string, string> = {
  tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
  up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
  comment: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z',
  close:
    'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  grid: 'M3 3h8v8H3zm10 0h8v8h-8zM3 13h8v8H3zm10 0h8v8h-8z',
  display:
    'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM9.5 16.5v-9l7 4.5-7 4.5z',
  tag: 'M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  phone:
    'M17 1.01 7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
  library:
    'M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z',
  palette:
    'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  keyboard:
    'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z',
  bug: 'M20 8h-2.81a5.985 5.985 0 0 0-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5s-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z',
  sparkle: 'M12 2Q13 11 22 12Q13 13 12 22Q11 13 2 12Q11 11 12 2Z',
  search:
    'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
};

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, any> = {},
  ...children: any[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') (el as any).value = v;
    else if (k === 'checked') (el as any).checked = !!v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const child of children.flat()) {
    if (child != null) el.append(child);
  }
  return el;
}

export function icon(name: string, size = 24): SVGElement {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICONS[name] || '');
  path.setAttribute('fill', 'currentColor');
  svg.append(path);
  return svg;
}

const svgEl = (tag: string, attrs: Record<string, string>, ...children: SVGElement[]): SVGElement => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
};

let logoSeq = 0;

/** The ReTube logo (assets/logo-16.svg): a tube looping into a play nozzle. */
export function logoIcon(size = 28): SVGElement {
  const id = `ytc-logo-${++logoSeq}`; // gradient ids must be unique per document
  const tube = `url(#${id})`;
  return svgEl(
    'svg',
    { viewBox: '0 0 128 128', width: String(size), height: String(size), 'aria-hidden': 'true' },
    svgEl(
      'defs',
      {},
      svgEl(
        'linearGradient',
        { id, x1: '0', y1: '0', x2: '1', y2: '1' },
        svgEl('stop', { offset: '0', 'stop-color': '#5cb3ff' }),
        svgEl('stop', { offset: '1', 'stop-color': '#7c3aed' }),
      ),
    ),
    svgEl('rect', { width: '128', height: '128', rx: '28', fill: '#13152b' }),
    svgEl('path', {
      d: 'M 62 28 A 36 36 0 1 0 98 64',
      fill: 'none',
      stroke: tube,
      'stroke-width': '28',
      'stroke-linecap': 'round',
    }),
    svgEl('path', {
      d: 'M 58 10 L 100 28 L 58 46 Z',
      fill: tube,
      stroke: tube,
      'stroke-width': '8',
      'stroke-linejoin': 'round',
    }),
    svgEl('path', {
      d: 'M 54 50 L 80 64 L 54 78 Z',
      fill: '#fff',
      stroke: '#fff',
      'stroke-width': '8',
      'stroke-linejoin': 'round',
    }),
  );
}

export const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isTyping = (e: Event): boolean => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

export function scrollToY(y: number): void {
  window.scrollTo({ top: Math.max(0, y), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

export function scrollToComments(): void {
  const target = document.querySelector('ytd-comments#comments');
  if (!target) return;
  const mastheadHeight =
    (document.querySelector('#masthead-container') as HTMLElement | null)?.offsetHeight || 56;
  scrollToY(target.getBoundingClientRect().top + window.scrollY - mastheadHeight - 12);
}

export const scrollToVideo = (): void => scrollToY(0);

export function scrollToRelated(): void {
  const target = document.querySelector('ytd-watch-flexy #related');
  if (!target) return;
  const mastheadHeight =
    (document.querySelector('#masthead-container') as HTMLElement | null)?.offsetHeight || 56;
  scrollToY(target.getBoundingClientRect().top + window.scrollY - mastheadHeight - 12);
}
