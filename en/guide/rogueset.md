# RogueSet - concurrent collection

RogueSet is a high-performance concurrent set based on memory-mapped files. It adopts a 64-segment segment lock design and supports thread-safe operations in high-concurrency scenarios.

## Quick Start

### Temporary file mode

```java
import com.yomahub.roguemap.RogueSet;
import com.yomahub.roguemap.serialization.StringCodec;

// Create a concurrent collection of temporary file patterns
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### Persistence mode

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// Create concurrent collections in persistence mode
RogueSet<Long> persistentSet = RogueSet.<Long>mmap()
    .persistent("data/myset.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .segmentCount(64)  // 64 segment segment lock
    .allocateSize(128 * 1024 * 1024L)  // 128MB
    .build();
```

## Basic operations

### Add elements

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Add an element and return whether the addition is successful
boolean added1 = set.add("apple");   // true (first added)
boolean added2 = set.add("apple");   // false (already exists)
boolean added3 = set.add("banana");  // true
```

### Check elements

```java
// Check if element exists
boolean hasApple = set.contains("apple");   // true
boolean hasOrange = set.contains("orange"); // false

// Get collection size
int size = set.size();  // 2
```

### Delete element

```java
// Delete the element and return whether the deletion is successful
boolean removed = set.remove("apple");  // true
boolean removed2 = set.remove("apple"); // false (no longer exists)
```

### Clear the collection

```java
// Clear all elements
set.clear();

// Check if it is empty
boolean empty = set.isEmpty();  // true
```

## Concurrency mechanism

### 64 Segmented lock design

RogueSet uses 64 independent segments, each segment has an independent StampedLock:

```
Segment distribution:
┌──────────┬──────────┬──────────┬──────────┐
│ Segment  │ Segment  │ Segment  │   ...    │
│    0     │    1     │    2     │   63     │
└──────────┴──────────┴──────────┴──────────┘
     ↓           ↓           ↓          ↓
StampedLock StampedLock StampedLock StampedLock
(Optimistic Reading) (Optimistic Reading) (Optimistic Reading) (Optimistic Reading)

Hash distribution:
hash(element) % segmentCount → Segment Index
```

### Concurrency advantage

- ✅ **Reduce lock competition** - 64 segments are independently locked, and the operations of different elements do not block each other
- ✅ **Optimistic Read Optimization** - `contains()` uses optimistic read, no locks in most cases
- ✅ **HIGH WRITE PERFORMANCE** - Write operations only lock a single segment
- ✅ **THREAD SAFE** - All operations are thread safe

### Concurrency example

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

RogueSet<Long> set = RogueSet.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .segmentCount(64)
    .build();

ExecutorService executor = Executors.newFixedThreadPool(16);

// Multi-threaded concurrent writing
for (int i = 0; i < 1000; i++) {
    final long id = i;
    executor.submit(() -> {
        set.add(id);        // Thread safety
        set.contains(id);   // Thread safety
    });
}

executor.shutdown();
```

## Iterator support

RogueSet supports iterative traversal, but you need to pay attention to the Fail-fast mechanism:

### Safe traversal

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

set.add("a");
set.add("b");
set.add("c");

// Iterate through all elements
for (String element : set) {
    System.out.println(element);
}
```

### Fail-fast mechanism

::: warning concurrent modification detection
Modifying the collection during iteration will throw `ConcurrentModificationException`:
:::

```java
try {
    for (String s : set) {
        // Danger! Modify the collection during iteration
        set.add("new-element");  // throws ConcurrentModificationException
    }
} catch (ConcurrentModificationException e) {
    System.out.println("Concurrent modification detected");
}
```

### Safe traversal modification

```java
// Option 1: Collect the elements to be added first, and then add them after traversing
List<String> toAdd = new ArrayList<>();
for (String s : set) {
    if (s.startsWith("prefix-")) {
        toAdd.add(s + "-processed");
    }
}
for (String s : toAdd) {
    set.add(s);
}

// Option 2: Use snapshot traversal
List<String> snapshot = new ArrayList<>();
for (String s : set) {
    snapshot.add(s);
}
// Perform operations on snapshots without affecting the original collection
```

## Complete example

### Remove duplicate scenes

```java
import com.yomahub.roguemap.RogueSet;
import com.yomahub.roguemap.serialization.StringCodec;

// Create a collection for deduplication
RogueSet<String> uniqueIds = RogueSet.<String>mmap()
    .persistent("data/unique_ids.db")
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(512 * 1024 * 1024L)  // 512MB
    .build();

// Process data streams and automatically remove duplicates
public void processRecord(String recordId) {
    if (uniqueIds.add(recordId)) {
        // First appearance, processing data
        processNewRecord(recordId);
    } else {
        // Duplicate data, skip
        System.out.println("Skip duplicate records:" + recordId);
    }
}

private void processNewRecord(String id) {
    // Logic for handling new records
}
```

### Tag system

```java
// User tag collection
RogueSet<String> userTags = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Add tag
userTags.add("premium");
userTags.add("active");
userTags.add("newsletter-subscriber");

// Check label
if (userTags.contains("premium")) {
    System.out.println("User is a premium member");
}

// Get the number of tags
int tagCount = userTags.size();
System.out.println("shared by users" + tagCount + " tags");
```

### ID blacklist

```java
// blacklist collection
RogueSet<Long> blacklist = RogueSet.<Long>mmap()
    .persistent("data/blacklist.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .build();

// Add blacklist
blacklist.add(1001L);
blacklist.add(1002L);

// Check if it is in blacklist
public boolean isBlocked(Long userId) {
    return blacklist.contains(userId);
}

// Remove blacklist
public void unblock(Long userId) {
    blacklist.remove(userId);
}
```

## Configuration options

| Options | Description | Default |
|-----|------|--------|
| `persistent(path)` | Persistence file path | - |
| `temporary()` | Temporary file mode | - |
| `allocateSize(size)` | Pre-allocated file size | 256MB |
| `elementCodec(codec)` | Element Codec | Required |
| `segmentCount(count)` | Number of segment locks | 64 |
| `initialCapacity(cap)` | Initial capacity of each segment | 16 |

::: tip parameter constraints
`segmentCount(count)` must be a power of 2, such as 32, 64, 128.
:::

## Comparison with Java HashSet

| Properties | HashSet | RogueSet |
|-----|---------|----------|
| Data storage | JVM heap memory | Memory mapped files |
| Memory pressure | High (occupies heap memory) | Low (file mapped storage) |
| GC impact | Large data volume triggers Full GC | Almost no impact |
| Persistence | Not supported | Supported |
| Concurrency safety | Non-thread safety | Thread safety (64-segment lock) |
| Capacity limit | Limited by JVM heap | Up to terabytes |

## Performance recommendations

### 1. Choose the appropriate number of segments

```java
// High concurrency scenario: increase the number of segments
RogueSet<String> highConcurrency = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .segmentCount(128)  // 128 paragraphs
    .build();

// Low concurrency scenario: reduce the number of segments
RogueSet<String> lowConcurrency = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .segmentCount(32)   // 32 paragraphs
    .build();
```

### 2. Use primitive types

```java
// Recommendation: Use primitive types (better performance)
RogueSet<Long> idSet = RogueSet.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .build();

// Avoid: String types (have serialization overhead)
RogueSet<String> strSet = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### 3. Avoid modification during iteration

```java
// Bad practice ❌
for (String s : set) {
    if (condition) {
        set.remove(s);  // May throw exception
    }
}

// Good practice ✅
List<String> toRemove = new ArrayList<>();
for (String s : set) {
    if (condition) {
        toRemove.add(s);
    }
}
for (String s : toRemove) {
    set.remove(s);
}
```

## Notes

1. **Resource Release** - Be sure to call `close()` or use try-with-resources after use
2. **Iterator safety** - Do not modify the collection during iteration
3. **Segment number selection** - Adjust `segmentCount` according to the degree of concurrency
4. **Persistence Consistency** - Call `flush()` before closing to ensure data is written to disk

## LowHeapStringSetIndex (ultra-low heap index)

RogueSet also supports ultra-low heap index, which is suitable for scenarios where there are a large number of String elements:

```java
import com.yomahub.roguemap.index.LowHeapOptions;

RogueSet<String> set = RogueSet.<String>mmap()
    .persistent("data/set.db")
    .elementCodec(StringCodec.INSTANCE)
    .lowHeapIndex()
    .lowHeapOptions(new LowHeapOptions(64, 0.80, 16))
    .build();
```

::: warning restriction
`lowHeapIndex()` Only String type elements are supported and transactions are not supported.
:::

See [Index Policy ](./index-strategies.md) for more details.

## Next step

- [RogueQueue](./roguequeue.md) — FIFO queue
- [Concurrency Control ](./concurrency.md) — In-depth understanding of concurrency mechanisms
- [TTL data expiration ](./ttl.md) — Set data to automatically expire
- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
- [Space Reclamation ](./compact.md) — Reclaim fragmented space
