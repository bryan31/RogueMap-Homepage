# Space reclamation (compact)

As data is written, updated, and deleted, fragmentation (space taken up by deleted/old data) occurs in the storage files. The `compact()` method is used to reclaim this space.

## Use compact

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// After a lot of write and delete operations...
for (int i = 0; i < 1000000; i++) {
    map.put("key-" + i, (long) i);
}
for (int i = 0; i < 500000; i++) {
    map.remove("key-" + i);  // Deleting half of the data creates fragmentation
}

// Check fragmentation rate
StorageMetrics metrics = map.getMetrics();
System.out.println("Fragmentation rate:" + (metrics.getFragmentationRatio() * 100) + "%");

// Execute compact
map = map.compact(256 * 1024 * 1024L);  // Compressed to new file, 256MB
```

## compact principle

```
Before compression:
┌─────────────────────────────────────────────┐
│ data 1 │ fragment │ data 2 │ fragment │ data 3 │
└─────────────────────────────────────────────┘

After compression:
┌─────────────────────────┐
│ data 1 │ data 2 │ data 3 │
└─────────────────────────┘
```

compact will create a new file and copy all active data there, eliminating fragmentation.

## Determine whether compact is needed

```java
StorageMetrics metrics = map.getMetrics();

// Method 1: Use built-in judgment method
if (metrics.shouldCompact(0.5)) {  // Fragmentation rate > 50%
    map = map.compact(newAllocateSize);
}

// Method 2: Customized judgment
double fragmentation = metrics.getFragmentationRatio();
if (fragmentation > 0.3) {  // Fragmentation rate > 30%
    map = map.compact(newAllocateSize);
}
```

## Support of each data structure

| Data structure | compact support | Description |
|---------|-------------|------|
| RogueMap | ✅ | Persistence mode only |
| RogueList | ✅ | Persistence mode only |
| RogueSet | ✅ | Persistence mode only |
| RogueQueue (linked list mode) | ✅ | Persistence mode only |
| RogueQueue (ring mode) | ❌ | Fixed slot, no fragmentation |

## Notes

::: warning important
- `compact()` will return **new instance**, the original instance has been closed
- only persistence mode supports compact
- Temporary files do not support compact
- How to use: `map = map.compact(newSize);`
:::

```java
// Correct usage ✅
map = map.compact(512 * 1024 * 1024L);

// Incorrect usage ❌
map.compact(512 * 1024 * 1024L);  // The original instance has been closed, but no new instances have been received
map.get("key");  // Throws an exception!
```

## Next step

- [Monitoring metrics ](./monitoring.md) — Monitor fragmentation rate and space usage
- [Automatic expansion ](./auto-expand.md) — Grow file space on demand
- [Configuration option ](./configuration.md) — Quick check of complete configuration parameters
