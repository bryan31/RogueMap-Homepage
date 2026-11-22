# Stop Reading Docs, Let AI Use RogueMap for You: Introducing the How2useRogueMap Skill

> Give your AI coding assistant a source-verified RogueMap knowledge pack. Writing RogueMap code or asking about RogueMap usage — the AI no longer has to guess.

---

## The Pain Point First

I've been writing code with AI assistants like Cursor and Claude Code for a long time, and they're genuinely fast. But the moment the topic turns to RogueMap, things go wrong.

RogueMap is a fairly new open-source project, so AI training data contains almost nothing about it. When you ask "how do I configure RogueMap persistence?" or "how do I tune RogueMemory hybrid search?", the AI won't honestly say it doesn't know — it will confidently make things up:

- Inventing a method that doesn't exist, like `RogueMap.builder()`;
- Stating a wrong configuration default with complete confidence;
- Describing durability guarantees that only exist in its imagination.

These answers all look plausible but fail the moment you run them. Worse are the ones that don't fail — the behavior silently diverges from what you expected, and by the time you notice, it's already in production.

## What How2useRogueMap Does

How2useRogueMap is an Agent Skill — put simply, a "RogueMap knowledge pack for AI". Its content isn't scraped from blogs or search summaries; every fact was verified against the RogueMap 1.1.7 source code, covering off-heap collections, codecs, indexes, transactions, TTL, persistence, crash recovery, RogueMemory hybrid retrieval, and embeddings.

Once installed, whether the AI is writing RogueMap code for you, answering usage questions, or troubleshooting errors, it works from source code instead of training memory. You don't need to read the docs or learn the API first — just hand your requirements to the AI.

## Why It Doesn't Make Things Up

The skill enforces three hard rules:

1. **Bundled knowledge first.** Common questions — configuration, API usage, capacity planning — are answered straight from the built-in reference documents, offline.
2. **Source-code fallback.** For implementation details not covered by the bundled knowledge, the skill first looks for a local RogueMap checkout. If there isn't one, with your permission it clones the official repository at the verified commit and answers with exact source citations.
3. **Say "unconfirmed" when it can't confirm.** If neither the references nor the matching source can settle a question, the skill tells you so plainly instead of guessing.

On top of that, the skill ships a "hallucination table" listing the wrong spellings AI assistants most often invent — like writing `mem.hybridSearch()` instead of `mem.search()`, or `RogueMap.Transaction` instead of `RogueMapTransaction`. When the AI sees these, it corrects them instead of running with the wrong API.

## Not a Static Copy: The Skill Checks for Its Own Updates

Knowledge packs like this share a common flaw: once installed, they're static copies. Updates on the author's side never reach you, and stale knowledge answering new questions is only a matter of time. How2useRogueMap ships with a built-in version self-check:

- The first time the skill triggers in each session, it runs `scripts/version-check.sh` to compare its local `version` field against the remotely published SKILL.md;
- If a newer version exists upstream, it tells you both version numbers and, with your consent, runs `npx skills update` to upgrade;
- The check only reads one field from the remote file and executes no remote code; results are cached per day, and offline or timeout failures are silently skipped without affecting normal use.

Manual updates work too:

```bash
npx skills update how2useroguemap -g -y   # global install
npx skills update how2useroguemap -p -y   # project install
```

If you're worried you'll see the prompt and forget, you can also wire the check script into your agent's hook system to enforce it. With Kimi Code, for example, add this to `~/.kimi-code/config.toml`:

```toml
[[hooks]]
event = "UserPromptSubmit"
matcher = "[Rr]ogue(Map|List|Set|Queue|Memory)"
command = "sh ~/.agents/skills/how2useroguemap/scripts/version-check.sh || true"
```

Don't drop the trailing `|| true` — some hook systems interpret exit code 2 as "block", while in this script 2 means "an update is available". Claude Code has an equivalent setup (a SessionStart hook); see the repository README for the full configuration.

## Install: One Command

Install via the skills CLI:

```bash
npx skills add bryan31/How2useRogueMap
```

Optional flags:

```bash
# Global install, target Codex, and skip confirmation
npx skills add bryan31/How2useRogueMap@how2useroguemap -g -a codex -y
```

The entire skill directory (including `references/`, `scripts/`, and `assets/`) is copied into your agent's configuration directory — no extra setup needed. It works with Cursor, Claude Code, Codex, Kimi Code, and similar assistants.

::: tip Note
This command installs the AI skill, not the RogueMap Java library itself. To use RogueMap in a project, you still need the corresponding `com.yomahub` Maven dependency.
:::

## How to Use It After Installation

There's nothing new to learn. If you want code, describe what you need; if you have a question, just ask. The skill activates automatically when you mention RogueMap, RogueList, RogueSet, RogueQueue, RogueMemory, `UniversalEmbeddingProvider`, or related setup, persistence, retrieval, capacity planning, and troubleshooting topics.

The most direct way to use it is to have the AI write the code for you:

- "Write a local KV cache based on RogueMap — it needs persistence and crash recovery."
- "Add a conversation memory module to my app with RogueMemory, with hybrid search."
- "Review this RogueMap code and check for pitfalls."

The code it writes uses APIs that actually exist: the entry point is `RogueMap.mmap()`, not the `builder()` the AI would otherwise invent, and imports, resource closing, and variable scoping are all complete — it runs as-is, no cross-checking method names against the docs.

Plain questions work too:

- "How do I enable mmap persistence in RogueMap? How much can it recover after a crash?"
- "How do I tune the weights of RogueMemory's vector + BM25 hybrid search?"
- "I need to store 50 million KV entries — how much off-heap memory should I plan for?"
- "What does this error mean: ..."

Previously, all of this meant digging through docs and source yourself, or gambling that the AI remembered correctly. Now the code and the answers come verified against the source, with citations.

## Version Scope

- RogueMap: **1.1.7**
- Java: **8+**
- Source verification baseline: `e78b7f9b1825e35910119284d6299aab5265c039`

If you ask about another version, the skill re-checks that version's source instead of reusing conclusions from 1.1.7.

## Closing

My motivation for building this skill was simple: I didn't want to keep spending time double-checking whether the AI was right. Rather than second-guessing every answer, I'd rather feed it verified knowledge directly.

Give it a try — stars and issues are welcome:

- **Skill repository**: https://github.com/bryan31/How2useRogueMap
- **RogueMap repository**: https://github.com/bryan31/RogueMap
- **Website**: https://roguemap.yomahub.com/
