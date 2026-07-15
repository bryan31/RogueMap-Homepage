# RogueMap 1.0.1 official version released: a high-performance embedded storage engine that breaks through the JVM memory wall

> Let your Java application easily handle massive data, reduce heap memory usage by 84.7%, and support persistence and transactions

## Preface

Today, we are very happy to announce: **RogueMap 1.0.1 official version** has been released!

RogueMap is a high-performance embedded storage engine based on memory mapped files (mmap), specially designed to solve the pain points of limited heap memory and data persistence in Java applications. After continuous iterative optimization, version 1.0.1 already has complete data structure support, enterprise-level transaction capabilities and production-level stability.

---

## 1. Changes compared with earlier versions

From the original single key-value store to today's fully functional storage engine, RogueMap has undergone major upgrades:

### 1. Add three new data structures

Earlier versions only provided RogueMap (key-value storage), version 1.0.1 added:

- **RogueList**: Doubly linked list, supports O(1) random access, suitable for sequential data and time series scenarios
- **RogueSet**: concurrent collection, 64-segment segment lock design, suitable for deduplication, tags, blacklists and other scenarios
- **RogueQueue**: FIFO queue, supports linked list mode (unbounded) and ring buffer mode (bounded), suitable for task and message consumption scenarios

The four data structures adopt a unified Builder API style, with low learning costs and easy switching.

### 2. Transaction support

Added atomic multi-bond operation capabilities:

- **Atomicity**: All writes are atomic when `commit()` takes effect
- **Isolation Level**: Read Committed, read submitted data
- **Deadlock Prevention**: Lock according to segment index in ascending order to eliminate deadlock from the root cause
- **Automatic rollback**: Automatically rollback when `commit()` is not called

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);
    txn.commit();  // Atomic commit
}
```

### 3. Enhanced operation and maintenance capabilities

- **Automatic expansion**: When the file space is insufficient, it will automatically expand by multiples, transparent and imperceptible
- **Space Recycling**: `compact()` method to recycle fragmented space and improve storage efficiency
- **Checkpoint**: `checkpoint()` forces persistent indexing to reduce the crash loss window
- **Operation Monitoring**: `StorageMetrics` provides indicators such as file size, fragmentation rate, number of entries, etc.

### 4. Performance optimization

- **forEach traversal**: supports traversing all key-value pairs
- **Idle linked list reuse**: LinkedQueueStorage adds a new idle linked list and reuses polled nodes.
- **Fail-fast iterators**: RogueSet and RogueList iterators support concurrent modification detection
- **Crash recovery enhancement**: CRC32 check + write generation + dirty flag triple guarantee

---

## 2. Core features and functions

### Four data structures, one style

| Structure | Core Operations | Typical Scenarios |
|------|---------|---------|
| `RogueMap<K,V>` | `put/get/remove` | Key-value cache, state storage |
| `RogueList<E>` | `addLast/get/removeLast` | Sequential data, time series |
| `RogueSet<E>` | `add/contains/remove` | Duplicate removal, tags, blacklists |
| `RogueQueue<E>` | `offer/poll/peek` | Task queue, message consumption |

### Two storage modes

- **Temporary mode** `temporary()`: JVM automatically cleans up after exiting, suitable for temporary processing of big data
- **Persistence Mode** `persistent(path)`: Data is dropped to disk and automatically restored after the process is restarted.

### Technical Highlights

- **Zero-copy serialization**: Direct memory layout of primitive types (Long, Integer, Double, etc.), no serialization overhead
- **64 segment segment lock**: StampedLock optimistic reading, high concurrency lock contention is extremely low
- **Zero Dependencies**: The core library has no third-party dependencies, and Kryo is an optional dependency.
- **Java 8+**: Compatible with Java 8 and above

### Get started quickly

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

```java
// Create a persistent RogueMap
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("alice", 100L);
System.out.println(map.get("alice"));  // 100L
```

---

## 3. Why choose RogueMap?

### Pain points of traditional solutions

**HashMap problem**:
- When the amount of data is large, it takes up a lot of heap memory and is prone to OOM.
- Frequent Full GC causes application lags
- All data will be lost when the process is restarted

**External cache (Redis) problem**:
- Requires additional server resources
- High network I/O overhead
- Complex deployment and operation and maintenance

**MapDB problem**:
- Performance is less than ideal (1 million reads takes 7.7 seconds)
- API is complex to use

### RogueMap’s solution

| Features | Legacy Collections | RogueMap |
|------|---------|----------|
| **Data Capacity** | Limited by heap size | **Unlimited, up to TB** |
| **Heap memory usage** | 100% | **Only 15.3%** |
| **GC Impact** | Severe (Full GC pauses) | **Little Impact** |
| **Persistence** | Not supported | **Supported** |
| **Transaction** | Not supported | **Atomic multi-key operation** |

### Actual income

1. **Break through the memory wall**: No longer limited by JVM heap memory, easily handle terabytes of data
2. **Reduce GC pressure**: Heap memory usage is reduced by 84.7%, and Full GC frequency is significantly reduced.
3. **Data persistence**: Data will not be lost when the process is restarted, and crash recovery is supported.
4. **Simplified Architecture**: Embedded design, no additional services required, zero operation and maintenance costs
5. **High Performance**: The best performance among similar persistence solutions

---

## 4. Performance

Based on Linux 2C4G server, 1 million data test results:

### Comprehensive performance comparison

| Solution | Writing time | Reading time | Heap memory usage | Persistence |
|------|---------|---------|-----------|--------|
| HashMap | 1,535ms | **158ms** | 311.31 MB | ❌ |
| FastUtil | **600ms** | **32ms** | 275.69 MB | ❌ |
| **RogueMap Persistence** | **1,057ms** | **642ms** | **47.63 MB** | ✅ |
| MapDB Persistence | 8,117ms | 7,709ms | 7.71 MB | ✅ |
| Redis (network) | ~15,000ms | ~10,000ms | External services | ✅ |

### Key data

- **Write Performance**: **1.45x faster** than HashMap, **7.7x faster than MapDB**
- **Read throughput**: **1.55 million ops/s**, **12 times faster** than MapDB, **15.6 times faster than Redis (network)**
- **Memory Optimization**: Save **84.7%** heap memory than HashMap

### Design Tradeoffs

RogueMap chose **Storage Breakthrough + Concurrency Safety** in the "Impossible Triangle" and made certain trade-offs in speed:

- Read performance is about 1/4 of HashMap (because deserialization is involved)
- But the read throughput of **1.55 million ops/s** has satisfied most business scenarios
- RogueMap has the best performance among all solutions that support persistence

---

## 5. Stability and production readiness

### Crash recovery mechanism

RogueMap uses triple guarantees to ensure data security:

1. **CRC32 check**: detect data corruption
2. **Writing Algebra**: Distinguish between writing in progress and writing completed status
3. **Dirty flag**: Indicates abnormal shutdown and performs recovery check at startup.

### Production-level features

| Features | Description |
|------|------|
| **Thread-safe** | All operations thread-safe, 64-segment segment lock |
| **Crash Recovery** | Supported, narrow the lost window via `checkpoint()` |
| **Space Management** | Automatic expansion + manual compaction |
| **Monitoring indicators** | File size, fragmentation rate, number of entries, etc. |
| **Graceful shutdown** | Support Shutdown Hook to automatically flush the disk |

### Test coverage

- Functional tests: MmapFunctionalTest, ListFunctionalTest, SetFunctionalTest, QueueFunctionalTest
- Concurrency safety tests: ConcurrentSafetyTest, ListConcurrentTest, SetConcurrentTest
- Crash recovery tests: CheckpointRecoveryTest, QueueCrashRecoveryTest
- Transaction test: TransactionTest
- Performance comparison test: *ComparisonTest

### Production environment suggestions

1. **Regular checkpoint**: Important data is flushed regularly to ensure crash recovery
2. **Monitor fragmentation rate**: Execute `compact()` when fragmentation rate > 50%
3. **Estimated Capacity**: Estimate capacity when the amount of data is controllable to avoid expansion expenses.
4. **Use try-with-resources**: Ensure that resources are released correctly
5. **CODEC CONSISTENT**: The same codec must be used when restoring as when writing

---

## 6. Typical application scenarios

### Scenario 1: High-performance local cache

Replaces Redis/Memcached, zero network overhead, higher throughput:

```java
RogueMap<String, UserProfile> cache = RogueMap.<String, UserProfile>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(UserProfile.class))
    .allocateSize(1024 * 1024 * 1024)  // 1GB
    .build();
```

### Scenario 2: Temporary processing of big data

Avoid OOM and support extremely large data volumes:

```java
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .allocateSize(10L * 1024 * 1024 * 1024)  // 10GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .build();
```

### Scenario 3: Persistent state storage

Embedded database, automatic recovery:

```java
RogueMap<String, Config> configStore = RogueMap.<String, Config>mmap()
    .persistent("config.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Config.class))
    .build();
```

---

## 7. Quick start

### 1. Add Maven dependencies

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

### 2. Get started in 5 minutes

```java
// Create RogueMap
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .autoExpand(true)  // Automatic expansion
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Basic operations
map.put("key1", 100L);
map.get("key1");  // 100L
map.remove("key1");

// Transaction operations
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key2", 200L);
    txn.put("key3", 300L);
    txn.commit();  // Atomic commit
}

// Traverse
map.forEach((k, v) -> System.out.println(k + " = " + v));

// Close (automatic disk flushing)
map.close();
```

---

## 8. More resources

- **GitHub**：https://github.com/bryan31/RogueMap
- **Official Documentation**: Detailed documentation, performance white papers and best practices
- **Maven Central**：`com.yomahub:roguemap:1.0.1`

---

## Summary

The official version of RogueMap 1.0.1 is a fully functional, high-performance, production-ready embedded storage engine. If you are looking for:

- A solution to break through the JVM heap memory limit
- High-performance key-value storage that supports persistence
- Reliable embedded database
- Data structures to reduce GC pressure

Then RogueMap is your best choice!

Welcome to Star, Fork and submit Issues, let us build a better Java embedded storage engine together!
