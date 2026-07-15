# RogueMemory Introduction

RogueMemory is the built-in AI memory layer of RogueMap 1.1.7, which provides hybrid retrieval capabilities of vector approximate search (ANN) and BM25 keyword retrieval. All data is stored based on mmap persistence.

**No external vector database or search engine required**, works out of the box.

## Why do you need RogueMemory?

If you are developing an AI Agent or LLM application, you usually need to let the system "remember" previous conversations, user preferences, knowledge base and other information. The traditional approach is to introduce an external vector database (such as Milvus, Pinecone) or search engine (such as Elasticsearch), which increases deployment complexity and operation and maintenance costs.

RogueMemory gives you these capabilities directly in your Java applications:

- **AI Agent long-term memory** — persists conversation context and user preferences across sessions, giving the Agent real memory capabilities
- **RAG (Retrieval Augmentation Generation)** — Embedding-based document/knowledge base retrieval, providing precise context for LLM applications
- **Semantic Search** — perform "find similar" queries on any embeddable content such as text and code
- **Hybrid retrieval** — Semantic understanding + precise keyword matching dual-channel recall to improve recall accuracy

## Core Features

- **Hybrid Search** — Vector ANN (HNSW) + BM25 keyword dual channel, sorted by Reciprocal Rank Fusion
- **Multi-service provider support** — Compatible with all Embedding services that implement the OpenAI `/v1/embeddings` protocol, regardless of service provider
- **Zero external dependencies** — All data is persisted based on mmap, without the need to introduce vector databases or search engines
- **Automatic Dimension Inference** — No need to manually specify Embedding vector dimensions
- **Metadata filtering** — Attach key-value pair tags to the memory, and filter by tag when retrieving (supports eq, gt, gte, lt, lte, in, between and other operators)
- **Namespace Isolation** — partition by user or business logic, specify range when retrieving
- **Available offline** — `KEYWORD_ONLY` mode does not require Embedding API at all, pure local BM25 retrieval

## Functional boundaries

RogueMemory feature boundaries for the current version (1.1.7):

| Capabilities | Status | Description |
|---|---|---|
| Vector + BM25 hybrid search | Supported | Three modes: HYBRID / VECTOR_ONLY / KEYWORD_ONLY |
| mmap persistence and recovery | Supported | Turn off automatic persistence normally, and automatically rebuild the index when exiting abnormally |
| Manual checkpoint | Supported | `checkpoint()` manual flash |
| Automatic checkpoint | Supported | `autoCheckpoint(interval, TimeUnit)` and `autoCheckpoint(count)` two modes |
| Namespace guard operations | Supported | `delete(id, ns)`, `update(id, ns, content)`, `deleteByNamespace(ns)`, `exists(id, ns)` |
| Metadata advanced filtering | Supported | `Filter.eq/gt/gte/lt/lte/in/between`, supports multiple condition combinations for the same key |
| Existence check | Supported | `exists(id)` efficiently determines whether the memory exists without reading the complete record |
| TTL data expiration | Not supported | The storage layer has reserved the `expireTime` field, and the public API has not yet been exposed |

## Module dependencies

```xml
<!-- Core off-heap data structures-->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>

<!-- AI memory layer (automatically transfer dependencies roguemap-embedding)-->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.7</version>
</dependency>
```

`roguemap-memory` will automatically pass the dependency `roguemap-embedding` (providing `UniversalEmbeddingProvider`), you do not need to introduce it separately.

## Reading path

1. [Quick Start ](./quick-start.md) — Get up and running in 5 minutes
2. [Search mode ](./search-modes.md) — HYBRID / VECTOR_ONLY / KEYWORD_ONLY detailed explanation
3. [Data operation ](./data-operations.md) — addition, deletion, modification, search and search
4. [Metadata and Namespace ](./metadata-namespace.md) — Filtering and Isolation
5. [Embedding service configuration ](./embedding-config.md) — docking various Embedding services
6. [Storage structure and performance ](./storage-and-performance.md) — underlying storage structure, algorithm parameters and performance characteristics
7. [Persistence and Operation and Maintenance ](./persistence.md) - Persistence Recovery, Space Recycling
8. [Checkpoint vs. Automatic Checkpoint ](./auto-checkpoint.md) — Manual vs. Automatic Checkpoint Configuration
