import { readFileSync } from 'node:fs';

/*
 * Init script that runs dist/retube.user.js the way Violentmonkey does at document-start.
 * Playwright init scripts run before <html> exists; the userscript manager runs after it,
 * and the injected styles need document.documentElement.
 * The code is inlined, not eval'd: YouTube's CSP blocks eval.
 */
export function userscriptInitScript(path = 'dist/retube.user.js'): string {
  const code = readFileSync(path, 'utf8');
  return `(() => {
  const run = () => {
${code}
  };
  if (document.documentElement) return run();
  const mo = new MutationObserver(() => {
    if (document.documentElement) { mo.disconnect(); run(); }
  });
  mo.observe(document, { childList: true });
})();`;
}
