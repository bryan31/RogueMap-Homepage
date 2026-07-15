# Memory management

RogueMap uses memory mapped files for data storage. This document introduces related content of memory management.

## MmapAllocator (memory mapped file)

### Overview

MmapAllocator is RogueMap's memory allocator and uses `MappedByteBuffer` to map files into memory.

### Memory mapping mechanism

```
file system
    ↓
File (data.db)
    ↓
MappedByteBuffer
    ↓
virtual memory
    ↓
Physical memory (managed by the operating system)
```

### Large file support

The maximum size of a single MappedByteBuffer segment is 2GB, and RogueMap automatically handles files exceeding 2GB:

```
File (10GB)
├─ Segment 0: 0 - 2GB
├─ Segment 1: 2GB - 4GB
├─ Segment 2: 4GB - 6GB
├─ Segment 3: 6GB - 8GB
└─ Segment 4: 8GB - 10GB
```

### Allocation process

```
Request allocation of 100 bytes
    ↓
CAS operation increment offset
    ↓
Calculate the segment it belongs to
    ↓
Return address (segment index + offset)
```

### Persistence mode

```java
// Create persistent files
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB pre-allocated
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// File structure
// ┌─────────────────────────────┐
// │ File Header (metadata) │ 4KB
// ├─────────────────────────────┤
// │ Data Area │ 1GB - 4KB
// └─────────────────────────────┘
```

### Temporary file mode

```java
// Automatically create temporary files
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(5 * 1024 * 1024 * 1024L) // 5GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Automatically delete temporary files when JVM is shut down
```

### Advantages

- ✅ **Super Large Capacity** - Supports data volume far exceeding memory
- ✅ **OS Optimization** - Take advantage of OS page cache
- ✅ **Persistence** - Data is automatically transferred to disk
- ✅ **Memory Mapping Fast** - Close to memory access speed

### Notes

1. **Preallocated Space** - `allocateSize()` will take up disk space immediately
2. **File Permissions** - Make sure you have read and write permissions
3. **Close flashing** - `close()` will automatically call `flush()`

## UnsafeOps (lower-level operations)

### Overview

UnsafeOps encapsulates the `sun.misc.Unsafe` API and provides low-level memory operations.

### Main operations

```java
// Write data
UnsafeOps.putLong(address, 100L);
UnsafeOps.putInt(address + 8, 42);
UnsafeOps.putByte(address + 12, (byte) 1);

// Read data
long value1 = UnsafeOps.getLong(address);
int value2 = UnsafeOps.getInt(address + 8);
byte value3 = UnsafeOps.getByte(address + 12);

// Batch operation
UnsafeOps.copyMemory(srcAddress, destAddress, 100);
```

### Performance advantages

- ✅ **Zero Copy** - Direct memory operations
- ✅ **Ultimate Performance** - No JVM overhead
- ✅ **Primitive Type Optimization** - Fixed length reading and writing

### Security

::: warning Unsafe API
`sun.misc.Unsafe` is a JVM internal API and may be removed in the future. RogueMap is planned to support `Foreign Memory API` for Java 17+.
:::

## Memory usage analysis

### HashMap vs RogueMap

1 million String -> Long data:

```
HashMap:
├─ Entry object: 32 bytes × 1,000,000 = 32 MB
├─ String object: 40 bytes × 1,000,000 = 40 MB
├─ Long object: 24 bytes × 1,000,000 = 24 MB
├─ Hash table array: 8 bytes × 1,048,576 = 8 MB
└─ String data: ~200 MB
Total: ~311 MB (heap memory, measured)

RogueMap Mmap:
├─ Index (heap memory): ~30 MB
└─ Data (file map): ~18 MB
Total heap memory: ~48 MB (measured)
Memory savings: 84.7%
```

### Raw index vs object index

1 million Long -> Long data:

```
SegmentedHashIndex:
├─ HashMap index: ~28 MB
└─ Data (file map): ~20 MB
Total heap memory: ~48 MB

LongPrimitiveIndex:
├─ long[] keys: 8 MB
├─ long[] addresses: 8 MB
├─ int[] sizes: 4 MB
└─ Data (file map): ~20 MB
Total heap memory: ~20 MB
Memory savings: ~58%
```

### LowHeapStringIndex memory comparison

| Index type | 1 million String key heap memory estimate | mmap usage |
|---|---|---|
| SegmentedHashIndex | ~80 MB (HashMap + Entry object) | None |
| LowHeapStringIndex | ~2 MB (segment metadata and locks only) | ~64 MB (slot table + key bytes) |

LowHeapStringIndex shifts the memory consumption of the key index from the JVM heap to the mmap file, significantly reducing GC pressure. Actual occupancy can be viewed through `getMetrics()`:

```java
StorageMetrics metrics = map.getMetrics();
metrics.getIndexHeapBytesEstimate();  // Heap memory estimate
metrics.getIndexMmapBytes();          // mmap occupied
metrics.getAvgKeyBytes();             // average bond length
```

### TTL memory overhead

After `defaultTTL()` is enabled, each piece of data occupies an additional 8 bytes to store the expiration timestamp (`long` type). For large amounts of small value data, this overhead needs to be factored into capacity planning.

## Memory configuration recommendations

### Mmap mode

```java
// Estimated based on data volume
long estimatedSize = recordCount * averageRecordSize * 1.5;

RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .autoExpand(true)  // Or enable automatic expansion
    .build();
```

## Memory leak protection

### 1. Use try-with-resources

```java
// Recommended ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // Use map
} // Automatically call close() to release resources

// Avoid ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// Forgetting to call close() can lead to resource leaks
```

### 2. Explicit shutdown

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();
    // Use map
} finally {
    if (map != null) {
        map.close(); // ensure release
    }
}
```

## Performance monitoring

### Memory usage

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Get size
int size = map.size();

// Monitor heap memory
Runtime runtime = Runtime.getRuntime();
long heapUsed = runtime.totalMemory() - runtime.freeMemory();
System.out.println("Heap used: " + heapUsed / 1024 / 1024 + " MB");
```

## Next step

- [Concurrency Control ](./concurrency.md) — In-depth understanding of concurrency mechanisms
- [Configuration option ](./configuration.md) — Detailed configuration instructions
- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
