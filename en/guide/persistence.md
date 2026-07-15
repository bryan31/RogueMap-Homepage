# Persistence

RogueMap's Mmap persistence mode supports persisting data to disk and automatically restoring it after the application is restarted.

## Basic usage

### Create a persistent Map

```java
// First run: create the map and write data
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("alice", 100L);
map.put("bob", 200L);
map.put("charlie", 300L);

map.close(); // Automatic disk brushing
```

### Restore data

```java
// Second run: reopen the map and restore data
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

Long score = map.get("alice");  // 100L (restore from disk)
System.out.println("Alice's score: " + score);
```

## File structure

### File header (Header)

```
File header (4KB = 4096 bytes)
├── offset 0-47: 9 data fields (magic, version, dataType, indexType, entryCount, currentOffset, indexOffset, indexSize, isTemporary)
├── offset 48-51: CRC32 checksum (calculated on the contents of offset 0-47)
├── offset 52-55: writeGen (write generation: odd number = writing, even number = writing completed)
├── offset 56-59: dirtyFlag (1=abnormal shutdown, 0=normal shutdown)
├── offset 60-63: reserved
├── offset 64-95: queue snapshot area (headRelOffset, tailRelOffset, size, valid, currentAllocOffset, used for LinkedQueue crash recovery)
├── offset 96-111: RogueList TTL area (overall expiration timestamp + retention)
└── offset 112-4095: reserved
```

**Key field description:**

- **indexType**: Index type identification (0=HashIndex, 1=SegmentedHashIndex, 2=LongPrimitiveIndex, 3=IntPrimitiveIndex, 4=LowHeapStringIndex).
- **isTemporary**: storage mode identification (0=persistent, 1=temporary).
- **CRC32 checksum**: calculated and saved when writing the file header, and verifying data integrity when reading.
- **writeGen**: Write the algebraic counter. +1 before writing (changes to odd number), +1 after writing (changes to even number). If it is an odd number when reading, it means that the last write was not completed.
- **dirtyFlag**: Set to 1 when opening a file, and set back to 0 when `close()` is normal. If `dirtyFlag = 1` is found when opening, it means the last shutdown was abnormal.
- **Queue Snapshot Area**: Only used by LinkedQueue. Snapshot head/tail/size and current allocation offset at each `offer()`/`poll()` for post-crash recovery.
- **Version Number**: Currently v2 (supports TTL).

### Data area

```
Data Area
┌────────────────────────────────┐
│ Entry 1                         │
│ ├─ Key Data                     │
│ ├─ Value Data                   │
│ └─ Metadata                     │
├────────────────────────────────┤
│ Entry 2                         │
├────────────────────────────────┤
│ ...                             │
└────────────────────────────────┘
```

## Flash disk mechanism

### Automatically flush the disk

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("key1", 100L);
map.put("key2", 200L);

// close() calls flush() automatically
map.close();
```

### Manual disk flashing

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Write large amounts of data
for (int i = 0; i < 1000000; i++) {
    map.put("key" + i, (long) i);
}

// Manual disk brushing
map.flush();

// continue to use
Long value = map.get("key1");
```

### Regularly refresh the disk

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Start a regular disk flushing thread
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    map.flush();
    System.out.println("Flushed to disk");
}, 1, 5, TimeUnit.MINUTES); // Flush disk every 5 minutes

// When application ends
scheduler.shutdown();
map.close();
```

## Data recovery

### Normal recovery

```java
// The application is closed normally and then restarted
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Automatic data recovery
int size = map.size();
System.out.println("Recovered entries: " + size);
```

### Exception recovery

```java
// Restart the application after abnormal crash
try {
    RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();

    // Recover the data from the last flash drive
    // Data that has not been flushed may be lost
    System.out.println("Recovered entries: " + map.size());
} catch (Exception e) {
    // Corrupted file
    System.err.println("Failed to recover: " + e.getMessage());
}
```

## Pre-allocation strategy

### Fixed size pre-allocation

```java
// 10GB of space pre-allocated
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .allocateSize(10L * 1024 * 1024 * 1024) // 10GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

### Estimated based on data volume

```java
long recordCount = 10_000_000; // 10 million records
int avgKeySize = 20; // average key size
int avgValueSize = 100; // average size
double safetyFactor = 1.5; // safety factor

long estimatedSize = (long) (recordCount * (avgKeySize + avgValueSize) * safetyFactor);

RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

## Multiple file management

### Sharded storage

```java
// Shard by date
String date = LocalDate.now().toString();
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/metrics_" + date + ".db")
    .allocateSize(1024 * 1024 * 1024L)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### Multiple instance management

```java
// Manage multiple persistent maps
Map<String, RogueMap<String, Long>> maps = new HashMap<>();

// Create multiple instances
maps.put("users", RogueMap.<String, Long>mmap()
    .persistent("data/users.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build());

maps.put("sessions", RogueMap.<String, Long>mmap()
    .persistent("data/sessions.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build());

// Use
maps.get("users").put("alice", 100L);
maps.get("sessions").put("session1", System.currentTimeMillis());

// Close all
for (RogueMap<String, Long> map : maps.values()) {
    map.close();
}
```

## Data migration

### Export data

```java
// Export from old file
RogueMap<String, Long> oldMap = RogueMap.<String, Long>mmap()
    .persistent("data/old.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Export to new file
RogueMap<String, Long> newMap = RogueMap.<String, Long>mmap()
    .persistent("data/new.db")
    .allocateSize(2L * 1024 * 1024 * 1024) // 2GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Migrate data: use forEach to iterate over old instances
oldMap.forEach((key, value) -> {
    newMap.put(key, value);
});

oldMap.close();
newMap.close();
```

## Best Practices

### 1. Flush the disk regularly

```java
// Flush important data regularly
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    try {
        map.flush();
    } catch (Exception e) {
        logger.error("Flush failed", e);
    }
}, 0, 5, TimeUnit.MINUTES);
```

### 2. Graceful shutdown

```java
// Register Shutdown Hook
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    System.out.println("Closing RogueMap...");
    map.close(); // Automatic disk brushing
    System.out.println("RogueMap closed.");
}));
```

### 3. Exception handling

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>mmap()
        .persistent("data.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();

    // Use map
    map.put("key", 100L);

} catch (Exception e) {
    logger.error("Error using RogueMap", e);
} finally {
    if (map != null) {
        try {
            map.close();
        } catch (Exception e) {
            logger.error("Error closing RogueMap", e);
        }
    }
}
```

### 4. File path specification

```java
// Use absolute paths or paths relative to the working directory
String dataDir = System.getProperty("user.dir") + "/data";
new File(dataDir).mkdirs(); // Make sure the directory exists

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent(dataDir + "/mydata.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

## Notes

### 1. Codec consistency

```java
// Codec at creation time
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

// Must use the same codec when restoring ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // Same
    .valueCodec(PrimitiveCodecs.LONG) // Same
    .build();

// Using different codecs can cause data corruption ❌
```

### 2. File size limit

```java
// allocateSize() will take up disk space immediately
// Make sure the disk has enough space
long freeSpace = new File("/").getFreeSpace();
long allocateSize = 10L * 1024 * 1024 * 1024; // 10GB

if (freeSpace < allocateSize) {
    throw new IllegalStateException("Not enough disk space");
}
```

### 3. Concurrent access

```java
// Concurrent access to the same file by multiple processes is not supported
// A file can only be opened by one RogueMap instance at a time
```

## Next step

- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
- [Configuration option ](./configuration.md) — Detailed configuration instructions
- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
- [Performance White Paper ](../performance/benchmark) — Performance Data and Analysis
