---
title: Architecture
description: How the Re-Tube source is organized.
---

## 🛠️ Stack

| Task                 | Tool                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Runtime and packages | [Bun](https://bun.sh)                                                                          |
| Language             | TypeScript                                                                                     |
| Userscript build     | [Vite](https://vite.dev) + [vite-plugin-monkey](https://github.com/lisonge/vite-plugin-monkey) |
| Lint and format      | [Biome](https://biomejs.dev)                                                                   |
| Unit tests           | [Vitest](https://vitest.dev) + happy-dom                                                       |
| E2E tests            | [Playwright](https://playwright.dev) (Chromium and Firefox)                                    |
| Documentation        | [Astro Starlight](https://starlight.astro.build)                                               |
| Tasks                | [just](https://just.systems)                                                                   |

## 📁 Layout

```
src/
  core/        config, settings, selectors, runtime, DOM helpers
  features/    one folder per feature: index.ts + style.css
  ui/          settings panel, toast, shortcuts, diagnostics
  main.ts      entry point
legacy/        v2.9.0 single-file script
tests/         unit (Vitest) and e2e (Playwright)
docs/          this site
```

## 🔄 Migration status

The v2.9.0 script runs unchanged from `legacy/` through `src/main.ts`.
Features move into `src/features/` one at a time. When a feature moves, its code leaves the legacy file in the same commit, and the e2e tests must give the same result.

## ⚙️ Runtime

1. At `document-start`, the classic-layout feature locks YouTube experiment flags. This must run before YouTube reads them.
2. Settings load from `localStorage` and pass through `normalizeSettings` (migrations by `_v`).
3. A `MutationObserver` and a `ResizeObserver` schedule a pass. Each pass calls `pass()` on every feature in the order of `src/features/index.ts`.
4. Each hook runs inside `try/catch`. An error in one feature goes to diagnostics and does not stop the others.

## 🎯 Selectors

All YouTube CSS selectors live in `src/core/selectors.ts`. When YouTube changes its markup, start there. "Copy diagnostics" reports how many elements each selector matches.

## 📌 Rules

- Code, comments, setting names and hints are in English. Cyrillic is allowed only in recognition data (spam phrases, button labels, counter suffixes).
- Build DOM with `h()` and `icon()`. YouTube enforces Trusted Types, so `innerHTML` fails. A Biome plugin blocks it.
- Keep the `ytc-` class prefix and the `ytc:settings:v2` storage key. Changing them breaks saved settings.
