import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';
import pkg from './package.json' with { type: 'json' };

const repo = 'https://github.com/kYaRick/kya.retube';
const releaseUrl = `${repo}/releases/latest/download/retube.user.js`;

export default defineConfig({
  define: { __RETUBE_VERSION__: JSON.stringify(pkg.version) },
  // Vite denies "**/.git/**" by default; allow checkouts that live under a ".git" folder
  server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}'] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rolldownOptions: {
      output: {
        // vite-plugin-monkey 8.1.1 emits the intro without ";", which breaks a bundle that starts with "("
        intro: "'use strict';",
      },
    },
  },
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'ReTube',
        // Same namespace as "YouTube Classic+" so Violentmonkey updates the existing script
        namespace: 'local.yt-classic-watch',
        version: pkg.version,
        description: pkg.description,
        icon: 'https://raw.githubusercontent.com/kYaRick/kya.retube/main/assets/icons/48.png',
        homepageURL: repo,
        supportURL: `${repo}/issues`,
        updateURL: releaseUrl,
        downloadURL: releaseUrl,
        license: 'GPL-3.0-only',
        match: ['https://www.youtube.com/*'],
        'run-at': 'document-start',
        'inject-into': 'page',
        grant: 'none',
        noframes: true,
      },
      build: {
        fileName: 'retube.user.js',
      },
    }),
  ],
});
