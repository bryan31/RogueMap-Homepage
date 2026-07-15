# Quick start

This guide will help you get started with RogueMap in under 5 minutes.

## Recommended reading order

1. First read [Getting Started Route (10 minutes) ](./quick-start-path.md) to get the shortest landing path.
2. Follow the example on this page to run through the first write and restore.
3. Finally enter [Configuration option ](./configuration.md) Tuning by business.

## Installation

### Maven

Add dependencies to your `pom.xml`:

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>
```

### Gradle

Add dependencies to your `build.gradle`:

```gradle
implementation 'com.yomahub:roguemap-core:1.1.7'
```

## Quick check on structure selection

| Structure | What scene is it suitable for |
|---|---|
| `RogueMap<K, V>` | Key-value storage, cache, state table |
| `RogueList<E>` | Sequential writing, log streaming, time series |
| `RogueSet<E>` | Deduplication, tags, blacklist |
| `RogueQueue<E>` | Task queue, message consumption |

## First example

### Mmap temporary file mode

```java
import com.yomahub.roguemap.RogueMap;
import com.yomahub.roguemap.serialization.PrimitiveCodecs;
import com.yomahub.roguemap.serialization.StringCodec;

// Create a temporary file Map of String -> Long
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {

    // Store data
    map.put("user1", 1000L);
    map.put("user2", 2000L);

    // Read data
    Long score = map.get("user1");
    System.out.println("Score: " + score); // 1000

    // Update data
    map.put("user1", 1500L);

    // Delete data
    map.remove("user2");

    // Check existence
    boolean exists = map.containsKey("user1"); // true

    // Get size
    int size = map.size(); // 1
}
```

::: tip resource management
RogueMap implements the `AutoCloseable` interface, and it is recommended to use the `try-with-resources` statement to automatically release resources.
:::

## Supported data types

### Primitive type

RogueMap provides zero-copy primitive type codecs:

```java
// Long type (high performance)
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Integer type
RogueMap<Integer, Integer> intMap = RogueMap.<Integer, Integer>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .build();

// String type
RogueMap<String, String> stringMap = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

**Supported primitive types**: `Long`, `Integer`, `Double`, `Float`, `Short`, `Byte`, `Boolean`

### Object type

For complex objects, you can use Kryo serialization:

```java
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// Object type
RogueMap<String, YourObject> objectMap = RogueMap.<String, YourObject>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(YourObject.class))
    .build();
```

::: warning object serialization
Using object serialization will bring additional performance overhead, and it is recommended to use primitive types first.
:::

## Two storage modes

### 1. Mmap temporary file mode

Temporary files are automatically created and deleted after the JVM is shut down:

```java
RogueMap<Long, Long> tempMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(500 * 1024 * 1024L) // 500MB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 2. Mmap persistence mode

Support data persistence to disk:

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

::: tip Choose a suggestion
- **Mmap temporary file**: temporary processing of large amounts of data
- **Mmap Persistence**: Data persistence is required
:::

## Basic operations

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {

    // write
    map.put("key1", 100L);

    // read
    Long value = map.get("key1");

    // Determine whether it exists
    boolean exists = map.containsKey("key1");

    // Delete
    map.remove("key1");

    // Batch writing (1.1.7+, semantics consistent with java.util.Map.putAll, cross-key atomicity is not guaranteed)
    Map<String, Long> batch = new HashMap<>();
    batch.put("key2", 200L);
    batch.put("key3", 300L);
    map.putAll(batch);

    // Batch read (1.1.7+, results do not include unfound or expired keys)
    Map<String, Long> found = map.getAll(Arrays.asList("key1", "key2", "key3"));

    // Get size
    int size = map.size();

    // Clear
    map.clear();
}
```

::: tip Batch API Description
`putAll` / `getAll` is a new batch API added in 1.1.7. `putAll` supports the TTL variant `putAll(map, ttl, unit)`, which uses the same expiration time for the entire batch of entries. Bulk writes do not guarantee cross-key atomicity - use [transaction ](./transaction.md) when atomic multi-key writes are required.
:::

## Next step

- [Function Matrix ](./feature-matrix.md) — Four structural capabilities and boundaries can be understood on one page
- [Storage Mode ](./storage-modes.md) — An in-depth look at both storage modes
- [Index Policy ](./index-strategies.md) — Choose the appropriate index
- [CODEC ](./codecs.md) — Custom data serialization
- [TTL data expiration ](./ttl.md) — Set data to automatically expire
- [Configuration option ](./configuration.md) — Detailed configuration instructions
- [FAQs and Troubleshooting ](./troubleshooting.md) — Quickly locate usage problems
