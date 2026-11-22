# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

RogueMap documentation site — a VitePress-powered static site documenting a Java off-heap embedded storage engine and AI memory layer. All content is written in Chinese (zh-CN).

The documented product has two main modules:
- **roguemap-core**: Off-heap data structures (RogueMap, RogueList, RogueSet, RogueQueue) with mmap-based persistence
- **roguemap-memory**: AI memory layer with vector ANN + BM25 hybrid search (RogueMemory)

## Commands

```bash
npm run docs:dev      # Local dev server (hot-reload)
npm run docs:build    # Production build → .vitepress/dist/
npm run docs:preview  # Preview production build locally
```

No tests or linting are configured.

## Architecture

### VitePress Configuration

- **`.vitepress/config.mts`** — Single source of truth for site structure: nav, sidebar, search, theme, and i18n settings. All routes are defined here.
- **`.vitepress/theme/index.ts`** — Theme entry; extends VitePress default theme. Register custom Vue components here.
- **`.vitepress/theme/Layout.vue`** — Wraps the default layout; provides a View Transitions circular reveal for the light/dark toggle.
- **`.vitepress/theme/home/`** — Homepage section components (`HomeHero`, `HomeHeap`, `HomeFeatures`, `HomeQuickstart`, `HomeStructures`, `HomeSkill`, `HomePath`), registered globally and composed in order inside `index.md` / `en/index.md`. All homepage copy and benchmark numbers (zh + en) live in `home/content.ts`; code samples stay in the `<HomeQuickstart>` slot of the markdown so Shiki highlights them. `home/memoryField.ts` draws the hero's animated memory-page canvas.
- **`.vitepress/theme/home/home.css`** — Homepage design tokens (`--rh-*`, light + `.dark`) and shared section/button styles. Colors come from the logo (indigo `#3451B2` / lavender `#A8B1FF`, orange `#F29D00`); reuse these tokens rather than adding new hues. The display face is self-hosted Archivo (`@fontsource-variable/archivo`), so no Google Fonts request is needed.
- **`.vitepress/theme/style.css`** — Global brand palette for docs pages (`--vp-c-*` / `--home-*`) and nav/footer polish. Keep homepage-only styling out of this file.

### Content Sections

Content is organized by URL prefix, each with its own sidebar group:

| Directory | Nav section | Purpose |
|---|---|---|
| `guide/` | RogueMap 指南 | Core engine docs: data structures, codecs, persistence, concurrency, transactions. Also hosts the `AI Skill` page (`guide/ai-skill.md`, linked from top nav) |
| `rogue-memory/` | RogueMemory 指南 | AI memory layer: search modes, embeddings, namespaces, storage |
| `performance/` | 性能白皮书 | Benchmarks |
| `article/` | (release notes) | Version release announcements |

### Key Patterns

- Sidebar and nav are **manually maintained** in `config.mts` — adding a new page requires creating the `.md` file AND adding its entry to the sidebar config.
- Content is bilingual: every Chinese page under `guide/`, `rogue-memory/`, `performance/`, `article/` must have an English mirror under `en/`. Run `node scripts/check-locales.mjs` to verify.
- `index.md` / `en/index.md` use `layout: home` with `markdownStyles: false` and only compose the `Home*` components; edit homepage text in `.vitepress/theme/home/content.ts` (keep zh and en in sync, and bump `VERSION` there plus the Maven snippet in both markdown files on each release).
- Static assets live in `public/` (logos in light/dark variants).
- Build output goes to `.vitepress/dist/`.

## Conventions

- All documentation is in Chinese; code comments and technical terms may use English.
- Code examples use Java (the documented product's language), not JavaScript/TypeScript.
- The site uses local search (no Algolia).
