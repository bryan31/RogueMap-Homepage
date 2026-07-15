# Best Practices

This document summarizes best practices and common pitfalls for using RogueMap.

## Resource Management

### 1. Use try-with-resources

```java
// Recommended ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // Use map
    map.put("key", 100L);
} // Automatically call close() to release resources

// Avoid ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// Forgetting to call close() can lead to resource leaks
```

### 2. Register Shutdown Hook

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Register Shutdown Hook to ensure graceful shutdown
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        map.close();
        System.out.println("RogueMap closed successfully");
    } catch (Exception e) {
        System.err.println("Error closing RogueMap: " + e.getMessage());
    }
}));
```

## Performance optimization

### 1. Use primitive types first

```java
// Good ✅ - zero copy, high performance
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Avoid ❌ - serialization overhead
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
// If you can use Long, don’t use String
```

### 2. Choose the appropriate index

```java
// High concurrency scenario: SegmentedHashIndex
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(128) // High concurrency
    .build();

// Long key + memory sensitive: LongPrimitiveIndex
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex() // Save 81% memory
    .build();
```

### LowHeap index selection suggestions

**Applicable scenarios:**
- The number of String keys is large (above millions) and the JVM heap memory needs to be controlled.
- No transaction support required.
-Relatively uniform bond lengths.

**Not applicable scenarios:**
- The key type is not String (please use `primitiveIndex()` for Long and Integer keys).
- Transaction support required (please use `segmentedIndex()`).
- Small number of keys (less than a million it is easier to use SegmentedHashIndex).

### 3. Batch operation

Starting from 1.1.7, RogueMap provides `putAll` / `getAll` batch API:

```java
// batch write
Map<String, Long> batch = new HashMap<>();
for (int i = 0; i < 10000; i++) {
    batch.put("key" + i, (long) i);
}
map.putAll(batch);

// Batch write with one TTL shared by the entire batch
map.putAll(batch, 30, TimeUnit.MINUTES);

// Batch read (missing and expired keys are omitted)
Map<String, Long> found = map.getAll(keys);
```

Pay attention to two points when using it:

- **Atomicity across keys is not guaranteed**: The semantics are consistent with `java.util.Map.putAll`, updates to individual keys are individually atomic, and some entries may have been written when an exception is thrown. Use `beginTransaction()` when atomic multi-key writing is required.
- **Throughput is comparable to a `put` loop**: In segmented index mode, entries are grouped by segment and each segment takes its write lock only once, but measured throughput is roughly the same as a `put` loop. The batch API is convenient and increments the automatic checkpoint counter only once per batch (see [Checkpoints and Automatic Checkpoints](./auto-checkpoint.md)).

### 4. Enable automatic expansion

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .allocateSize(256 * 1024 * 1024L) // Initial 256MB
    .autoExpand(true)  // Enable automatic expansion
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

## Storage mode selection

### 1. Mmap Temp - Temporary processing of big data

```java
// Suitable for: temporary processing of large amounts of data
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .allocateSize(50L * 1024 * 1024 * 1024) // 50GB
    .build();
```

**Applicable scenarios**:
- Temporary processing of large data volumes (10GB+)
- Batch tasks
- Automatic cleaning

### 2. Mmap Persist - Persistent storage

```java
// Suitable for: Need persistence
RogueMap<String, Document> db = RogueMap.<String, Document>mmap()
    .persistent("data/documents.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Document.class))
    .allocateSize(20L * 1024 * 1024 * 1024) // 20GB
    .autoExpand(true)
    .build();
```

**Applicable scenarios**:
- Requires data persistence
- Embedded database
- Configuration management

## Concurrent use

### 1. High concurrent reading and writing

```java
// Using SegmentedHashIndex
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(128) // Increase the number of segments
    .build();

// Multi-threaded concurrent access
ExecutorService executor = Executors.newFixedThreadPool(32);
for (int i = 0; i < 1000; i++) {
    final int index = i;
    executor.submit(() -> {
        map.put("key" + index, (long) index);
        Long value = map.get("key" + index);
    });
}
```

### 2. Avoid compound operations

```java
// Avoid ❌ - non-atomicity
if (!map.containsKey("key")) {
    map.put("key", 100L);
}

// Good ✅ - Use external sync
synchronized (lock) {
    if (!map.containsKey("key")) {
        map.put("key", 100L);
    }
}
```

## Persistence best practices

### 1. Flush the disk regularly

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Clean the disk regularly
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    try {
        map.flush();
    } catch (Exception e) {
        logger.error("Flush failed", e);
    }
}, 1, 5, TimeUnit.MINUTES);
```

### Automatic checkpoint

For detailed instructions, please refer to [Checkpoints and Automatic Checkpoints ](./auto-checkpoint.md).

### 2. Keep codecs consistent

```java
// When created
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

// Restore with the same codecs ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // Same
    .valueCodec(PrimitiveCodecs.LONG) // Same
    .build();
```

### 3. Exception handling

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>mmap()
        .persistent("data.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();

    // Use map
} catch (Exception e) {
    logger.error("Error", e);
} finally {
    if (map != null) {
        try {
            map.close();
        } catch (Exception e) {
            logger.error("Error closing", e);
        }
    }
}
```

## Common pitfalls

### 1. Forgot to close

```java
// Error ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// Forgot to call close()

// Correct ✅
try (RogueMap<String, Long> map = ...) {
    // Use
}
```

### 2. Codec inconsistency

```java
// Error ❌
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

RogueMap<String, String> map2 = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE) // Different!
    .build();

// Correct ✅
// Use the same codec
```

### 3. Insufficient disk space

```java
// Check disk space
File file = new File("data.db");
long freeSpace = file.getFreeSpace();
long allocateSize = 100L * 1024 * 1024 * 1024; // 100GB

if (freeSpace < allocateSize) {
    throw new IllegalStateException("Not enough disk space");
}
```

## Debugging and Monitoring

### 1. Enable logging

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

Logger logger = LoggerFactory.getLogger(MyApp.class);

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

logger.info("RogueMap created, size: {}", map.size());
```

### 2. Performance monitoring

```java
long startTime = System.nanoTime();

// perform operations
for (int i = 0; i < 1_000_000; i++) {
    map.put("key" + i, (long) i);
}

long endTime = System.nanoTime();
long duration = (endTime - startTime) / 1_000_000; // ms
System.out.println("Write 1M entries: " + duration + " ms");
```

## Summary

**DO**:
- ✅ Use try-with-resources
- ✅ Prioritize using original types
- ✅ Choose the right index
- ✅ Regularly refresh the disk (persistent mode)
- ✅Exception handling

**DON'T**:
- ❌ Forgot to close
- ❌ Codec inconsistency
- ❌ Ignore disk space checks
- ❌ Compound operations are not locked

## Next step

- [Performance White Paper ](../performance/benchmark) — Performance Data and Analysis
- [Configuration option ](./configuration.md) — Configuration instructions
- [Monitoring indicator ](./monitoring.md) — Monitoring and maintenance
