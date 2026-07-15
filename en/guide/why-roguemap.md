# Why choose RogueMap

## Problem background

When using key-value storage in Java applications, we often face the following problems:

### 1. HashMap memory problem

```java
// Traditional HashMap takes up a lot of heap memory
Map<String, Object> cache = new HashMap<>();
for (int i = 0; i < 1_000_000; i++) {
    cache.put("key" + i, largeObject);
}
// Question:
// - Takes up a lot of heap memory (300+ MB)
// - Frequent GC affects application performance
// - May cause OOM
// - No TTL expiration mechanism, manual cleaning is required
```

### 2. Complexity of external cache

Use external caches such as Redis and Memcached:

- ❌ Requires additional server resources
- ❌ Network I/O overhead
- ❌ Complex deployment and operation and maintenance
- ❌ Serialization/deserialization overhead
- ❌ Although the TTL function is available, it requires independent deployment and maintenance

### 3. MapDB performance issues

Although MapDB provides persistence, the performance is not ideal:

- ❌ Slow reading speed (1 million pieces of data takes 3.2 seconds)
- ❌ Slow writing speed (1 million pieces of data takes 2.8 seconds)
- ❌ API is complex to use

## RogueMap’s solution

### 1. Memory mapped file storage

RogueMap stores data in memory mapped files:

```java
// RogueMap uses memory mapped files
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Advantages:
// ✅Heap memory usage is significantly reduced
// ✅ GC pressure significantly reduced
// ✅ Avoid OOM risks
```

### 2. Ultimate performance optimization

RogueMap achieves ultimate performance through a variety of optimization methods:

**Zero-copy serialization**
```java
// Direct memory layout for primitive types, no serialization overhead
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

**Smart memory allocation**
- Reduce memory fragmentation
- Free list reuse

**High concurrency optimization**
- 64-segment segment lock
- StampedLock optimistic lock
- Reduce lock contention

### 3. Flexible storage model

Choose the appropriate storage mode according to different scenarios:

| Mode | Features | Applicable Scenarios |
|-----|------|---------|
| Mmap Temp | Temporary files, automatic cleaning | Temporary processing of big data |
| Mmap Persist | Persistence, recoverable | Data persistence required |

### 4. Simple and easy to use API

```java
// Type-safe Builder API
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Familiar Map interface
map.put("key", 100L);
Long value = map.get("key");
map.remove("key");
```

## Design concept

### 1. Performance first

- Low-level optimization based on Unsafe API
- Zero-copy serialization
- Intelligent memory allocation
- High concurrency optimization

### 2. Simple and easy to use

- Type-safe Builder API
- Familiar Map interface
- Automatic resource management
- Zero dependency design

### 3. Flexible and reliable

- Multiple storage modes
- Multiple indexing strategies
- Persistence support
- Thread safety

## Typical scenario

### Scenario 1: High-performance caching

```java
// Replacement for Redis/Memcached
RogueMap<String, UserProfile> cache = RogueMap.<String, UserProfile>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(UserProfile.class))
    .allocateSize(1024 * 1024 * 1024) // 1GB
    .build();

// Advantages:
// ✅ Zero network overhead
// ✅ Higher throughput
// ✅ Easier deployment
// ✅ Built-in TTL expiration, no external caching required
// ✅ Transaction support, multi-key atomic writing
```

### Scenario 2: Temporary processing of big data

```java
// Avoid OOM
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .allocateSize(10L * 1024 * 1024 * 1024) // 10GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .build();

// Advantages:
// ✅Supports extremely large data volumes
// ✅ Reduce GC pressure
// ✅ Automatically clean up temporary files
```

### Scenario 3: Persistent storage

```java
// embedded database
RogueMap<String, Config> configStore = RogueMap.<String, Config>mmap()
    .persistent("config.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Config.class))
    .build();

// Advantages:
// ✅ Data persistence
// ✅Automatic recovery
// ✅ High performance reading and writing
```

## Summary

Reasons to choose RogueMap:

1. **Excellent writing performance** - faster than HashMap
2. **Lower memory usage** - Significantly reduces GC pressure
3. **Simpler API** - type safe, easy to use
4. **Zero Dependencies** - The core library has no third-party dependencies
5. **Flexible Storage** - Two modes to choose from
6. **Persistence Support** - The only solution that supports both persistence and high performance
7. **High Concurrency** - Thread safety, supports high concurrent reading and writing
8. **Built-in TTL expiration** - Automatic data expiration can be achieved without additional components, while HashMap does not support it at all. Although Redis supports it, it requires the deployment of external services.
9. **Embedded transactions** - RogueMap supports atomic multi-key transactions (Read Committed isolation level) without introducing a distributed transaction framework

## Next step

- [QUICK START ](./getting-started.md) - Get Started in 5 Minutes
- [Storage Mode ](./storage-modes.md) - Learn about the two storage modes
- [Performance White Paper ](../performance/benchmark) - Detailed performance data and analysis
