# Checkpoints and automatic checkpoints

`checkpoint()` is used to force persistent indexes to disk. After calling, even if the process crashes (`close()` is not called), the state of the latest checkpoint can be restored the next time the file is opened.

:::info Scope of application
`checkpoint()` and `autoCheckpoint()` **Apply to all four data structures** (RogueMap, RogueList, RogueSet, RogueQueue) and only take effect in persistence mode.
:::

## Manual checkpoint

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Write data
for (int i = 0; i < 10000; i++) {
    map.put("key-" + i, (long) i);
}

// Create checkpoint
map.checkpoint();  // Ensure persistence and recoverability after crash

// Continue writing...
for (int i = 10000; i < 20000; i++) {
    map.put("key-" + i, (long) i);
}
// If it crashes at this time, it can only recover to 10,000 pieces of data.
```

### Checkpoint after batch writing

```java
for (int batch = 0; batch < 100; batch++) {
    for (int i = 0; i < 1000; i++) {
        map.put("key-" + (batch * 1000 + i), (long) i);
    }
    map.checkpoint();  // checkpoint after each batch of writes
}
```

### Checkpoint after transaction submission

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key1", 100L);
    txn.put("key2", 200L);
    txn.commit();
}
map.checkpoint();  // Ensure transaction results are durable
```

## AutoCheckpoint

RogueMap supports automatic checkpoints based on time intervals and number of operations, avoiding the cumbersome manual calling of `checkpoint()`.

### Trigger by time interval

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // Automatic checkpoint every 5 minutes
    .build();
```

### Triggered by number of operations

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .autoCheckpoint(10000)  // Automatic checkpoint every 10,000 write operations
    .build();
```

::: warning putAll counting rhythm (1.1.7+)
Batch entry `putAll` will record a whole batch of n items into the counter as **one** batch count. When the accumulation reaches the threshold, only **at most one** checkpoint will be triggered. This means that the actual checkpoint frequency may be lower than the frequency implied by the threshold - for example, a threshold of 1000 and a one-time `putAll` 10000 items will only be triggered once instead of ten times. If you need intensive persistence based on the actual number of writes, please manually call `checkpoint()` between batch operations.
:::

### Both modes are enabled at the same time

```java
.autoCheckpoint(5, TimeUnit.MINUTES)  // time trigger
.autoCheckpoint(10000)                // Triggered by number of operations
// Execute checkpoint when any condition is met
```

::: tip implementation details
- Use daemon thread pool (`ScheduledExecutorService`) to not block business threads.
- The operation counter uses CAS atomic operations to avoid repeated triggering.
- Only takes effect in persistent mode; automatically skipped in temporary mode.
:::

## Support of each data structure

### Manual checkpoint

| Data structure | `checkpoint()` | Description |
|---|---|---|
| RogueMap | ✅ | Serialized Hash index + flush |
| RogueList | ✅ | Serialized linked list index + flush |
| RogueSet | ✅ | Serialized Set index + flush |
| RogueQueue | ✅ | Serialized queue metadata (head/tail/size) + flush |

Manual `checkpoint()` is supported for all four data structures and only takes effect in persistence mode.

### AutoCheckpoint

| Data structure | `autoCheckpoint(interval, TimeUnit)` | `autoCheckpoint(count)` | Trigger write operation |
|---|---|---|---|
| RogueMap | ✅ | ✅ | `put()`, `remove()`, `putAll()` (the entire batch is counted once) |
| RogueList | ✅ | ✅ | `addFirst()`、`addLast()`、`removeFirst()`、`removeLast()` |
| RogueSet | ✅ | ✅ | `add()`、`remove()` |
| RogueQueue | ✅ | ✅ | `offer()`, `poll()` (only counts on success) |

All four data structures support automatic checkpointing, and both triggering modes can be turned on simultaneously (OR logic).

## checkpoint vs flush vs close

| Operations | Persistent Indexes | Crash Recovery | Continue Using |
|-----|-----------|---------|---------|
| `checkpoint()` | ✅ | ✅ | ✅ |
| `flush()` | ❌ (only sync data page) | ❌ | ✅ |
| `close()` | ✅ | ✅ | ❌(Instance has been closed) |

- **`checkpoint()`**: Writes index and metadata snapshots to files, which is the complete persistence point. You can recover from this point after a crash.
- **`flush()`**: Synchronize modified pages in memory to disk, but do not save index snapshots.
- **`close()`**: Automatically call checkpoint + flush, and then release resources.

## Best Practices

### Configuration suggestions

- **Time Interval Mode** — Suitable for scenarios where the writing rate is stable, 1-10 minutes is recommended.
- **Operation Count Mode** — Suitable for burst writing scenarios, it is recommended to trigger every 1000-50000 operations.
- Both modes can be turned on at the same time (OR logic), and it is recommended to use them in combination to cover different load modes.

### Regular checkpoint

```java
ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
scheduler.scheduleAtFixedRate(() -> {
    map.checkpoint();
    log.info("Checkpoint completed");
}, 0, 5, TimeUnit.MINUTES);  // every 5 minutes
```

### Notes

- `checkpoint()` is only valid in persistence mode
- Each checkpoint consumes file space to store index snapshots
- The space occupied by checkpoint can be reclaimed through [compact](./compact.md)

## Next step

- [Persistence and Crash Recovery ](./persistence.md) — Detailed explanation of persistence mechanism
- [Space Reclamation ](./compact.md) — Reclaim fragmented space
- [Configuration option ](./configuration.md) — Quick check of complete configuration parameters
