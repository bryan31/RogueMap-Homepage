# Frequently Asked Questions and Troubleshooting

This document focuses on high-frequency problems in the use of RogueMap, and gives priority to troubleshooting steps that can be implemented directly.

## 1. Transaction example compilation failed

### Phenomenon

The compiler prompts that `RogueMap.Transaction` cannot be found.

### Reason

The current version `beginTransaction()` returns `RogueMapTransaction<K, V>`.

### Correct writing

```java
import com.yomahub.roguemap.RogueMapTransaction;

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("k1", 1L);
    txn.put("k2", 2L);
    txn.commit();
}
```

## 2. Transaction call throws UnsupportedOperationException

### Phenomenon

Calling `beginTransaction()` throws an exception, indicating that only `SegmentedHashIndex` is supported.

### Reason

You may have used `basicIndex()` or `primitiveIndex()`.

### Processing method

Use default index or set it explicitly:

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64)
    .build();
```

## 3. Reading exception or incorrect data after restarting

### Phenomenon

After restarting, reading fails, the data is garbled, or an exception is thrown.

### Reason

The same persistent file uses different codecs on restart.

### Processing method

- Make sure to use the same `keyCodec` and `valueCodec` before and after
- If you want to change the codec, migrate to the new file first (the old file is read according to the original codec and then written to the new file)

## 4. File type mismatch

### Phenomenon

When opening the file it says data type mismatch (e.g. expected MAP, actual LIST/SET/QUEUE).

### Reason

The same file path is reused by different data structures.

### Processing method

- Ensure that a file is only used by one structure
- It is recommended to split the path by structure, for example:
  - `data/users.map.db`
  - `data/events.list.db`
  - `data/ids.set.db`
  - `data/tasks.queue.db`

## 5. Why cannot use keySet()/entrySet() or getAllEntries()

### Description

RogueMap currently does not provide `keySet()` / `entrySet()` / `getAllEntries()`.

### Available alternatives

Use `forEach` to traverse:

```java
map.forEach((key, value) -> {
    // your logic
});
```

If the key set is known, `getAll(keys)` batch reading is available since 1.1.7:

```java
Map<String, Long> found = map.getAll(Arrays.asList("key1", "key2", "key3"));
```

## 6. The old instance reports an error after compact()

### Phenomenon

An exception occurs when continuing to use the old object after calling `compact()`.

### Reason

`compact()` A new instance will be returned and the old instance will be closed.

### Correct writing

```java
map = map.compact(512L * 1024 * 1024);
```

## 7. Why suddenly OutOfMemoryError (allocation failed)

### Common reasons

- Insufficient file space
- `autoExpand(false)` and the preallocated space is too small
- `maxFileSize` cap set and topped out

### Troubleshooting suggestions

1. View `map.getMetrics().getAvailableBytes()`
2. Turn on automatic expansion and set a reasonable upper limit
3. Check available disk space

## 8. What is the default capacity?

Different structures have different default `allocateSize`:

- `RogueMap` Default `2GB`
- `RogueList` Default `256MB`
- `RogueSet` Default `256MB`
- `RogueQueue` Default `256MB`

It is recommended to explicitly configure `allocateSize` and `autoExpand` in the production environment to avoid misjudgments caused by implicit default values.

## 9. Data unexpectedly returned null

### Phenomenon

The data is obviously written, but `get()` returns `null`.

### Possible reasons

1. The data has expired (TTL expired) and was deleted lazily.
2. The file is damaged in persistence mode.

### Solution

- Check whether `defaultTTL()` is set and confirm whether the expiration time is reasonable.
- Use `put(key, value, ttl, unit)` to set a longer expiration time for a single piece of data.

## 10. autoCheckpoint does not take effect

### Phenomenon

Configured `autoCheckpoint()` but lost data after crash.

### Possible reasons

1. The temporary mode (`temporary()`) is used, and the automatic checkpoint only takes effect in the persistent mode.
2. The checkpoint interval is too long and the crash occurs between two checkpoints.

### Solution

- Confirm using `persistent(path)` mode.
- Shorten the checkpoint interval or lower the operation threshold.
- Manually call `checkpoint()` after critical operations.

## 11. lowHeapIndex() is incompatible with transactions

### Phenomenon

Calling `beginTransaction()` after using `lowHeapIndex()` throws `UnsupportedOperationException`.

### Reason

`lowHeapIndex()` Transactions are not supported. Transactions are only available under `segmentedIndex()`.

### Solution

- For transaction support, use the default `segmentedIndex(64)` instead or specify `.segmentedIndex(64)` explicitly.

## 12. The difference between checkpoint() and flush()

**`checkpoint()`**: Writes index and metadata snapshots to files, which is the complete persistence point. You can recover from this point after a crash.

**`flush()`**: Synchronize modified pages in memory to disk, but do not save index snapshots.

**Recommendation**: Use `checkpoint()` when crash recovery protection is needed; `close()` will automatically call both.
