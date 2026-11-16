<p align="center">
  <img src="assets/banner.png" alt="Re-Tube: the classic YouTube, refined" width="100%">
</p>

<p align="center">
  <a href="https://github.com/kYaRick/kya.retube/actions/workflows/ci.yml"><img src="https://github.com/kYaRick/kya.retube/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/kYaRick/kya.retube/releases/latest"><img src="https://img.shields.io/github/v/release/kYaRick/kya.retube" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue" alt="License: GPL-3.0"></a>
</p>

<p align="center">
  <b>Re-Tube</b> (Restore YouTube) keeps YouTube's classic watch page and adds the small tools YouTube never did.
</p>

## ✨ Highlights

- 🎬 **Classic layout.** Description and comments under the video, recommendations on the right.
- 🎨 **Presets.** Performance, Balanced or Beauty in one click, then fine-tune anything.
- 📺 **Subscriptions window.** Every channel in one searchable grid, new videos first.
- ⌨️ **Command palette.** <kbd>Ctrl</kbd>+<kbd>K</kbd> finds any setting or action by name.
- 💬 **Comment tools.** Creator, pinned and hearted highlights, Top and Popular chips, search, spam filter.
- 🛡️ **Clean feeds.** Hide Shorts, Playables and shelves you do not use; a grid that fits your window.

<p align="center">
  <img src="docs/src/assets/screens/watch-dark.png" alt="A watch page with Re-Tube: comments under the video with creator and hearted highlights, Top and Popular chips, recommendations on the right" width="100%">
</p>

<p align="center">
  <img src="docs/src/assets/screens/settings-dark.png" alt="The Re-Tube settings window" width="100%">
</p>

<p align="center"><sub>Screenshots use a mock page with made-up channels.</sub></p>

## 📥 Install

Re-Tube is a userscript. It runs in any of these hosts:

| Host | How | Auto-update |
| --- | --- | --- |
| [Violentmonkey](https://violentmonkey.github.io/) | Open [`retube.user.js`](https://github.com/kYaRick/kya.retube/releases/latest/download/retube.user.js) and confirm | ✅ Yes |
| [Tampermonkey](https://www.tampermonkey.net/) | Open [`retube.user.js`](https://github.com/kYaRick/kya.retube/releases/latest/download/retube.user.js) and press **Install** | ✅ Yes |
| [Enhancer for YouTube](https://www.mrfdev.com/enhancer-for-youtube) | Paste the code into **Custom script**, save, select automatic run, reload YouTube | ❌ No, paste each new version |

On YouTube, press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>Y</kbd> for settings. Turn on Re-Tube in one host only: two copies conflict.
Step-by-step guide with screenshots: [Install](https://kyarick.github.io/kya.retube/install/).

Upgrading from "YouTube Classic+"? Re-Tube replaces it and keeps your settings.

## 📚 Documentation

[kyarick.github.io/kya.retube](https://kyarick.github.io/kya.retube/) · [Українська](https://kyarick.github.io/kya.retube/uk/)

## 💻 Development

Requires [Bun](https://bun.sh) and [just](https://just.systems).

```bash
just setup       # install dependencies
just dev         # dev server for Violentmonkey
just e2e-setup   # install Playwright browsers (once)
just ci          # lint, types, tests, build, docs
```

See [Architecture](https://kyarick.github.io/kya.retube/dev/architecture/) before you add a feature.

## 📄 License

[GPL-3.0](LICENSE)


---

<p align="center">✨ Made with love to 💛Ukraine💙</p>
