# Introduction

## What is RogueMap?

`RogueMap` is an embedded storage engine for Java.
It provides four off-heap data structures based on memory mapped files (mmap), with the goal of allowing you to obtain lower GC pressure and durability while maintaining the ease of use of the Java API.

## What you get

- Lower heap memory usage and reduce Full GC risk.
- Optional persistence, data can be restored after the process is restarted.
- High concurrent reading and writing capabilities (segmented index + optimistic reading).
- Unified Builder style, four structures with low learning cost.
- TTL data expiration, expired data can be automatically eliminated without external cache.
- Automatic checkpoint (AutoCheckpoint), automatic persistence based on time or number of operations.
- Ultra-low heap index (LowHeapStringIndex), which also moves the index outside the heap to further reduce GC pressure.

## Four data structures

| Structure | Main uses | Common operations |
|---|---|---|
| `RogueMap<K, V>` | Key-value storage, cache, state table | `put/get/remove` |
| `RogueList<E>` | Sequential data, log stream | `addLast/get/removeLast` |
| `RogueSet<E>` | Deduplication, tags, blacklists | `add/contains/remove` |
| `RogueQueue<E>` | Task consumption, message processing | `offer/poll/peek` |

## Two storage modes

1. `temporary()`: Temporary file mode, suitable for batch processing and intermediate data.
2. `persistent(path)`: Persistence mode, suitable for data that needs to be restarted and restored.

## Use boundaries

Suitable for:

- Scenarios of more writing and less reading or balanced reading and writing.
- Scenarios where the data size may exceed the JVM heap limit.
- I hope to use an embedded solution to avoid dependence on external storage.

Not suitable for:

- Pure memory scenarios that are extremely read-intensive and pursue the lowest read latency.
- Scenarios that require distributed consistency and multi-node replication.

## Where to start

1. [Getting started (10 minutes) ](./quick-start-path.md)
2. [QUICK START](./getting-started.md)
3. [Configuration option ](./configuration.md)
