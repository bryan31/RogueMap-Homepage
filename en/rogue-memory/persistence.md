# Persistence and operation and maintenance

All data in RogueMemory is stored persistently using mmap. This article introduces persistence recovery and space reclamation.

Regarding checkpoints and automatic checkpoints, please refer to [Checkpoints and Automatic Checkpoints ](./auto-checkpoint.md).

---

## File structure

After calling `persistent("data/mem")`, RogueMemory creates the following files:

| Documentation | Description |
|---|---|
| `data/mem.mem` | Master data file (mmap), 4KB file header + record data + ordinal registry + BM25 index |
| `data/mem.hnsw` | HNSW vector index |

### File header (4KB)

```
┌──────────────────────────────────────────┐
│ magic     │ 4B int  │ 0x524D4150 ("RMAP") │
│ version   │ 4B int  │ 2                    │
│ dataType  │ 4B int  │ 5 (MEMORY)           │
│ dirty │ 4B int │ 1=dirty, 0=clean │
│ ... │ Remaining │ Align and pad to 4KB │
└──────────────────────────────────────────┘
```

The `dirty` flag is set to 1 when `build()` is set, and is set to 0 after `close()` / `checkpoint()` is successful. Used to detect whether the last shutdown was normal.

---

## Persistence and recovery

### Normal shutdown

Automatically persist all indexes to disk when `close()`:

1. HNSW vector index serialization to `.hnsw` file
2. BM25 inverted index is serialized to the end of the `.mem` file
3. The ordinal registry (UUID → int mapping) is serialized to the end of the `.mem` file
4. `dirty` flag is set to 0

### Recovery mechanism

The next time you open it with the same path:

| Last status | Recovery method | Description |
|---|---|---|
| Normal shutdown (dirty=0) | Load index directly | Read BM25 and ordinal registry from end of file, load vector index from `.hnsw` file. Fastest |
| Abnormal exit (dirty=1) | Full scan and reconstruction | Scan all records, filter deleted and expired entries, and rebuild all indexes. Data is not lost, but opening is slower |

**In either case, the recorded data will not be lost** - the data is always written in the mmap file, and the operating system is responsible for flushing the disk.

---

## Space reclamation (compact)

RogueMemory's storage is based on append-only writing, and deletions and updates will generate waste space (tombstone records). When there is a lot of waste space, it can be recycled through `compact`:

```java
RogueMemory compacted = mem.compact(64 * 1024 * 1024);  // New file 64MB
```

### What does compact do?

1. Create a new mmap file
2. Only copy valid (not deleted, not expired) records to the new file
3. Rebuild all indexes (HNSW vector index + BM25 inverted index + ordinal registry)
4. Atomic replacement of old files

### How to use

`compact` returns a new `RogueMemory` instance, the old instance can still be used until explicitly closed.

```java
RogueMemory old = ...;
RogueMemory compacted = old.compact(64 * 1024 * 1024);

old.close();       // Shut down old instance
// Then use compacted
```

### When to compact

- After a large number of deletions
- Frequent updates lead to accumulation of old version records
- When disk space is tight

---

## TTL data expiration

### Current status

The storage layer of RogueMemory has reserved the `expireTime` field (8 bytes per record), and expired entries will be automatically skipped when searching and compacting. However, the current version of the public API does not yet expose the TTL setting method, and the `expireTime` default for all records is 0 (never expires).

This means:
- The storage format is ready, and future versions can directly set the expiration time of each memory through the API.
- Currently, if you need the expiration function, you can record the timestamp through metadata at the application layer and manually filter after retrieval.

---

## Builder options

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")               // Required: storage path
    .searchMode(SearchMode.HYBRID)        // Optional: search mode, default HYBRID
    .embeddingProvider(provider)           // Optional: Not required for KEYWORD_ONLY mode
    .allocateSize(64 * 1024 * 1024)       // Optional: pre-allocated file size, default 64MB
    .autoCheckpoint(5, TimeUnit.MINUTES)  // Optional: automatic checkpoint at time intervals
    .autoCheckpoint(1000)                 // Optional: Automatic checkpoint based on the number of operations
    .build();
```

| Options | Default | Description |
|---|---|---|
| `persistent(path)` | None (required) | Storage path without extension |
| `searchMode(mode)` | `HYBRID` | Search mode |
| `embeddingProvider(p)` | None | Vector service, KEYWORD_ONLY can be omitted |
| `allocateSize(size)` | `64MB` | Pre-allocated mmap file size |
| `autoCheckpoint(interval, TimeUnit)` | Not enabled | Automatic checkpoint by time interval |
| `autoCheckpoint(count)` | Not enabled | Automatic checkpoint based on the number of write operations |

---

## Complete example: AI Agent with persistence

```java
public class AgentMemory {
    private final RogueMemory memory;

    public AgentMemory(String apiKey, String userId) {
        memory = RogueMemory.mmap()
            .persistent("data/agent-" + userId)
            .searchMode(SearchMode.HYBRID)
            .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
            .autoCheckpoint(5, TimeUnit.MINUTES)  // Automatic persistence every 5 minutes
            .autoCheckpoint(500)                   // Or automatically persist every 500 writes
            .build();
    }

    /** Remember a message*/
    public void remember(String content, String type) {
        memory.add(content, Map.of("type", type), "agent");
    }

    /** Recall relevant information*/
    public List<MemoryResult> recall(String query, int topK) {
        return memory.search(query, topK,
            SearchOptions.builder()
                .namespace("agent")
                .build());
    }

    /** Save regularly*/
    public void save() {
        memory.checkpoint();
    }

    /** Close*/
    public void close() {
        memory.close();
    }
}
```

Use:

```java
AgentMemory am = new AgentMemory(apiKey, "user-001");

am.remember("Users like concise coding style", "preference");
am.remember("The project deadline is next Friday", "task");

// next conversation
List<MemoryResult> results = am.recall("coding style", 3);
for (MemoryResult r : results) {
    System.out.println("[memory]" + r.getContent());
}

am.save();   // Save regularly
am.close();  // Automatically persist on shutdown
```

## Next step

- [Storage structure and performance ](./storage-and-performance.md) — underlying storage details and algorithm parameters
- [Data Operations ](./data-operations.md) — Complete CRUD API Reference
