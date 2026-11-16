/*
 * Command palette: Ctrl+K (or Alt+Shift+K) finds any action, preset or on/off setting by name.
 */
import { h, icon, isTyping, scrollToComments, scrollToRelated, scrollToVideo } from '../core/dom';
import { PRESET_LABELS, type PresetId } from '../core/presets';
import { isWatch, state } from '../core/settings';
import { openChannels } from './channels';
import { SECTIONS, setPreset, setSetting, togglePanel } from './panel';

type Command = { title: string; hint: string; keywords: string; run: () => void };

function commands(): Command[] {
  const list: Command[] = [
    {
      title: 'Open settings',
      hint: 'Alt+Shift+Y',
      keywords: 'retube preferences options',
      run: () => togglePanel(true),
    },
    {
      title: 'Subscriptions',
      hint: 'All channels with search',
      keywords: 'channels subs',
      run: openChannels,
    },
  ];
  if (isWatch()) {
    list.push(
      { title: 'Go to comments', hint: 'Alt+Shift+C', keywords: 'jump scroll', run: scrollToComments },
      {
        title: 'Back to the video',
        hint: 'Alt+Shift+V',
        keywords: 'jump scroll top player',
        run: scrollToVideo,
      },
      {
        title: 'Go to recommendations',
        hint: 'Alt+Shift+R',
        keywords: 'related jump scroll',
        run: scrollToRelated,
      },
    );
  }
  for (const [id, label] of PRESET_LABELS) {
    if (id === 'custom') continue;
    list.push({
      title: `Preset: ${label}`,
      hint: state.S.preset === id ? 'Active' : 'Apply',
      keywords: 'look speed mode',
      run: () => setPreset(id as PresetId),
    });
  }
  for (const section of SECTIONS) {
    for (const item of section.items as any[]) {
      if (item.type !== 'bool') continue;
      const on = !!state.S[item.key];
      list.push({
        title: `${on ? 'Turn off' : 'Turn on'}: ${item.title}`,
        hint: section.title,
        keywords: `${item.hint ?? ''} toggle setting`,
        run: () => setSetting(item.key, !on),
      });
    }
  }
  list.push({
    title: 'Reload page',
    hint: 'Applies layout changes',
    keywords: 'refresh',
    run: () => location.reload(),
  });
  return list;
}

/** Every word of the query must appear in the title, hint or keywords. */
export function matches(cmd: Pick<Command, 'title' | 'hint' | 'keywords'>, query: string): boolean {
  const hay = `${cmd.title} ${cmd.hint} ${cmd.keywords}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

let root: HTMLElement | null = null;
let lastFocus: Element | null = null;

export function closePalette(): void {
  root?.remove();
  root = null;
  if (lastFocus instanceof HTMLElement) lastFocus.focus();
}

export function openPalette(): void {
  if (root) return;
  lastFocus = document.activeElement;
  const all = commands();
  let shown: Command[] = all;
  let index = 0;

  const list = h('ul', { class: 'ytc-cmd-list', role: 'listbox', 'aria-label': 'Commands' });
  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    closePalette();
    cmd.run();
  };
  const render = () => {
    list.replaceChildren(
      ...shown.slice(0, 50).map((cmd, i) =>
        h(
          'li',
          {
            class: 'ytc-cmd',
            role: 'option',
            'aria-selected': String(i === index),
            onclick: () => run(cmd),
            onmousemove: () => {
              if (index === i) return;
              index = i;
              render();
            },
          },
          h('span', { class: 'ytc-cmd-title' }, cmd.title),
          h('span', { class: 'ytc-cmd-hint' }, cmd.hint),
        ),
      ),
    );
    if (!shown.length) list.append(h('li', { class: 'ytc-psearch-empty' }, 'No matching commands'));
    list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  };

  const input = h('input', {
    type: 'search',
    class: 'ytc-psearch-input',
    placeholder: 'Type a command or setting',
    'aria-label': 'Command',
    oninput: (e: Event) => {
      const q = (e.target as HTMLInputElement).value;
      shown = all.filter((c) => matches(c, q));
      index = 0;
      render();
    },
  }) as HTMLInputElement;

  const box = h(
    'div',
    { class: 'ytc-cmd-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Command palette' },
    h('label', { class: 'ytc-psearch-box ytc-cmd-input' }, icon('search', 18), input),
    list,
    h('div', { class: 'ytc-cmd-foot' }, '↑↓ to move · Enter to run · Esc to close'),
  );
  box.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!shown.length) return;
      index = (index + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.min(shown.length, 50);
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(shown[index]);
    }
  });

  root = h(
    'div',
    { class: 'ytc-cmd-root' },
    h('div', { class: 'ytc-backdrop ytc-cmd-backdrop', onclick: closePalette }),
    box,
  );
  document.body.append(root);
  render();
  input.focus();
}

export function installPalette(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (!state.S.commandPalette) return;
      const k = e.code === 'KeyK';
      const ctrlK = k && (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && !isTyping(e);
      const altK = k && e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
      if (!ctrlK && !altK) return;
      e.preventDefault();
      e.stopPropagation();
      if (root) closePalette();
      else openPalette();
    },
    true,
  );
}
