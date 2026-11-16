---
title: Presets
description: Performance, Balanced and Beauty set a group of options at once.
---

The preset switch sits in the header of the settings window. A preset is a starting point: change any of its options and the switch shows **Custom**.

| Option | ⚡ Performance | ⚖️ Balanced (default) | ✨ Beauty |
|---|---|---|---|
| Fluent style (blur, acrylic) | off | on | on |
| Reveal highlight (cursor light) | off | off | on |
| Fluent video cards | off | on | on |
| Animations | off | on | on |
| Cards on the watch page | off | sections | sections |
| Watched badge, dim watched | off | on | on |
| Popularity chips | off | on | on |
| Ambient glow around the player | off | on | on |

Presets do not change your words, thresholds, colours or hidden sections.

## 🎯 Which one to choose

- **Performance** for older laptops, battery saving or many open tabs. It turns off everything that the GPU redraws while you scroll.
- **Balanced** for most people: the full look without the cursor light.
- **Beauty** when you want every effect.

## 💡 What costs the most

Measured on live YouTube, Re-Tube's own page work is small (about 12 ms per pass, about once per second) in every preset. The visual cost comes from effects the browser redraws: blur behind the header and panels, the cursor light, shadows and animations. Re-Tube already turns blur off while the page scrolls.

The ambient glow is YouTube's own effect around the player. Switching it needs a page reload.

You can also switch presets from the [command palette](../command-palette/): type `preset`.
