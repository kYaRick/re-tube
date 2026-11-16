import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

// Separate from vite.config.ts: the userscript plugin must not run during tests
export default defineConfig({
  define: { __RETUBE_VERSION__: JSON.stringify(pkg.version) },
  // Vite denies "**/.git/**" by default; allow checkouts that live under a ".git" folder
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}'] } },
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
