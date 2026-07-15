# Configuration options

This document details all configuration options for RogueMap.

## Mmap temporary file mode configuration

### Complete configuration example

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // Required configuration
    .temporary()                  // Temporary file mode
    .keyCodec(keyCodec)           // key codec
    .valueCodec(valueCodec)       // value codec

    // Optional configuration
    .allocateSize(2L * 1024 * 1024 * 1024) // Preallocated size (default: 2 GB)
    .autoExpand(true)             // Enable automatic expansion

    // Index strategy (choose one of four, default segmentedIndex)
    .basicIndex()                 // Use base index
    .segmentedIndex(64)           // Use segmented indexes
    .primitiveIndex()             // Use original index
    .lowHeapIndex()               // Use the ultra-low-heap String index
    .initialCapacity(16)          // Initial index capacity (default: 16)

    // TTL (optional)
    .defaultTTL(30, TimeUnit.MINUTES)  // Default data expiration time

    // Automatic checkpoints (optional)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // Trigger by elapsed time
    .autoCheckpoint(10000)                // Trigger by operation count

    .build();
```

### Parameter description

#### temporary

Enable temporary file mode.

```java
.temporary()
```

**Features**:
- Automatically create temporary files
- Automatically deleted when JVM is shut down

#### allocateSize

Set the preallocated file size.

```java
// 1 GB
.allocateSize(1024 * 1024 * 1024L)

// 10 GB
.allocateSize(10L * 1024 * 1024 * 1024)

// 100 GB
.allocateSize(100L * 1024 * 1024 * 1024)
```

**Default**: 2 GB

**Note**:
- Will take up disk space immediately
- Make sure the disk has enough space

#### autoExpand

Turn on automatic expansion.

```java
.autoExpand(true)        // Enable automatic expansion
.expandFactor(2.0)       // Expansion factor (default: 2.0)
.maxFileSize(100L * 1024 * 1024 * 1024)  // Maximum file size limit
```

## Mmap persistence mode configuration

### Complete configuration example

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // Required configuration
    .persistent("data.db")        // Persistence file path
    .keyCodec(keyCodec)           // key codec
    .valueCodec(valueCodec)       // value codec

    // Optional configuration
    .allocateSize(2L * 1024 * 1024 * 1024) // Preallocated size (default 2GB)
    .autoExpand(true)             // Enable automatic expansion

    // Index strategy (choose one of four, default segmentedIndex)
    .basicIndex()                 // Use base index
    .segmentedIndex(64)           // Use segmented indexes
    .primitiveIndex()             // Use original index
    .lowHeapIndex()               // Use the ultra-low-heap String index
    .initialCapacity(16)          // Initial index capacity (default: 16)

    // TTL (optional)
    .defaultTTL(30, TimeUnit.MINUTES)  // Default data expiration time

    // Automatic checkpoints (optional)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // Automatic checkpoint by time
    .autoCheckpoint(10000)                // Trigger by operation count

    .build();
```

### Parameter description

#### persistent

Set the persistence file path.

```java
// relative path
.persistent("data.db")

// absolute path
.persistent("/var/data/roguemap/data.db")

// With table of contents
.persistent("data/users/profiles.db")
```

**Note**:
- Make sure the directory exists
- Make sure you have read and write permissions

#### autoExpand / expandFactor / maxFileSize

```java
.autoExpand(true)         // Enable automatic expansion
.expandFactor(2.0)        // Double the file size on each expansion
.maxFileSize(10L * 1024 * 1024 * 1024)  // Max 10GB
```

## Index configuration

#### basicIndex

Use underlying index (ConcurrentHashMap).

```java
.basicIndex()
```

**Applicable scenarios**:
- Single thread or low concurrency
- Simple key-value storage

#### segmentedIndex

Use segmented index (default).

```java
.segmentedIndex(64)  // 64 segments
.segmentedIndex(128) // 128 segments
```

**Parameters**:
- `segments`: number of segments, default 64
- `segments` must be a power of 2 (e.g. 32/64/128)

**Suggestions**:
- High concurrency: 128 or 256
- Medium concurrency: 64 (default)
- Low concurrency: 32

#### primitiveIndex

Use raw indexes (Long/Integer keys only).

```java
.primitiveIndex()
```

**Restrictions**:
- Only supports keys of type Long or Integer

**Advantages**:
- Save 81% memory

#### lowHeapIndex

Use ultra-low-heap String indexing. Index data is stored in mmap files, and only segment metadata and locks are kept on the JVM heap.

```java
.lowHeapIndex()
```

**Restrictions**:
- Only supports keys/elements of type String (RogueMap and RogueSet)
- Transactions not supported (`beginTransaction()`)

**Advantages**:
- Very low heap memory usage, suitable for scenarios with massive String keys

#### lowHeapOptions

Customized LowHeap index parameters need to be used with `lowHeapIndex()`.

```java
import com.yomahub.roguemap.index.LowHeapOptions;

.lowHeapIndex()
.lowHeapOptions(new LowHeapOptions(128, 0.75, 16))
```

**Parameter Description**:
- `segmentCount`: Number of segments, default 64, must be a power of 2
- `loadFactor`: load factor, default 0.80, range (0.1, 0.95)
- `maxProbe`: Maximum number of detections, default 16

#### initialCapacity

Set the index initial capacity (default 16).

```java
.initialCapacity(16)
.initialCapacity(1024)
```

**Suggestion**:
- If you can estimate the number of keys, increasing it appropriately can reduce the number of expansion times.
- If the data size is uncertain, just keep the default value.

## TTL configuration

#### defaultTTL

Set the default data expiration time. See [TTL data expired ](./ttl.md) for details.

```java
import java.util.concurrent.TimeUnit;

// Expires in 30 minutes
.defaultTTL(30, TimeUnit.MINUTES)

// Expires in 24 hours
.defaultTTL(24, TimeUnit.HOURS)

// Expires in 7 days
.defaultTTL(7, TimeUnit.DAYS)
```

**Scope of application**: All four data structures are supported by the builder.

## Automatic Checkpoint configuration

For detailed instructions, please refer to [Checkpoints and Automatic Checkpoints ](./auto-checkpoint.md).

#### autoCheckpoint (by time interval)

```java
// Automatic checkpoint every 5 minutes
.autoCheckpoint(5, TimeUnit.MINUTES)
```

#### autoCheckpoint (by number of operations)

```java
// Automatic checkpoint every 10,000 write operations
.autoCheckpoint(10000)
```

Both modes can be enabled at the same time (OR logic), and checkpoint is triggered when either condition is met.

**Scope of application**: All four data structures are only meaningful in persistence mode.

## Codec configuration

### Key codec

```java
// String key
.keyCodec(StringCodec.INSTANCE)

// Long key
.keyCodec(PrimitiveCodecs.LONG)

// Integer key
.keyCodec(PrimitiveCodecs.INTEGER)

// Custom codec
.keyCodec(MyCustomCodec.INSTANCE)
```

### Value codec

```java
// primitive type
.valueCodec(PrimitiveCodecs.LONG)
.valueCodec(PrimitiveCodecs.INTEGER)
.valueCodec(PrimitiveCodecs.DOUBLE)

// String
.valueCodec(StringCodec.INSTANCE)

// object
.valueCodec(KryoObjectCodec.create(User.class))

// Customize
.valueCodec(MyCustomCodec.INSTANCE)
```

## Configuration template

### High performance cache

```java
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .allocateSize(2L * 1024 * 1024 * 1024) // 2GB
    .segmentedIndex(128) // High concurrency
    .build();
```

### Temporary processing of big data

```java
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .allocateSize(50L * 1024 * 1024 * 1024) // 50GB
    .primitiveIndex() // Save memory
    .build();
```

### Persistent database

```java
RogueMap<String, Document> db = RogueMap.<String, Document>mmap()
    .persistent("data/documents.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Document.class))
    .allocateSize(20L * 1024 * 1024 * 1024) // 20GB
    .autoExpand(true)
    .segmentedIndex(64)
    .build();
```

## Next step

- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
- [TTL data expired ](./ttl.md) — TTL detailed description
- [AUTO CHECKPOINT ](./auto-checkpoint.md) — Checkpoint details
- [Automatic expansion ](./auto-expand.md) — Detailed description of automatic expansion
- [Memory Management ](./memory-management.md) — Detailed explanation of memory management
