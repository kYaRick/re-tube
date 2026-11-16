export interface HiddenSection {
  id: string;
  label: string;
  hint: string;
  enabled: boolean;
  titles: readonly string[];
  labels?: readonly string[];
  selectors: readonly string[];
}

export const CONFIG = {
  defaults: {
    classicLayout: true,
    compact: true,
    autoExpand: false,
    floatingNav: true,
    askButton: true,
    extToolbarSpace: true,
    extToolbarStyle: true,
    cardLayout: 'sections',
    markCreator: true,
    markPinned: true,
    markHearted: true,
    likeChips: true,
    warmLikes: 100,
    hotLikes: 1000,
    commentSearch: true,
    hideSpam: true,
    highlightWords: '',
    hideWords: '',
    dimWatched: true,
    compactRelated: true,
    hideShorts: false,
    portraitMode: 'auto',
    collapseComments: 'portrait',
    portraitComments: 5,
    portraitGrid: true,
    gridMode: 'auto',
    gridCardWidth: 320,
    gridColumns: 4,
    hiddenSectionTitles: '',
    accent: '#3ea6ff',
    fluent: true,
    fluentReveal: false,
    motion: true,
    channelsModal: true,
    commandPalette: true,
    ambientMode: true,
    preset: 'balanced',
    fluentVideoCards: true,
    watchedBadge: true,
  },
  fluent: {
    blur: 40,
    acrylicOpacity: 76,
    revealRadius: 260,
    watchedAt: 90,
  },
  hiddenSections: [
    {
      id: 'playables',
      label: 'Hide YouTube Playables',
      hint: 'Games shelf on Home and the Playables entry in the menu',
      enabled: true,
      titles: ['YouTube Playables', 'Playables'],
      labels: ['Playables'],
      selectors: [
        'ytd-rich-section-renderer:has(a[href^="/playables"])',
        'ytd-guide-entry-renderer:has(a[href^="/playables"])',
        'ytd-mini-guide-entry-renderer:has(a[href^="/playables"])',
      ],
    },
    {
      id: 'exploreTopics',
      label: 'Hide "Explore more topics"',
      hint: 'Topic suggestions block in the Home feed',
      enabled: true,
      titles: ['Explore more topics', 'Explore topics'],
      selectors: ['ytd-feed-nudge-renderer'],
    },
    {
      id: 'watchTogether',
      label: 'Hide "Watch together"',
      hint: 'Its button, menu item, sidebar entry and Home shelf',
      enabled: true,
      titles: ['Watch together'],
      labels: ['Watch together', 'Дивитися разом', 'Смотреть вместе'],
      selectors: [],
    },
    {
      id: 'news',
      label: 'Hide news shelves',
      hint: '"Breaking news" and "Top news" on Home',
      enabled: false,
      titles: ['Breaking news', 'Top news'],
      selectors: [],
    },
    {
      id: 'posts',
      label: 'Hide community posts',
      hint: '"Latest YouTube posts" shelf on Home',
      enabled: false,
      titles: ['Latest YouTube posts', 'Latest posts'],
      selectors: ['ytd-rich-section-renderer:has(ytd-post-renderer, ytd-backstage-post-thread-renderer)'],
    },
  ] as const satisfies readonly HiddenSection[],
  spamPatterns: [
    't\\.me/',
    'telegram',
    'whats\\s?app',
    'wa\\.me/',
    'viber',
    '\\+\\d[\\d\\s()-]{9,}',
    '\\b(dm|pm|text) me\\b',
    'пиши(те)? (мені|мне) в',
    'пиши(те)? в (тг|телеграм)',
    'заробіток без вкладень',
    'заработок без вложений',
  ],
  askLabels: ['Ask', 'Запитати', 'Спитати', 'Спросить', 'Задати питання', 'Задать вопрос'],
  accentPresets: ['#3ea6ff', '#8b7cf6', '#2fbf8f', '#f06aa8', '#f2a900', '#ff6b5a'],
  grid: {
    gap: 24,
    maxColumns: 12,
    shortsRatio: 1.6,
  },
  portraitMaxWidth: 1400,
  extensionToolbars: {
    selectors: ['#efyt-control-bar'],
    gap: 10,
  },
  related: {
    thumbWidth: 168,
    compactThumbWidth: 144,
  },
  storageKey: 'ytc:settings:v2',
};

export const DEFAULTS: Record<string, any> = { ...CONFIG.defaults };
for (const section of CONFIG.hiddenSections) {
  DEFAULTS[`hideSection_${section.id}`] = !!section.enabled;
}
