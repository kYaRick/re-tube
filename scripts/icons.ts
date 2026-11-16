/*
 * Renders assets/logo.svg (and logo-16.svg for the smallest sizes) to PNG icons,
 * and assets/banner.svg to assets/banner.png (README, GitHub social preview).
 * The PNGs are committed, so they do not depend on the fonts of the machine that builds.
 * Run: just icons
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const render = (file: string, width: number): Buffer =>
  new Resvg(readFileSync(file, 'utf8'), {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Segoe UI' },
  })
    .render()
    .asPng();

for (const size of [16, 32, 48, 128, 256]) {
  const out = `assets/icons/${size}.png`;
  writeFileSync(out, render(size <= 32 ? 'assets/logo-16.svg' : 'assets/logo.svg', size));
  console.log(out);
}

writeFileSync('assets/banner.png', render('assets/banner.svg', 1280));
console.log('assets/banner.png');

// The docs site uses the same artwork
for (const [from, to] of [
  ['assets/logo.svg', 'docs/src/assets/logo.svg'],
  ['assets/banner.svg', 'docs/src/assets/banner.svg'],
  ['assets/logo-16.svg', 'docs/public/favicon.svg'],
]) {
  copyFileSync(from as string, to as string);
  console.log(to);
}
