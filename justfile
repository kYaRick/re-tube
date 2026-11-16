# ReTube task runner. Run `just` to list recipes.

set windows-shell := ["pwsh.exe", "-NoLogo", "-NoProfile", "-Command"]

default:
    @just --list

# Install dependencies
setup:
    bun install

# Dev server: open the printed URL once to install the dev loader in Violentmonkey
dev:
    bun run dev

# Build dist/retube.user.js
build:
    bun run build

# Lint, format check and type check
check:
    bun run check

# Apply safe lint and format fixes
fmt:
    bun run format

# Unit tests
test:
    bun run test

# Install Playwright browsers for E2E tests
e2e-setup:
    bunx playwright install chromium firefox

# End-to-end tests on mock pages (run `just e2e-setup` once first)
e2e:
    bun run e2e

# Check the build on real YouTube (not in CI): screenshots and metrics in test-results/live/<label>
live label="run" theme="dark": build
    node tests/live/inspect.ts {{label}} {{theme}}

# Screenshots of ReTube's windows for the docs (docs/src/assets/screens)
screens: build
    node tests/live/screens.ts

# Regenerate PNG icons from assets/logo.svg
icons:
    bun run icons

# Documentation site: local preview
docs:
    bun run --cwd docs dev

# Documentation site: static build in docs/dist
docs-build:
    bun run --cwd docs build

# Remove build, Astro cache and test artifacts
clean:
    bun -e "import { rmSync } from 'node:fs'; for (const p of ['dist', 'docs/dist', 'docs/.astro', 'test-results', 'playwright-report']) rmSync(p, { recursive: true, force: true });"

# Remove all generated artifacts including node_modules
clean-all: clean
    bun -e "import { rmSync } from 'node:fs'; for (const p of ['node_modules', 'docs/node_modules']) rmSync(p, { recursive: true, force: true });"

# Everything CI runs
ci: check test build docs-build

# Bump version, commit and tag. Push manually: git push --follow-tags
release version:
    bun pm version {{version}} --no-git-tag-version
    git add package.json
    git commit -m "chore: release v{{version}}"
    git tag v{{version}}
