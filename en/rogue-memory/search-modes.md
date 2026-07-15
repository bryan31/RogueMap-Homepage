# Search mode

RogueMemory provides three retrieval modes, suitable for different scenarios.

## Overview

| Pattern | Description | Requires EmbeddingProvider | Suitable for scene |
|---|---|---|---|
| `HYBRID` | Vector + keyword mixed search (default) | Required | Most scenarios, taking into account both semantics and exact matching |
| `VECTOR_ONLY` | Pure vector approximate search | Required | Pure semantic search |
| `KEYWORD_ONLY` | Pure BM25 keyword search | Not required | Plain text matching, no external API required |

`searchMode()` configuration via Builder:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)   // Switch modes here
    .embeddingProvider(provider)
    .build();
```

---

## HYBRID (default, recommended)

At the same time, the two channels of trend quantity ANN and BM25 keywords are fused and sorted through **Reciprocal Rank Fusion (RRF)**.

Workflow:
1. Vector channel: Convert query text into vector and perform approximate nearest neighbor search in HNSW index
2. Keyword channel: segment the query text and calculate the relevance score in the BM25 inverted index
3. RRF fusion: The two channels each return candidate results, which are merged and sorted according to the RRF formula.

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)   // The default is HYBRID and can be omitted
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

List<MemoryResult> results = mem.search("User preferences", 5);
```

**Advantages**: Semantic understanding and precise matching are both achieved, and the recall quality is the highest.

---

## VECTOR_ONLY

Only go to the quantitative channel, purely semantic search.

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.VECTOR_ONLY)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

List<MemoryResult> results = mem.search("Contents with similar meaning to this passage", 5);
```

**Suitable scenarios**: cross-language search, fuzzy semantic matching, scenarios that do not require precise keywords.

---

## KEYWORD_ONLY

Only use the BM25 keyword channel, not volume search.

**The biggest advantage: No `EmbeddingProvider` required**, no external API calls, completely local operation.

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)
    // No embeddingProvider is required
    .build();

List<MemoryResult> results = mem.search("dark mode", 5);
```

**Suitable scene**:
- No semantic understanding is required, only keyword matching is required
- Unable to access external Embedding API (intranet environment)
- Want the fastest retrieval speed

### Chinese word segmentation

BM25 search uses **bigram word segmentation** (two-character sliding window) for Chinese and space word segmentation for English. It automatically detects the language and requires no additional configuration.

For example, "User Preference Dark Mode" will be divided into: `用户`, `户偏`, `偏好`, `好深`, `深色`, `色模`, `模式`.

---

## How to choose?

```
Need semantic understanding?
  ├─ Yes → Need exact keyword matching?
  │ ├─ Yes → HYBRID (recommended)
  │ └─ No → VECTOR_ONLY
  └─ No → KEYWORD_ONLY (No Embedding API required)
```

## RRF constant tuning

In HYBRID mode, RRF fusion uses constant C (default 60). The smaller the C, the greater the weight difference of the top results; the larger the C, the smoother the ranking.

Can be customized via `SearchOptions`:

```java
List<MemoryResult> results = mem.search("Query", 5,
    SearchOptions.builder()
        .rrfConstant(30)    // Default is 60, adjust it smaller to make the head result more prominent.
        .build());
```

In most cases, the default value is sufficient and no adjustment is required.

## Next step

- [Data operation ](./data-operations.md) — Detailed CRUD API
- [Embedding service configuration ](./embedding-config.md) — docking various Embedding services
