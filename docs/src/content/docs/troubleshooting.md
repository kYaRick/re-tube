---
title: Troubleshooting
description: What to do when something on YouTube looks wrong.
---

YouTube changes its page often. When it does, a Re-Tube feature can stop working.

## 🔍 First checks

1. Reload the page.
2. Make sure only one copy of the script is on (Re-Tube, not also "YouTube Classic+").
3. Turn off the feature in the settings panel. If the problem goes away, the feature is the cause.

## 🐛 Report a problem

1. Open the settings panel (<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd>).
2. In **Backup & diagnostics**, press **Copy diagnostics**.
3. [Open an issue](https://github.com/kYaRick/re-tube/issues/new?template=bug.yml) and paste the report.

Useful blocks in the report: `perf` (time per step), `grid` (widths and column history), `guide` and `guideEntry` (left menu structure, no channel names), `layoutShifts` (what moved on the page).

The report contains the page path, the page structure Re-Tube sees, button labels near the video and your settings. It does not contain comment text or your highlight and hide word lists. Read it before you post it.

## 🔄 Reset

**Reset settings** in the panel restores the defaults.
