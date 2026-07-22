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
- **`.vitepress/theme/components/HomeFeatureMatrix.vue`** — Homepage bento feature grid; reads cards from `index.md` frontmatter `features` (supports optional `link` per card), rendered via the `home-features-before` layout slot.
- **`.vitepress/theme/style.css`** — Custom CSS with brand palette (Slate-Indigo), hero decorations/animations, bento feature cards, and responsive overrides. New styles must reuse the existing `--vp-c-*` / `--home-*` variables — do not introduce new hues.

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
- `index.md` uses VitePress `layout: home` with frontmatter-driven hero/features. Content below the frontmatter renders as homepage body.
- Static assets live in `public/` (logos in light/dark variants).
- Build output goes to `.vitepress/dist/`.

## Conventions

- All documentation is in Chinese; code comments and technical terms may use English.
- Code examples use Java (the documented product's language), not JavaScript/TypeScript.
- The site uses local search (no Algolia).
