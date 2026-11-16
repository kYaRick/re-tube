// @ts-check

import { fileURLToPath } from 'node:url';
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

// Repository root with forward slashes, e.g. C:/.git/re-tube
const repoRoot = fileURLToPath(new URL('..', import.meta.url))
  .replace(/\\/g, '/')
  .replace(/\/$/, '');

// Add a language: add it to `locales`, then copy pages into src/content/docs/<lang>/.
// Pages that are not translated yet fall back to English.
export default defineConfig({
  site: 'https://kyarick.github.io',
  base: '/re-tube',
  vite: {
    server: {
      fs: {
        // Vite's default deny list has "**/.git/**". It matches the absolute path, so a checkout
        // inside a folder named ".git" (C:/.git/re-tube) blocks every file in dev.
        // Same list, but .git folders are denied only inside the repository.
        deny: [
          '.env',
          '.env.*',
          '*.{crt,pem,key,p12,pfx,cer,der}',
          '.npmrc',
          '.yarnrc.yml',
          `${repoRoot}/**/.git/**`,
        ],
      },
    },
  },
  integrations: [
    starlight({
      title: 'Re-Tube',
      logo: { src: './src/assets/logo.svg' },
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/kYaRick/re-tube' }],
      editLink: { baseUrl: 'https://github.com/kYaRick/re-tube/edit/main/docs/' },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        uk: { label: 'Українська', lang: 'uk' },
      },
      sidebar: [
        {
          label: 'Guide',
          translations: { uk: 'Посібник' },
          items: [
            { slug: 'install' },
            { slug: 'features' },
            { slug: 'settings' },
            { slug: 'presets' },
            { slug: 'subscriptions' },
            { slug: 'command-palette' },
            { slug: 'troubleshooting' },
          ],
        },
        {
          label: 'Development',
          translations: { uk: 'Розробка' },
          items: [{ slug: 'dev/architecture' }, { slug: 'dev/adding-a-feature' }, { slug: 'roadmap' }],
        },
      ],
      customCss: ['./src/styles/theme.css'],
    }),
  ],
});
