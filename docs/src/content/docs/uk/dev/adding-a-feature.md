---
title: Додавання нової функції
description: Контракт модуля фічі та покрокова інструкція для розробників.
---

## 🚀 Кроки

1. Створіть `src/features/<name>/index.ts` та, за потреби, `style.css`.
2. Експортуйте один об'єкт через `defineFeature()`.
3. Додайте його до `src/features/index.ts`. Позиція визначає порядок викликів `pass()`.
4. Винесіть нові селектори YouTube до `src/core/selectors.ts`.
5. Додайте unit-тест для чистої логіки та E2E-сценарій для поведінки на сторінці.
6. Опишіть функцію у `docs/src/content/docs/features.md` та `docs/src/content/docs/uk/features.md`.

## 📝 Контракт

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

| Хук | Коли запускається |
| --- | --- |
| `init` | Один раз на старті |
| `pass` | На кожну зміну DOM із затримкою (debounce), лише на сторінках відповідного `scope` |
| `onNavigate` | Після внутрішньої навігації YouTube (`yt-navigate-finish`) |
| `onSettings` | Після зміни налаштування користувачем |

Записи в `settings` автоматично стають стандартними значеннями та рядками у вікні налаштувань. Редагувати код панелі не потрібно.
