# Concurrency control

RogueMap is thread-safe and supports high concurrent read and write operations. This document introduces the concurrency control mechanism of RogueMap.

## Thread safety guarantee

All operations on RogueMap are thread-safe:

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Multi-thread safe
ExecutorService executor = Executors.newFixedThreadPool(16);
for (int i = 0; i < 100; i++) {
    executor.submit(() -> {
        map.put("key", 100L);  // Thread safety
        Long value = map.get("key");  // Thread safety
    });
}
```

## SegmentedHashIndex concurrency mechanism

### Segmented lock design

SegmentedHashIndex uses 64 independent segments, each with independent locks:

```
Segment distribution:
┌──────────┬──────────┬──────────┬──────────┐
│ Segment  │ Segment  │ Segment  │   ...    │
│    0     │    1     │    2     │   63     │
└──────────┴──────────┴──────────┴──────────┘
     ↓           ↓           ↓          ↓
StampedLock StampedLock StampedLock StampedLock

Hash distribution:
hash(key) % 64 → Segment Index
```

### StampedLock optimistic lock

Use StampedLock for each segment to implement optimistic reading:

```java
// Read operation process
long stamp = lock.tryOptimisticRead();  // 1. Obtain optimistic read stamp
V value = doRead();                      // 2. Read data
if (lock.validate(stamp)) {              // 3. Verify read stamp
    return value;                        // 4. Verification successful, return
}
// Verification failed, downgraded to pessimistic read
stamp = lock.readLock();
try {
    return doRead();
} finally {
    lock.unlockRead(stamp);
}
```

### Write operation process

```java
// Write operation process
long stamp = lock.writeLock();  // 1. Obtain write lock
try {
    doWrite();                  // 2. Perform writing
} finally {
    lock.unlockWrite(stamp);    // 3. Release the write lock
}
```

### Concurrency advantage

- ✅ **Reduce lock contention** - 64 segments are independently locked
- ✅ **Optimistic read lock-free** - Most read operations do not require locking
- ✅ **Reading and writing separation** - reading and writing operations do not affect each other (different segments)
- ✅ **High Concurrency Performance** - Read performance improved by 3-5 times

## LongPrimitiveIndex concurrency mechanism

### Single lock + optimistic read

LongPrimitiveIndex uses a single StampedLock:

```java
// Read operation: Optimistic read
long stamp = lock.tryOptimisticRead();
V value = doRead();
if (lock.validate(stamp)) {
    return value;
}
// downgrade to pessimistic reading
stamp = lock.readLock();
try {
    return doRead();
} finally {
    lock.unlockRead(stamp);
}

// Write operation: write lock
long stamp = lock.writeLock();
try {
    doWrite();
} finally {
    lock.unlockWrite(stamp);
}
```

### Concurrency features

- ✅ Optimistic reading without locks
- ⚠️ High concurrent writing performance is not as good as SegmentedHashIndex
- ✅ Suitable for reading more and writing less scenarios

## LowHeapStringIndex concurrency model

LowHeapStringIndex also adopts segment lock design (default 64 segments), each segment has independent `StampedLock`. The difference from `SegmentedHashIndex` is:

- The hashing, lookup, and insertion of keys are all done in mmap and do not involve `HashMap` on the JVM heap.
- Using open addressing (linear probing), the lock granularity is the same as SegmentedHashIndex.
- Suitable for scenarios where the number of keys is extremely large but heap memory needs to be controlled.

## Concurrency performance test

### Read performance (1 million operations)

| Index type | 1 thread | 4 threads | 16 threads | 64 threads |
|---------|--------|--------|---------|---------|
| HashMap | 200ms | 300ms | 800ms | 2000ms |
| BasicIndex | 210ms | 280ms | 600ms | 1500ms |
| SegmentedHashIndex | 220ms | 150ms | 100ms | 120ms |
| LongPrimitiveIndex | 200ms | 220ms | 250ms | 300ms |

### Write performance (1 million operations)

| Index type | 1 thread | 4 threads | 16 threads | 64 threads |
|---------|--------|--------|---------|---------|
| HashMap | 250ms | 500ms | 1500ms | 4000ms |
| BasicIndex | 260ms | 450ms | 1200ms | 3000ms |
| SegmentedHashIndex | 270ms | 200ms | 150ms | 180ms |
| LongPrimitiveIndex | 260ms | 300ms | 400ms | 600ms |

### Mixed reading and writing (70% read, 30% write)

| Index type | 1 thread | 4 threads | 16 threads | 64 threads |
|---------|--------|--------|---------|---------|
| SegmentedHashIndex | 230ms | 170ms | 120ms | 140ms |
| LongPrimitiveIndex | 220ms | 250ms | 300ms | 400ms |

## Best Practices

### 1. Use SegmentedHashIndex in high concurrency scenarios

```java
// Recommended: High-concurrency web applications
RogueMap<String, User> cache = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(64)  // Default, high concurrency optimization
    .build();
```

### 2. Read more and write less, use LongPrimitiveIndex

```java
// Suitable for: ID mapping that reads more and writes less
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex()  // Save memory, read more and write less
    .build();
```

### 3. Avoid holding references for a long time

```java
// Good practice ✅
Long value = map.get("key");
processValue(value);  // Quick processing

// Avoid ❌
Long value = map.get("key");
// Holding a value reference for a long time
Thread.sleep(10000);
processValue(value);
```

### 4. Batch operation

Starting from 1.1.7, `getAll` / `putAll` batch API can be used directly:

```java
// Batch read (results do not include unfound or expired keys)
List<String> keys = Arrays.asList("key1", "key2", "key3");
Map<String, Long> results = map.getAll(keys);

// batch write
Map<String, Long> updates = new HashMap<>();
updates.put("key1", 100L);
updates.put("key2", 200L);
updates.put("key3", 300L);
map.putAll(updates);
```

::: warning batch writes do not guarantee cross-key atomicity
`putAll` has the same semantics as `java.util.Map.putAll`: updates to individual keys are individually atomic, but concurrent reads and writes can be interleaved with the entire batch of operations, and other threads may observe an intermediate "half-written" state. Use [transaction ](./transaction.md) when atomic multikey writes are required.
:::

## Concurrency trap

### 1. Non-atomicity of compound operations

```java
// Non-atomic operations ❌
if (!map.containsKey("key")) {
    map.put("key", 100L);
}
// Two threads may pass the containsKey check at the same time

// Solution: Use external synchronization
synchronized (lock) {
    if (!map.containsKey("key")) {
        map.put("key", 100L);
    }
}
```

### 2. Concurrent modification of iterator

```java
// RogueMap does not provide keySet()/entrySet() iterators
// It is recommended to use forEach to traverse
map.forEach((key, value) -> {
    // Handle key/value
});
```

## Memory visibility

### happens-before guarantee

RogueMap guarantees the following happens-before relationships:

```java
// Thread 1
map.put("key", 100L);  // A

// Thread 2
Long value = map.get("key");  // B
// A happens-before B
// Thread 2 must be able to see Thread 1’s writes
```

### volatile semantics

All indexes use appropriate synchronization mechanisms to ensure memory visibility.

## Deadlock prevention

RogueMap does not cause deadlock internally because:

- ✅ Single locking order (by segment index)
- ✅ Short lock time
- ✅ No nested locks

## Performance tuning

### 1. Adjust the number of segments

```java
// High concurrency scenario: increase the number of segments
RogueMap<String, Long> map = RogueMap.<String, Long>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(128)  // increased to 128 segments
    .build();

// Low concurrency scenario: reduce the number of segments
RogueMap<String, Long> map = RogueMap.<String, Long>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(32)  // reduced to 32 paragraphs
    .build();
```

### 2. Thread pool size

```java
// CPU intensive
int threads = Runtime.getRuntime().availableProcessors();

// I/O intensive
int threads = Runtime.getRuntime().availableProcessors() * 2;

ExecutorService executor = Executors.newFixedThreadPool(threads);
```

## Monitoring and Diagnostics

### Concurrency performance monitoring

```java
long startTime = System.nanoTime();

// Perform concurrent operations
ExecutorService executor = Executors.newFixedThreadPool(16);
List<Future<?>> futures = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    futures.add(executor.submit(() -> {
        map.put("key" + i, (long) i);
    }));
}

// wait for completion
for (Future<?> future : futures) {
    future.get();
}

long endTime = System.nanoTime();
long duration = (endTime - startTime) / 1_000_000; // ms
System.out.println("Duration: " + duration + " ms");
```

## Next step

- [Transaction ](./transaction.md) — Multi-operation atomic commit
- [Persistence ](./persistence.md) — Data persistence mechanism
- [Configuration option ](./configuration.md) — Detailed configuration instructions
