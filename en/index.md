---
layout: home

hero:
  name: "RogueMap"
  text: "Embedded storage and AI memory for Java"
  tagline: "mmap-backed off-heap collections and RogueMemory hybrid search break through JVM heap limits, bringing durable storage and intelligent memory to Java applications."
  image:
    light: /logo-in-light.svg
    dark: /logo-in-dark.svg
    alt: RogueMap
  theme: brand
  actions:
    - theme: brand
      text: 10-Minute Guide
      link: /en/guide/quick-start-path
    - theme: alt
      text: Quick Start
      link: /en/guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/bryan31/RogueMap

features:
  - title: Embedded Storage Engine
    details: "RogueMap, RogueList, RogueSet, and RogueQueue are four off-heap data structures, unified Builder style, supporting persistence, transactions, TTL, automatic checkpoints, and crash recovery."

  - title: RogueMemory AI Layer
    details: "Built-in vector ANN + BM25 hybrid search supports embedding services such as OpenAI and Ollama without requiring an external vector database or search engine."

  - title: High Concurrency at Scale
    details: "Segmented indexes, optimistic reads, automatic expansion, and the LowHeap index cut heap usage by up to 99% while supporting terabyte-scale data."

  - title: Built-in Observability
    details: "Use `StorageMetrics` to monitor utilization, fragmentation, and entry counts, trigger compaction at defined thresholds, and track automatic TTL expiration."
---

## Run it in 2 minutes

### Maven dependencies (1.1.7)

```xml
<!-- Core off-heap data structures -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>

<!-- AI memory layer (includes roguemap-embedding transitively) -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.7</version>
</dependency>
```

### Data structure — key-value storage

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data/demo.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    map.put("alice", 100L);
    System.out.println(map.get("alice")); // 100
}
```

### AI memory layer — RogueMemory

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)          // Vector + keyword mixed search
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// Store in memory
mem.add("User preference dark mode");

// Semantic retrieval
List<MemoryResult> results = mem.search("User interface preferences", 5);

mem.close();
```

## Modules

| Module | Description |
|---|---|
| `roguemap-core` | Core off-heap storage - RogueMap, RogueList, RogueSet, RogueQueue |
| `roguemap-memory` | AI memory layer with mmap persistence and vector + BM25 hybrid search |

## Choose a data structure

| Structure | Suitable for scenarios | Core operations |
|---|---|---|
| `RogueMap<K, V>` | Key-value cache, state storage | `put/get/remove` |
| `RogueList<E>` | Sequential data, time series | `addLast/get/removeLast` |
| `RogueSet<E>` | Deduplication, tags, blacklists | `add/contains/remove` |
| `RogueQueue<E>` | Task and message consumption | `offer/poll/peek` |
| `RogueMemory` | AI Agent memory, RAG, semantic search | `add/search/delete` |

## Recommended reading path

1. [10-Minute Guide](/en/guide/quick-start-path)
2. [Quick Start](/en/guide/getting-started)
3. [RogueMemory Introduction](/en/rogue-memory/introduction)
4. [Configuration](/en/guide/configuration)
5. [Troubleshooting](/en/guide/troubleshooting)
