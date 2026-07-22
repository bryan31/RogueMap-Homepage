# AI Skill: How2useRogueMap

**How2useRogueMap** is an Agent Skill that helps AI use **RogueMap (v1.1.7)** correctly. It bundles source-verified guidance for RogueMap's off-heap collections, persistence and operations, and RogueMemory hybrid retrieval, while enforcing a strict fallback workflow: **never invent APIs, defaults, or durability guarantees**.

If you build RogueMap-based applications with AI coding assistants such as Cursor, Claude Code, Codex, or Kimi Code, installing this skill makes the AI's API usage and configuration advice grounded in the official source code instead of guessed from training memory.

## Install

One-line install via the [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add bryan31/How2useRogueMap
```

Optional flags:

```bash
# Global install, target Codex, and skip confirmation
npx skills add bryan31/How2useRogueMap@how2useroguemap -g -a codex -y
```

The entire skill directory, including `references/`, `scripts/`, and `assets/`, is copied into your agent's configuration directory. No additional skill setup is required.

::: tip Note
This installs the AI skill, not the RogueMap Java library. Add the appropriate `com.yomahub` Maven dependency to your Java project when using RogueMap itself.
:::

## How it works

Install the skill and ask RogueMap questions naturally. It uses a layered strategy:

1. **Distilled knowledge** — built-in quick-reference material and topic-specific documents cover core collections, codecs, indexes, transactions, TTL, persistence, recovery, compaction, RogueMemory, embeddings, and troubleshooting without network access.
2. **Source-code fallback** — for implementation details outside the bundled knowledge, the skill first locates a local RogueMap checkout. With your permission, it can clone the official repository at the verified baseline and answer with exact source citations.
3. **Never fabricate** — if neither the references nor matching source can confirm a behavior, the skill says so instead of guessing.

## How it triggers

The skill activates automatically when you mention RogueMap, RogueList, RogueSet, RogueQueue, RogueMemory, `UniversalEmbeddingProvider`, or related setup, persistence, retrieval, capacity, and troubleshooting topics.

## Version scope

- RogueMap: **1.1.7**
- Java: **8+**
- Source verification baseline: `e78b7f9b1825e35910119284d6299aab5265c039`

Questions about another version trigger a fresh source check rather than reusing 1.1.7 implementation assumptions.

## Repository

- [GitHub: bryan31/How2useRogueMap](https://github.com/bryan31/How2useRogueMap)

## Repository layout

```text
skills/how2useroguemap/
├── SKILL.md          # Decision workflow, quick reference, and knowledge routing
├── references/       # Detailed reference documents by topic
├── scripts/          # Local-first source lookup and controlled clone helper
└── assets/           # Reserved for reusable skill assets
```
