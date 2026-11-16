# 🧪 E2E tests

Playwright tests on mock YouTube pages (`page.route()` serves `tests/fixtures/*.html`).
The built script is injected with `page.addInitScript({ path: 'dist/retube.user.js' })`.

## 🚀 Running tests

```bash
just e2e-setup   # install Chromium and Firefox once
just e2e         # run Playwright suite
```

## 📋 Scenarios

Ported from the v2.9.0 Puppeteer smoke tests:
- Comments, portrait mode, floating nav
- Settings panel, command palette, subscriptions window
- Home grid by width, section hiding, label hiding, section cards
- Enhancer for YouTube toolbar, related thumbnails
