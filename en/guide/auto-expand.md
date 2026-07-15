# Automatic expansion

RogueMap supports automatic expansion function. When the file space is insufficient, the file will be automatically expanded by multiples without re-creating the instance.

:::info Scope of application
Automatic expansion** applies to all four data structures** (RogueMap, RogueList, RogueSet, RogueQueue) and only takes effect in persistence mode. The bottom layer shares the same `MmapAllocator`, and the expansion mechanism is consistent for all data structures.
:::

## Support of each data structure

| Data structure | `autoExpand()` | `expandFactor()` | `maxFileSize()` |
|---|---|---|---|
| RogueMap | ✅ | ✅ | ✅ |
| RogueList | ✅ | ✅ | ✅ |
| RogueSet | ✅ | ✅ | ✅ |
| RogueQueue | ✅ | ✅ | ✅ |

All data structures are configured in exactly the same way, set up in the Builder chain of calls.

## Enable automatic expansion

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(64 * 1024 * 1024L)  // Initial 64MB
    .autoExpand(true)                  // Enable automatic expansion
    .expandFactor(2.0)                 // Each time the capacity is expanded to 2 times the original size (default)
    // .maxFileSize(10L * 1024 * 1024 * 1024) // Optional: Set the maximum file size limit
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

## Configuration options

| Options | Description | Default |
|-----|------|--------|
| `autoExpand(true)` | Enable automatic expansion | false |
| `expandFactor(factor)` | The multiple of each expansion | 2.0 |
| `maxFileSize(size)` | Maximum file size (bytes) | 0 (no limit) |

## Expansion features

- ✅ **Transparent Expansion** — During expansion, only new areas will be mapped, and existing data addresses will remain unchanged.
- ✅ **Thread Safety** — Ordinary writes hold read locks, exclusive write locks during expansion, and continue after expansion is completed
- ✅ **On-demand growth** — automatically triggered when the file is full, no need to estimate capacity

## Expansion process

```
Initial state:
┌─────────────────────────────────────┐
│ 64MB file space │
│  ████████████████████░░░░░░░░░░░░░  │
│ (used) (idle) │
└─────────────────────────────────────┘

Write trigger expansion:
┌─────────────────────────────────────┬─────────────────────────────────────┐
│ 64MB original space │ New 64MB space │
│  ████████████████████████████████   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ (used) │ (new allocation, continue writing) │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                                    ↓
                                          expandFactor(2.0)
```

## Monitoring expansion

```java
// Get current file size
StorageMetrics metrics = map.getMetrics();
System.out.println("Current file size:" + metrics.getTotalFileSize());

// Check again after writing data
for (int i = 0; i < 10_000_000; i++) {
    map.put("key-" + i, (long) i);
}

metrics = map.getMetrics();
System.out.println("File size after expansion:" + metrics.getTotalFileSize());
```

## Best Practices

```java
// Scenario 1: Uncertain data volume, enable automatic expansion
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data/app.db")
    .allocateSize(128 * 1024 * 1024L)  // Initial 128MB
    .autoExpand(true)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// Scenario 2: The amount of data is controllable and the capacity is estimated to avoid expansion overhead.
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .persistent("data/known.db")
    .allocateSize(10L * 1024 * 1024 * 1024)  // Directly allocate 10GB
    .autoExpand(false)  // No automatic expansion required
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Scenario 3: Limit maximum file size
RogueMap<String, byte[]> map = RogueMap.<String, byte[]>mmap()
    .persistent("data/cache.db")
    .allocateSize(256 * 1024 * 1024L)
    .autoExpand(true)
    .maxFileSize(2L * 1024 * 1024 * 1024)  // Max 2GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(new BytesCodec())
    .build();
```

## Other data structure examples

The automatic expansion configuration method of RogueList, RogueSet, and RogueQueue is exactly the same as that of RogueMap:

```java
// RogueList
RogueList<String> list = RogueList.<String>mmap()
    .persistent("data/list.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();

// RogueSet
RogueSet<String> set = RogueSet.<String>mmap()
    .persistent("data/set.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();

// RogueQueue
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();
```

## Next step

- [Space Reclamation ](./compact.md) — Reclaim fragmented space
- [Monitoring indicators ](./monitoring.md) — Monitor file size and usage
- [Configuration option ](./configuration.md) — Quick check of complete configuration parameters
