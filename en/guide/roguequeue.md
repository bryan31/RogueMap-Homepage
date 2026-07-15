# RogueQueue - FIFO queue

RogueQueue is a FIFO queue based on memory mapped files and supports two modes: **Linked list mode (unbounded)** and **Ring buffer mode (bounded)**.

## Comparison of two modes

| Features | Linked List Mode (Linked) | Circular Buffer (Circular) |
|-----|------------------|---------------------|
| Capacity | Unbounded, automatic expansion | Bounded, fixed slots |
| Memory | Grow on demand | Pre-allocated fixed |
| Debris | May have debris | No debris |
| compact | supported | not supported (no fragmentation) |
| Crash recovery | Support snapshots | Support snapshots |
| Applicable scenarios | Task queue, message queue | High-frequency enqueue and dequeue, fixed buffer |

## Linked list mode (unbounded queue)

### Create linked list queue

```java
import com.yomahub.roguemap.RogueQueue;
import com.yomahub.roguemap.serialization.StringCodec;

// Temporary file mode
RogueQueue<String> linkedQueue = RogueQueue.<String>mmap()
    .temporary()
    .linked()  // Linked list mode
    .elementCodec(StringCodec.INSTANCE)
    .build();

// persistence mode
RogueQueue<String> persistentQueue = RogueQueue.<String>mmap()
    .persistent("data/tasks.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(512 * 1024 * 1024L)  // 512MB
    .build();
```

### Basic operations

```java
// Enqueue (add to tail)
linkedQueue.offer("task1");
linkedQueue.offer("task2");
linkedQueue.offer("task3");

// View the team leader element (do not remove it)
String peek = linkedQueue.peek();  // "task1"

// Dequeue (remove from head)
String task = linkedQueue.poll();  // "task1"
String task2 = linkedQueue.poll(); // "task2"

// Get queue size
int size = linkedQueue.size();     // 1
```

### Linked list queue characteristics

- ✅ **Unbounded Capacity** - Automatic expansion on demand
- ✅ **Idle node reuse** - polled nodes can be reused by offer
- ✅ **Support compact()** - Reclaim the space occupied by deleted data
- ✅ **Crash Recovery Snapshot** - Automatically write snapshots for each offer/poll

## Ring buffer mode (bounded queue)

### Create a ring queue

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// Ring buffer mode: capacity 1024, maximum element 64 bytes
RogueQueue<Long> circularQueue = RogueQueue.<Long>mmap()
    .persistent("data/ringbuffer.db")
    .circular(1024, 64)  // (capacity, maximum number of elements in bytes)
    .elementCodec(PrimitiveCodecs.LONG)
    .build();
```

### Basic operations

```java
// Join the team
circularQueue.offer(1L);
circularQueue.offer(2L);

// Check queue status
boolean full = circularQueue.isFull();   // Is it full?
boolean empty = circularQueue.isEmpty(); // Is it empty
int size = circularQueue.size();         // Current number of elements

// Dequeue
Long value = circularQueue.poll();  // 1L

// View team leader
Long peek = circularQueue.peek();   // 2L
```

### Ring Queue Features

- ✅ **Bounded Capacity** - Fixed slot, no unlimited growth
- ✅ **NO Fragmentation** - Fixed size slots, no memory fragmentation
- ✅ **High Performance** - Suitable for high-frequency queue entry and exit scenarios
- ⚠️ **does not support compact()** - no fragmentation, no need for compression

### Capacity check

```java
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/bounded.db")
    .circular(100, 256)  // 100 slots, maximum 256 bytes each
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Safe entry
if (!queue.isFull()) {
    queue.offer("new-item");
} else {
    System.out.println("The queue is full and cannot be added");
}

// Or check the return value
boolean added = queue.offer("item");
if (!added) {
    System.out.println("Queue is full");
}
```

## Complete example

### Task queue scenario

```java
import com.yomahub.roguemap.RogueQueue;
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// Define task class
public class Task {
    private String id;
    private String type;
    private long timestamp;

    // getters and setters...
}

// Create a persistent task queue
RogueQueue<Task> taskQueue = RogueQueue.<Task>mmap()
    .persistent("data/task_queue.db")
    .linked()  // unbounded queue
    .elementCodec(KryoObjectCodec.create(Task.class))
    .allocateSize(1024 * 1024 * 1024L)  // 1GB
    .build();

// Producer: add task
public void submitTask(Task task) {
    taskQueue.offer(task);
    taskQueue.flush();  // Ensure persistence
}

// Consumer: processing tasks
public void processTasks() {
    while (true) {
        Task task = taskQueue.poll();
        if (task == null) {
            // Queue is empty, waiting
            Thread.sleep(100);
            continue;
        }

        // processing tasks
        executeTask(task);
    }
}
```

### Log buffer scenario

```java
// Use ring buffer as log buffer
RogueQueue<String> logBuffer = RogueQueue.<String>mmap()
    .persistent("data/log_buffer.db")
    .circular(10000, 1024)  // 10,000 logs, each maximum 1KB
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Log writing
public void writeLog(String message) {
    if (!logBuffer.isFull()) {
        logBuffer.offer(message);
    } else {
        // Buffer is full, force refresh
        flushLogs();
        logBuffer.offer(message);
    }
}

// Log refresh
public void flushLogs() {
    while (!logBuffer.isEmpty()) {
        String log = logBuffer.poll();
        writeToDisk(log);
    }
}
```

### Messaging scenario

```java
// interprocess message queue
RogueQueue<byte[]> messageQueue = RogueQueue.<byte[]>mmap()
    .persistent("/tmp/messages.db")
    .linked()
    .elementCodec(new BytesCodec())  // Custom byte codec
    .allocateSize(256 * 1024 * 1024L)
    .build();

// Send message
public void sendMessage(byte[] data) {
    messageQueue.offer(data);
}

// receive messages
public byte[] receiveMessage() {
    return messageQueue.poll();
}
```

## Resource Management

### try-with-resources

```java
// Recommended method
try (RogueQueue<String> queue = RogueQueue.<String>mmap()
        .persistent("data/queue.db")
        .linked()
        .elementCodec(StringCodec.INSTANCE)
        .build()) {

    queue.offer("item1");
    queue.offer("item2");

    while (!queue.isEmpty()) {
        System.out.println(queue.poll());
    }

} // automatic shutdown
```

### Manual close

```java
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

try {
    queue.offer("item1");
    queue.flush();  // Flush to disk
} finally {
    queue.close();
}
```

## Crash recovery

RogueQueue supports crash recovery to ensure no data loss:

### Linked list queue snapshot

Each `offer()` and `poll()` operation automatically writes a crash recovery snapshot:

```java
// First run: writing data
RogueQueue<String> q1 = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

q1.offer("a");
q1.offer("b");
q1.offer("c");
String item = q1.poll();  // "a", also writes the snapshot
q1.close();

// Second run: Restore data
RogueQueue<String> q2 = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// Restoring from snapshot: Queue contains "b", "c"
System.out.println(q2.size());  // 2
System.out.println(q2.peek());  // "b"
```

### Ring queue recovery

Ring queues also support crash recovery:

```java
// The ring queue saves the head/tail pointers for each operation
// After a crash, you can restore to the state of the last operation
```

## Configuration options

### Linked list mode

| Options | Description | Default |
|-----|------|--------|
| `persistent(path)` | Persistence file path | - |
| `temporary()` | Temporary file mode | - |
| `linked()` | Use linked list mode | - |
| `allocateSize(size)` | Pre-allocated file size | 256MB |
| `elementCodec(codec)` | Element Codec | Required |

### Ring mode

| Options | Description | Default |
|-----|------|--------|
| `persistent(path)` | Persistence file path | - |
| `temporary()` | Temporary file mode | - |
| `circular(capacity, maxSize)` | Capacity and maximum element bytes | Required |
| `elementCodec(codec)` | Element Codec | Required |

## Comparison with Java Queue

| Properties | LinkedList/ArrayDeque | RogueQueue |
|-----|----------------------|------------|
| Data storage | JVM heap memory | Memory mapped files |
| Memory Pressure | High | Low |
| GC impact | Large data volume triggers Full GC | Almost no impact |
| Persistence | Not supported | Supported |
| Capacity limit | Limited by JVM heap | Up to terabytes |
| Crash recovery | Not supported | Supported |

## Mode selection guide

```
start
  ↓
Need fixed capacity?
  ├─ Yes → High frequency entry and exit?
  │ ├─ Yes → Ring Buffer Mode✅
  │ └─ No → Linked list mode ✅ (also supports bounded)
  └─ No → Need automatic expansion?
           ├─ Yes → Linked List Mode ✅
           └─ No → Ring Buffer Mode ✅
```

### Recommended scenarios

**Linked list mode is suitable for:**
- Task queue (task size is not fixed)
- Message queue (message volume is uncertain)
- Event stream processing

**Ring buffer fits:**
- Log buffer (fixed size buffer)
- High frequency data collection
- Fixed window data processing

## Notes

1. **Ring queue capacity** - the capacity cannot be dynamically adjusted after creation
2. **Resource Release** - Be sure to close it after use
3. **Element size** - Ring queue needs to estimate the maximum number of element bytes
4. **Persistence** - Remember to call `flush()` for key data

## Next step

- [Transaction ](./transaction.md) — Multi-operation atomic commit (RogueMap only)
- [TTL data expiration ](./ttl.md) — Set data to automatically expire
- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
- [Automatic expansion ](./auto-expand.md) — Grow file space on demand
- [Space Reclamation ](./compact.md) — Reclaim fragmented space
- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
