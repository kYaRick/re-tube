# Changelog

All notable changes are listed here. Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Install guide for Violentmonkey, Tampermonkey and the Custom script of Enhancer for YouTube.
- Watch page screenshot (mock page, made-up channels) in the README and the docs.
- Display name is now "Re-Tube" (Restore YouTube). The userscript `@name`, namespace and storage key stay the same, so updates and settings keep working.
- ReTube settings window: centered, with section tabs, search across sections and the preset switch in the header.
- Command palette (Ctrl+K or Alt+Shift+K) for every action, preset and on/off setting.
- New-video dots, "new first" order and an "Only new" filter in the subscriptions window.
- Tube logo, banner (README, social preview) and screenshots in the docs; new pages: Presets, Subscriptions window, Command palette; Ukrainian Settings, Features and Presets.

- Project renamed to ReTube. Repository with Bun, Vite, vite-plugin-monkey, TypeScript, Biome, Vitest and Playwright.
- Documentation site (Astro Starlight) in English and Ukrainian.
- Logo and icons.
- Auto-update from GitHub Releases (`@updateURL`, `@downloadURL`).

- Subscriptions window: "Show more" under Subscriptions opens a searchable grid of all channels (setting "Subscriptions window").
- Presets: Performance, Balanced and Beauty. New options: Animations, Ambient glow.
- "Copy diagnostics" now includes per-step timing (`perf`), grid history and layout shifts.
- `just check` fails when code sets a `ytc-*` class or attribute that has no CSS.

### Changed
- Passes run when the browser is idle, and skip changes made by ReTube itself. A failing step no longer stops the others.

- The v2.9.0 script lives in `legacy/` and runs unchanged from the new build until its features move to `src/features/`.

## [2.9.0]

Last single-file release as "YouTube Classic+". See `legacy/youtube-classic-plus.user.js`.
