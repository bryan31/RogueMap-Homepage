# Index strategy

RogueMap offers a variety of indexing strategies, each optimized for specific usage scenarios.

## Overview of index types

| Index type | Features | Applicable scenarios |
|---------|------|---------|
| BasicIndex | Simple and efficient | Single thread or low concurrency |
| SegmentedHashIndex | High concurrency optimization | High concurrency reading and writing |
| LongPrimitiveIndex | Memory optimization | Long key, memory sensitive |
| IntPrimitiveIndex | Memory optimization | Integer keys, memory sensitive |
| LowHeapStringIndex | Ultra-low heap usage | String key, heap memory is extremely sensitive |

## BasicIndex (basic index)

### Overview

BasicIndex is implemented based on `ConcurrentHashMap` and provides simple and reliable indexing functionality.

### How to use

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .basicIndex()
    .build();
```

### Features

- ✅ Simple to implement, stable and reliable
- ✅ Suitable for single-threaded or low-concurrency scenarios
- ✅ Moderate memory usage
- ⚠️ High concurrency performance is not as good as segmented index

### Applicable scenarios

- Single-threaded application
- Low concurrency scenarios
- Simple key-value storage

## SegmentedHashIndex (segmented index)

### Overview

SegmentedHashIndex is the **default index** of RogueMap, which uses 64 independent segments + StampedLock optimistic lock optimization, and is specially designed for high concurrency scenarios.

### How to use

```java
// Use segmented index by default
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Or explicitly specify the number of segments
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64) // 64 segments
    .build();
```

### Concurrency mechanism

```
Segmentation strategy:
┌─────────┬─────────┬─────────┬─────────┐
│ Segment │ Segment │ Segment │ Segment │
│    0    │    1    │    2    │   ...   │
└─────────┴─────────┴─────────┴─────────┘
    ↓           ↓           ↓
StampedLock StampedLock StampedLock
(optimistic)  (optimistic)  (optimistic)
```

**Optimistic reading process**:
1. Obtain optimistic read stamp
2. Read data
3. Verify read stamp
4. If verification fails, downgrade to pessimistic read

### Features

- ✅ **High Concurrency Performance** - 64 segments, reducing lock contention
- ✅ **Optimistic Read Optimization** - Most read operations are lock-free
- ✅ **Excellent write performance** - Only single segment is locked
- ✅ **Default Selection** - Suitable for most scenarios

### Performance advantages

Compared to BasicIndex:
- High concurrent reading performance improved **3-5 times**
- High concurrent writing performance improved **2-3 times**

### Applicable scenarios

- **High Concurrency Application** (recommended)
- Web application caching
- Multi-threaded data processing
- Most production environments

## LongPrimitiveIndex (Long primitive index)

### Overview

LongPrimitiveIndex is specially optimized for Long keys and uses original array storage to significantly reduce memory usage.

### How to use

```java
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex()
    .build();
```

::: warning key type restrictions
Can only be used for `Long` type keys, other types will throw an exception.
:::

### Memory optimization

**Traditional Index**:
```
HashMap<Long, Entry>
  ↓
Each Entry contains:
- Long object (24 bytes)
- Entry object (32 bytes)
- Reference (8 bytes)
Total: 64 bytes/item
```

**Original Index**:
```
long[] keys
long[] addresses
int[] sizes
  ↓
Each entry:
- long key (8 bytes)
- long address (8 bytes)
- int size (4 bytes)
Total: 20 bytes/item
```

**Memory Savings**: 81% = (64 - 20) / 64

### Features

- ✅ **Extremely low memory usage** - Save 81% of memory
- ✅ **High Performance** - Fast access to raw arrays
- ✅ **StampedLock Optimization** - Optimistic reading support
- ⚠️ **Only Long keys supported** - Type restrictions

### Performance

| Metrics | SegmentedHashIndex | LongPrimitiveIndex | Boost |
|-----|-------------------|-------------------|------|
| Memory usage | 100 MB | 19 MB | 81% ↓ |
| Read performance | 10 million ops/s | 9.5 million ops/s | -5% |
| Write performance | 8 million ops/s | 7.5 million ops/s | -6% |

### Applicable scenarios

- Long type key
- Memory sensitive applications
- Large data volume storage
- ID mapping table

## IntPrimitiveIndex (Integer original index)

### Overview

IntPrimitiveIndex is optimized for Integer keys, similar to LongPrimitiveIndex.

### How to use

```java
RogueMap<Integer, Integer> map = RogueMap.<Integer, Integer>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .primitiveIndex()
    .build();
```

::: warning key type restrictions
Can only be used with `Integer` type keys.
:::

### Features

- ✅ **Extremely low memory usage** - Save about 75% of memory
- ✅ **HIGH PERFORMANCE** - Raw array access
- ✅ **StampedLock Optimization** - Optimistic reading support
- ⚠️ **Only Integer keys supported** - Type restrictions

### Applicable scenarios

- Integer type key
- Memory sensitive applications
- Index mapping table

## LowHeapStringIndex (ultra-low heap index)

### Overview

LowHeapStringIndex is a very low heap index specific to String keys. The slot table and key bytes are all stored in mmap files, and only segment metadata and locks are retained on the JVM heap. Suitable for scenarios where you need to store massive String keys but want to minimize JVM heap memory usage.

### Working principle

```
┌──────────────── mmap file (off-heap) ────────────────┐
│  ┌─────────────────────────────────────────────┐  │
│  │          Slot Table (32 bytes/slot)            │  │
│  │  ┌──────┬──────┬──────┬──────┬──────┐       │  │
│  │  │ hash │ key  │value │value │state │       │  │
│  │  │  FP  │offset│offset│ size │      │       │  │
│  │  │(8B)  │(8B)  │(8B)  │(4B)  │(4B)  │       │  │
│  │  └──────┴──────┴──────┴──────┴──────┘       │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │         Key Records (key byte data)             │  │
│  │  [length: 4B][UTF-8 bytes: N bytes]          │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘

┌──── JVM heap (minimal) ────┐
│ Segment[] (64 segments) │
│  StampedLock × 64     │
│Intra-segment metadata │
└───────────────────────┘
```

- **32-byte fixed size slots**: each slot contains hash fingerprint, key offset, value offset, value size and status flag
- **Status Flags**: `EMPTY` (empty), `USED` (used), `DELETED` (deleted)
- **Open Addressing**: Use linear detection to resolve hash conflicts, and automatically expand the capacity if maxProbe detections are exceeded.

### How to use

#### Used in RogueMap

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/low-heap.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .build();
```

#### Custom LowHeapOptions

```java
import com.yomahub.roguemap.index.LowHeapOptions;

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/low-heap.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .lowHeapOptions(new LowHeapOptions(128, 0.75, 16))
    .build();
```

#### Used in RogueSet

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .persistent("data/low-heap-set.db")
    .elementCodec(StringCodec.INSTANCE)
    .lowHeapIndex()
    .build();
```

### LowHeapOptions Configuration

| Parameters | Default value | Description |
|-----|--------|------|
| `segmentCount` | 64 | Number of segments, must be a power of 2 |
| `loadFactor` | 0.80 | Load factor, range (0.1, 0.95) |
| `maxProbe` | 16 | Maximum number of detections, automatically expanded after exceeding |

### Monitoring indicators

LowHeapStringIndex provides dedicated monitoring methods, available via `StorageMetrics`:

```java
StorageMetrics metrics = map.getMetrics();
long heapEstimate = metrics.getIndexHeapBytesEstimate();  // Heap memory estimate
long mmapBytes = metrics.getIndexMmapBytes();             // mmap occupied
double avgKeyBytes = metrics.getAvgKeyBytes();            // average bond length
```

### Features

- ✅ **Ultra-low heap usage** - Almost all index data is outside the heap, with only about `segment count × 256 + 1024` bytes on the heap
- ✅ **Segment Lock** - 64-segment StampedLock, supports high concurrent reading and writing
- ✅ **Optimistic Read** - Read operations try lock-free optimistic read first
- ✅ **Works with RogueMap and RogueSet** - Both data structures are supported

::: warning restriction
- Only supports **String** type keys/elements
- Transactions not supported (`beginTransaction()`)
- Old format indexes are not automatically migrated
:::

### Applicable scenarios

- String keys, heap memory is extremely sensitive
- Massive key-value pair storage
- Scenarios where GC pressure needs to be minimized

## Index Selection Guide

### Decision tree

```
start
  ↓
Key is of type Long?
  ├─ Yes → Memory sensitive?
  │ ├─ Yes → LongPrimitiveIndex ✅
  │ └─ No → SegmentedHashIndex ✅
  └─ No → Is the key of type Integer?
           ├─ Yes → Memory sensitive?
           │ ├─ Yes → IntPrimitiveIndex ✅
           │ └─ No → SegmentedHashIndex ✅
           └─ No → Is the key of type String?
                    ├─ Yes → Heap memory is extremely sensitive?
                    │ ├─ Yes → LowHeapStringIndex ✅
                    │ └─ No → High concurrency scenario?
                    │ ├─ Yes → SegmentedHashIndex ✅
                    │                 └─ No → BasicIndex ✅
                    └─ No → High concurrency scenario?
                             ├─ Yes → SegmentedHashIndex ✅
                             └─ No → BasicIndex ✅
```

### Recommended configuration

#### Scenario 1: Highly concurrent web application

```java
// Recommended: SegmentedHashIndex (default)
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(64)
    .build();
```

#### Scenario 2: A large number of Long ID mappings

```java
// Recommended: LongPrimitiveIndex
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex()
    .build();
```

#### Scenario 3: Single-threaded data processing

```java
// Recommended:BasicIndex
RogueMap<String, String> config = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .basicIndex()
    .build();
```

#### Scenario 4: Memory-sensitive large data set

```java
// Recommended: LongPrimitiveIndex
RogueMap<Long, Record> records = RogueMap.<Long, Record>mmap()
    .persistent("records.db")
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .primitiveIndex()
    .build();
```

#### Scenario 5: Massive String keys, heap memory is extremely sensitive

```java
// Recommended: LowHeapStringIndex
RogueMap<String, Long> counters = RogueMap.<String, Long>mmap()
    .persistent("counters.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .build();
```

## Performance comparison

### Read performance comparison (1 million operations)

| Index Type | Single Threaded | 4 Threads | 16 Threads |
|---------|--------|--------|---------|
| BasicIndex | 200ms | 180ms | 200ms |
| SegmentedHashIndex | 210ms | 120ms | 90ms |
| LongPrimitiveIndex | 195ms | 190ms | 195ms |
| LowHeapStringIndex | 230ms | 140ms | 100ms |

### Write performance comparison (1 million operations)

| Index Type | Single Threaded | 4 Threads | 16 Threads |
|---------|--------|--------|---------|
| BasicIndex | 250ms | 280ms | 350ms |
| SegmentedHashIndex | 260ms | 180ms | 140ms |
| LongPrimitiveIndex | 255ms | 260ms | 260ms |
| LowHeapStringIndex | 280ms | 200ms | 160ms |

### Memory usage comparison (1 million entries)

| Index type | Index memory | Savings ratio |
|---------|----------|---------|
| BasicIndex | 100 MB | - |
| SegmentedHashIndex | 105 MB | -5% |
| LongPrimitiveIndex | 19 MB | 81% ↓ |
| LowHeapStringIndex | ~0.02 MB heap + mmap | 99%+ ↓ (heap memory) |

## Notes

### SegmentedHashIndex

1. **Segment Number Selection** - The default 64 segments is suitable for most scenarios
2. **Memory Overhead** - Slightly higher than BasicIndex (~5%)
3. **Stable performance** - Stable performance under high concurrency

### LongPrimitiveIndex

1. **Type restriction** - Only Long keys are supported
2. **Expansion overhead** - Array expansion requires copying
3. **Concurrency Limit** - Using a single lock, high concurrency performance is not as good as SegmentedHashIndex

### IntPrimitiveIndex

1. **Type restriction** - Only Integer keys are supported
2. **Other Features** - Similar to LongPrimitiveIndex

### LowHeapStringIndex

1. **Type restriction** - Only String keys/elements are supported
2. **Transactions not supported** - cannot be used with `beginTransaction()`
3. **Do not migrate old indexes** - Old format indexes are not automatically migrated and need to be rebuilt

## Next step

- [CODEC ](./codecs.md) — Custom data serialization
- [Concurrency Control ](./concurrency.md) — In-depth understanding of concurrency mechanisms
- [Configuration option ](./configuration.md) — Detailed configuration instructions
