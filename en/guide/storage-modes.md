# Storage mode

RogueMap supports two storage modes, each with its specific usage scenarios and advantages.

## Mmap temporary file mode

### Overview

Mmap temporary file mode uses memory-mapped temporary files, which are automatically deleted after the JVM is shut down.

### How to use

```java
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(500 * 1024 * 1024L) // 500MB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### Configuration options

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // Required configuration
    .temporary()                  // Temporary file mode
    .keyCodec(keyCodec)           // key codec
    .valueCodec(valueCodec)       // value codec

    // Optional configuration
    .allocateSize(2L * 1024 * 1024 * 1024) // Preallocated size (default 2GB)
    .autoExpand(true)             // Enable automatic expansion

    // Indexing strategy (choose one of three)
    .basicIndex()                 // Use base index
    .segmentedIndex(64)           // Use segmented index (default)
    .primitiveIndex()             // Use raw index (Long/Integer keys only)

    .build();
```

### Advantages

- ✅ **Super Large Capacity** - Supports data volume far exceeding memory
- ✅ **Automatic Cleanup** - Automatically delete after JVM is shut down
- ✅ **High Performance** - Excellent overall performance
- ✅ **Low Memory Usage** - Very low heap memory usage

### Disadvantages

- ⚠️ **Disk Space** - Sufficient disk space required
- ⚠️ **No persistence** - data is not retained

### Applicable scenarios

- Temporary processing of large amounts of data
- Data analysis and transformation
- Batch tasks
- Requires very large capacity of temporary storage

> **Tips**: Temporary mode also supports `defaultTTL()` and automatic expansion, but `autoCheckpoint()` is automatically skipped (temporary data does not require persistent checkpoints).

## Mmap persistence mode

### Overview

Mmap persistence mode persists data to disk files, supporting data recovery and long-term storage.

### How to use

```java
// First time: creating and writing data
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map1.put("alice", 100L);
map1.put("bob", 200L);
map1.flush(); // Flush to disk
map1.close();

// Second time: reopen and recover data
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

long score = map2.get("alice"); // 100L (restore from disk)
map2.close();
```

### Configuration options

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // Required configuration
    .persistent("data.db")        // Persistence file path
    .keyCodec(keyCodec)           // key codec
    .valueCodec(valueCodec)       // value codec

    // Optional configuration
    .allocateSize(2L * 1024 * 1024 * 1024) // Preallocated size (default 2GB)
    .autoExpand(true)             // Enable automatic expansion
    .expandFactor(2.0)            // Expansion multiple
    .maxFileSize(10L * 1024 * 1024 * 1024) // Maximum file size

    // Indexing strategy (choose one of three)
    .basicIndex()                 // Use base index
    .segmentedIndex(64)           // Use segmented index (default)
    .primitiveIndex()             // Use raw index (Long/Integer keys only)

    .build();
```

### Advantages

- ✅ **Data Persistence** - Data will not be lost after the application is restarted
- ✅ **HIGH PERFORMANCE** - Excellent reading and writing performance
- ✅ **Super Large Capacity** - Supports data volume far exceeding memory
- ✅ **AUTO-RESTORE** - Automatically load data when reopening
- ✅ **Automatic expansion** - supports on-demand growth

### Disadvantages

- ⚠️ **Disk Space** - Requires pre-allocated disk space
- ⚠️ **Initialization Overhead** - First creation requires allocation file

### Applicable scenarios

- Embedded database
- Persistent configuration management
- Session state storage
- Scenarios that require data persistence

> **Tip**: In persistence mode, `autoCheckpoint()` can be used to automatically create recovery points, and `defaultTTL()` can be used to set the data expiration time.

### Persistence operations

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Write data
map.put("key1", 100L);
map.put("key2", 200L);

// Manual disk brushing
map.flush();

// Checkpoints (crash recovery)
map.checkpoint();

// Close (automatic disk flushing)
map.close();
```

## Mode comparison

| Features | Mmap temporary files | Mmap persistence |
|-----|--------------|-------------|
| Storage location | Temporary files | Persistent files |
| Persistence | ❌ | ✅ |
| Capacity Limits | Disk Space | Disk Space |
| Automatic Cleanup | ✅ | ❌ |
| Automatic expansion | ✅ | ✅ |
| Heap memory usage | Very low | Very low |
| TTL Support | ✅ | ✅ |
| Auto Checkpoint | ❌ (Auto Skip) | ✅ |

## Select suggestions

### Select Mmap temporary file mode

- ✅ Temporary processing of large data volumes (10GB+)
- ✅ Batch tasks
- ✅ No persistence required
- ✅Needs automatic cleaning

### Select Mmap persistence mode

- ✅ Requires data persistence
- ✅ Embedded database
- ✅ Configuration management
- ✅ Session state storage

## Notes

1. **Pre-allocated size** - `allocateSize()` will occupy disk space immediately. It is recommended to enable `autoExpand(true)` growth on demand.
2. **File Path** - Make sure the directory exists and has write permissions
3. **Automatic Recovery** - Reopen using the same Codec
4. **Resource Release** - Be sure to call `close()` after use

## Next step

- [Index Policy ](./index-strategies.md) - Choose the appropriate index
- [Automatic expansion ](./auto-expand.md) — Grow file space on demand
- [Monitoring indicator ](./monitoring.md) — Monitoring and maintenance
- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
