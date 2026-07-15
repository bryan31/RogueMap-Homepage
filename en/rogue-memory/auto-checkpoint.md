# Checkpoints and automatic checkpoints

`checkpoint()` is used to force persistence of the index to disk. After calling, even if the process crashes (`close()` is not called), the index can be loaded directly the next time the file is opened, avoiding full scan and reconstruction.

---

## Manual checkpoint

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .build();

// Write to memory
mem.add("Users like concise coding style", Map.of("type", "preference"), "user-1");
mem.add("The project deadline is next Friday", Map.of("type", "task"), "user-1");

// Create a checkpoint - a point from which you can recover after a crash
mem.checkpoint();

// Continue writing...
mem.add("User uses dark theme", Map.of("type", "preference"), "user-1");
// If it crashes at this time, restore to the state at the first checkpoint
```

### Suitable for the scene

- Long-running AI Agents need to be saved regularly to prevent lengthy full reconstruction after unexpected crashes
- After batch writing to memory, ensure that the data is persisted
- After important operations are completed, proactively establish a recovery point

---

## AutoCheckpoint

RogueMemory supports automatic checkpointing based on time intervals and number of operations, eliminating the need to manually call `checkpoint()`.

### Trigger by time interval

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // Automatic checkpoint every 5 minutes
    .build();
```

### Triggered by number of operations

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(1000)  // Automatic checkpoint every 1000 write operations
    .build();
```

### Both modes are enabled at the same time

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // time trigger
    .autoCheckpoint(1000)                // Triggered by number of operations
    // Execute checkpoint when any condition is met
    .build();
```

The write operations that trigger checkpoint include `add()`, `delete()`, and `update()`.

::: tip implementation details
- Use daemon thread pool (`ScheduledExecutorService`) to not block business threads.
- The operation counter uses CAS atomic operations to avoid repeated triggering.
- The automatic checkpoint thread is automatically stopped at `close()`.
:::

---

## checkpoint vs close

| Operations | Persistent Indexes | Crash Recovery | Continue Using |
|-----|-----------|---------|---------|
| `checkpoint()` | ✅ | ✅ | ✅ |
| `close()` | ✅ | ✅ | ❌(Instance has been closed) |

- **`checkpoint()`** — Write HNSW vector index, BM25 inverted index, ordinal registry to file, set `dirty` flag to 0. The instance can still be used.
- **`close()`** — Automatically perform checkpoint + flush and then release all resources. The instance is no longer available for use.

---

## Configuration suggestions

| Scenario | Recommended configuration | Description |
|------|---------|------|
| Long-term running Agent | `autoCheckpoint(5, TimeUnit.MINUTES)` | Suitable for scenarios with stable writing rate, recommended 1-10 minutes |
| Batch import data | `autoCheckpoint(5000)` | Suitable for burst writing, recommended every 500-5000 operations |
| Mixed load | Two types are turned on at the same time | Covering different load modes, triggering when any condition is met |

---

## Next step

- [Persistence and Operation ](./persistence.md) — File structure, recovery mechanism and space recycling
- [Storage structure and performance ](./storage-and-performance.md) — underlying storage details
