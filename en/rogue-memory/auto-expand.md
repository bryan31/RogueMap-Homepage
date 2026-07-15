# Automatic expansion

RogueMemory supports automatic expansion. When the memory storage space is insufficient, the file will be automatically expanded by multiples without the need to estimate capacity or re-create instances.

:::info Scope of application
Automatic expansion** applies to all search modes** (HYBRID, SEMANTIC, KEYWORD_ONLY). The underlying layer shares the same `MmapAllocator` as RogueMap. The expansion mechanism is consistent with the core data structure.
:::

---

## Enable automatic expansion

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(64 * 1024 * 1024L)  // Initial 64MB
    .autoExpand(true)                  // Enable automatic expansion
    .expandFactor(2.0)                 // Each time the capacity is expanded to 2 times the original size (default)
    // .maxFileSize(10L * 1024 * 1024 * 1024) // Optional: Set the maximum file size limit
    .build();
```

## Configuration options

| Options | Description | Default |
|-----|------|--------|
| `autoExpand(true)` | Enable automatic expansion | false |
| `expandFactor(factor)` | The multiple of each expansion, minimum 1.1 | 2.0 |
| `maxFileSize(size)` | Maximum file size (bytes), 0 means no limit | 0 |

---

## Expansion features

- ✅ **Transparent Expansion** — During expansion, only mappings are created for new areas, and the addresses of existing memory data remain completely unchanged.
- ✅ **Retrieval is not affected** — HNSW vector index and BM25 inverted index work normally during expansion, `search()` is not aware
- ✅ **Thread Safety** — Ordinary writes hold read locks (CAS), exclusive write locks during expansion, and continue automatically after expansion is completed
- ✅ **Available in all modes** — HYBRID, SEMANTIC, KEYWORD_ONLY supported

## Expansion process

```
Initial state:
┌─────────────────────────────────────┐
│ 64MB file space │
│  ████████████████████░░░░░░░░░░░░░  │
│ (used) (idle) │
└─────────────────────────────────────┘

Memory writing triggers expansion:
┌─────────────────────────────────────┬─────────────────────────────────────┐
│ 64MB original space │ New 64MB space │
│  ████████████████████████████████   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ (used) │ (new allocation, continue writing to memory) │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                                    ↓
                                          expandFactor(2.0)
```

---

## KEYWORD_ONLY mode

KEYWORD_ONLY mode (not using vectors) also supports automatic expansion:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)  // Pure keyword search, no EmbeddingProvider required
    .allocateSize(16 * 1024 * 1024L)
    .autoExpand(true)
    .build();
```

---

## Monitoring expansion

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .build();

// Get current file size
StorageMetrics metrics = mem.getMetrics();
System.out.println("Current file size:" + metrics.getTotalFileSize());

// Check after writing a large amount of memory
for (int i = 0; i < 100_000; i++) {
    mem.add("memory content" + i, Map.of("batch", "import"), "knowledge");
}

metrics = mem.getMetrics();
System.out.println("File size after expansion:" + metrics.getTotalFileSize());
```

---

## Expansion and persistent recovery

The expanded data will be completely retained after `close()`+ is reopened:

```java
// The first round: writing to memory, triggering expansion
RogueMemory mem1 = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(16 * 1024)   // 16KB, easily triggering capacity expansion
    .autoExpand(true)
    .build();

List<String> ids = new ArrayList<>();
for (int i = 0; i < 500; i++) {
    ids.add(mem1.add("Persistent memory content" + i, Map.of("idx", String.valueOf(i)), "docs"));
}
mem1.close();

// Round 2: Reopen, all memories restored
RogueMemory mem2 = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(16 * 1024)
    .autoExpand(true)
    .build();

for (String id : ids) {
    MemoryEntry entry = mem2.get(id);
    assert entry != null;  // Complete recovery of all data
}
mem2.close();
```

---

## Best Practices

| Scenario | Recommended configuration | Description |
|------|---------|------|
| AI Agent long-term memory | `autoExpand(true)` + `maxFileSize(2GB)` | The amount of memory is unpredictable, and an upper limit is set to prevent the disk from filling up |
| Batch import of knowledge base | `autoExpand(true)` + `expandFactor(4.0)` | Large amount of data, greatly reducing the number of expansions |
| Fixed scale test | `autoExpand(false)` + sufficiently large `allocateSize` | The amount of data is known, no expansion overhead is required |

::: warning note
When `autoExpand` is not enabled and `allocateSize` is insufficient, an exception will be thrown when writing memory exceeding the capacity. It is recommended that `autoExpand(true)` is always turned on in production environments.
:::

---

## Next step

- [Persistence and Operation ](./persistence.md) — File structure, recovery mechanism and space recycling
- [Storage structure and performance ](./storage-and-performance.md) — underlying storage details
