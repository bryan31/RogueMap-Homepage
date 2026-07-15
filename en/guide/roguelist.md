# RogueList - doubly linked list

RogueList is a high-performance doubly linked list based on memory mapped files, supporting O(1) random access and bidirectional traversal.

## Quick Start

### Temporary file mode

```java
import com.yomahub.roguemap.RogueList;
import com.yomahub.roguemap.serialization.StringCodec;

// Create a doubly linked list of temporary file patterns
RogueList<String> list = RogueList.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### Persistence mode

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// Create a doubly linked list in persistence mode
RogueList<Long> persistentList = RogueList.<Long>mmap()
    .persistent("data/mylist.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .allocateSize(256 * 1024 * 1024L)  // 256MB
    .build();
```

## Basic operations

### Add elements

```java
RogueList<String> list = RogueList.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Add to end (recommended, O(1) complexity)
list.addLast("hello");
list.addLast("world");

// Add to header (note: O(n) complexity)
list.addFirst("first");
```

### Read elements

```java
// Get the first element
String first = list.getFirst();     // "first"

// Get the last element
String last = list.getLast();       // "world"

// O(1) random access
String element = list.get(1);       // "hello"

// Get the size of the linked list
int size = list.size();             // 3
```

### Delete element

```java
// Remove last element (recommended, O(1) complexity)
String removed = list.removeLast(); // "world"

// Delete the first element (note: O(n) complexity)
String removed2 = list.removeFirst(); // "first"
```

### Check operation

```java
// Check if it is empty
boolean empty = list.isEmpty();

// Check if element is contained
boolean contains = list.contains("hello");
```

## Performance Tips

::: warning Time complexity note
- `addLast()` and `removeLast()` are **O(1)** complexity, **recommended**
- `addFirst()` and `removeFirst()` have **O(n)** complexity. Use caution in large list scenarios.
:::

| Operation | Time Complexity | Description |
|-----|-----------|------|
| `addLast()` | O(1) | Add to the end, recommended |
| `removeLast()` | O(1) | Remove from the end, recommended |
| `get(index)` | O(1) | Random access |
| `getFirst()` | O(1) | Get the first element |
| `getLast()` | O(1) | Get the tail element |
| `addFirst()` | O(n) | Need to move the position index array |
| `removeFirst()` | O(n) | Need to move the position index array |

## Iterator support

### Ordinary for loop

```java
for (int i = 0; i < list.size(); i++) {
    String element = list.get(i);
    System.out.println(element);
}
```

### Enhanced for loop

```java
for (String s : list) {
    System.out.println(s);
}
```

### ListIterator bidirectional traversal

```java
import java.util.ListIterator;

ListIterator<String> it = list.listIterator();

// forward traversal
while (it.hasNext()) {
    System.out.println("Index" + it.nextIndex() + ": " + it.next());
}

// Reverse traversal
while (it.hasPrevious()) {
    System.out.println("Index" + it.previousIndex() + ": " + it.previous());
}
```

### ListIterator specifies the starting position

```java
// Start at index 2
ListIterator<String> it = list.listIterator(2);

while (it.hasNext()) {
    System.out.println(it.next());
}
```

## Complete example

### Log collection scenario

```java
import com.yomahub.roguemap.RogueList;
import com.yomahub.roguemap.serialization.StringCodec;

// Create log list
RogueList<String> logs = RogueList.<String>mmap()
    .persistent("data/logs.db")
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(1024 * 1024 * 1024L)  // 1GB
    .build();

// Add log (append to end, O(1))
logs.addLast("[2024-01-01 10:00:00] User login: alice");
logs.addLast("[2024-01-01 10:01:00] User action: purchase");
logs.addLast("[2024-01-01 10:02:00] User logout: alice");

// Get recent logs
String lastLog = logs.getLast();
System.out.println("Latest log:" + lastLog);

// Go through all logs
for (String log : logs) {
    System.out.println(log);
}

// Remove processed logs (from the end or head)
logs.removeLast();

// refresh and close
logs.flush();
logs.close();
```

### Time series data

```java
// Store time series data points
RogueList<Long> timeSeries = RogueList.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .allocateSize(100 * 1024 * 1024L)  // 100MB
    .build();

// Add timestamp
for (long timestamp = System.currentTimeMillis(); true; ) {
    timeSeries.addLast(timestamp);
    Thread.sleep(1000);
}

// Get data at a specified time point
long historicalData = timeSeries.get(100);
```

## Resource Management

### try-with-resources

```java
// Recommended method: automatic resource management
try (RogueList<String> list = RogueList.<String>mmap()
        .persistent("data/mylist.db")
        .elementCodec(StringCodec.INSTANCE)
        .build()) {

    list.addLast("item1");
    list.addLast("item2");

} // Automatically closed, persistence mode will save the index
```

### Manual close

```java
RogueList<String> list = RogueList.<String>mmap()
    .persistent("data/mylist.db")
    .elementCodec(StringCodec.INSTANCE)
    .build();

try {
    list.addLast("item1");
    list.flush();  // Persistence mode: flush to disk
} finally {
    list.close();  // Make sure to close
}
```

## Configuration options

| Options | Description | Default |
|-----|------|--------|
| `persistent(path)` | Persistence file path | - |
| `temporary()` | Temporary file mode | - |
| `allocateSize(size)` | Pre-allocated file size | 256MB |
| `initialCapacity(cap)` | Location index initial capacity | 1024 |
| `elementCodec(codec)` | Element Codec | Required |

## Comparison with Java ArrayList

| Properties | ArrayList | RogueList |
|-----|-----------|-----------|
| Data storage | JVM heap memory | Memory mapped files |
| Memory pressure | High (occupies heap memory) | Low (file mapped storage) |
| GC impact | Large data volume triggers Full GC | Almost no impact |
| Persistence | Not supported | Supported |
| Random access | O(1) | O(1) |
| Capacity limit | Limited by JVM heap | Up to terabytes |

## Notes

1. **Resource Release** - Be sure to call `close()` or use try-with-resources after use
2. **Performance Selection** - Give priority to `addLast()`/`removeLast()`
3. **Iterator concurrency** - Do not modify the linked list during the iteration process, `ConcurrentModificationException` may be thrown
4. **Persistence Consistency** - Call `flush()` before closing to ensure data is written to disk

## Next step

- [RogueSet](./rogueset.md) — Concurrent collection
- [RogueQueue](./roguequeue.md) — FIFO queue
- [TTL data expiration ](./ttl.md) — Set data to automatically expire
- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
- [Automatic expansion ](./auto-expand.md) — Grow file space on demand
- [Space Reclamation ](./compact.md) — Reclaim fragmented space
