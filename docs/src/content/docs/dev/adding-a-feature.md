---
title: Adding a feature
description: The feature contract and the steps to add one.
---

## 🚀 Steps

1. Create `src/features/<name>/index.ts` and, if needed, `style.css`.
2. Export one `defineFeature()` object.
3. Add it to `src/features/index.ts`. The position sets the order of `pass()` calls.
4. Put new YouTube selectors in `src/core/selectors.ts`.
5. Add a unit test for pure logic and an e2e scenario for page behaviour.
6. Describe the feature in `docs/src/content/docs/features.md`.

## 📝 Contract

```ts
import { defineFeature } from '../../core/feature';
import css from './style.css?inline';

export default defineFeature({
  id: 'comments',
  scope: 'watch', // 'all' | 'watch' | 'browse'
  settings: {
    markCreator: {
      type: 'bool',
      default: true,
      section: 'comments',
      label: 'Highlight the channel owner',
      hint: 'Accent bar on comments and replies by the creator',
    },
  },
  css,
  rootClasses: (S) => ({ 'ytc-mark-creator': Boolean(S.markCreator) }),
  init(ctx) {},
  pass(ctx) {},
  onNavigate(ctx) {},
  onSettings(ctx, changedKeys) {},
});
```

| Hook         | When it runs                                                     |
| ------------ | ---------------------------------------------------------------- |
| `init`       | Once, at start                                                   |
| `pass`       | On every DOM change, debounced. Only on pages that match `scope` |
| `onNavigate` | After YouTube's in-app navigation (`yt-navigate-finish`)         |
| `onSettings` | After the user changes a setting                                 |

`settings` entries become defaults and rows in the settings panel. You do not edit the panel code.
