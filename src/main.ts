import './styles/theme.css';
import { initFlags } from './core/flags';
import { startRuntime } from './core/runtime';
import { state } from './core/settings';

/*
 * ReTube userscript
 * Modular entry point.
 */

initFlags(state.S.classicLayout);

if (document.body) {
  startRuntime();
} else {
  document.addEventListener('DOMContentLoaded', startRuntime, { once: true });
}
