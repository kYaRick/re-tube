---
title: Roadmap
description: What is done and what comes next.
---

## ✅ Done in 0.1.0

- New name, logo and settings window with tabs, search and presets.
- Presets: Performance, Balanced, Beauty.
- Subscriptions window with search and new-video marks.
- Command palette (<kbd>Ctrl</kbd>+<kbd>K</kbd>).
- Home grid that fits the window; no blur while scrolling.
- Comment highlights, chips, spam filter and the settings controls restored from 2.9.0 and covered by tests that compare with 2.9.0.
- Diagnostics: per-step timing, grid widths, guide structure, layout shifts.

## 🚀 Next

1. **Feature modules.** Move each feature into `src/features/<name>/` with the `defineFeature` contract. E2E results must match.
2. **Selector health.** Diagnostics report how many elements each YouTube selector matches, so breakage after a YouTube update is visible at once.
3. **Recognition data by language.** Button labels, counter suffixes and spam phrases grouped per language.
4. **Browser extension** for Chrome and Firefox from the same code, built with [WXT](https://wxt.dev): settings sync through `chrome.storage`, a popup and an options page.

## ⚠️ Not verified with a signed-in account

Tests run on mock pages and on public YouTube pages. These parts depend on markup only signed-in users see:

- the Home grid with a personal feed;
- the subscriptions window and its new-video dots;
- the Ask button.

If one of them misbehaves, send **Copy diagnostics** from the settings.
