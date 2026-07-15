# Function matrix

This page is for "choose structure first, then look at capability boundaries".

## Overview of four structural capabilities

| Capabilities | RogueMap | RogueList | RogueSet | RogueQueue |
|---|---|---|---|---|
| Temporary Mode `temporary()` | ✅ | ✅ | ✅ | ✅ |
| Persistence `persistent(path)` | ✅ | ✅ | ✅ | ✅ |
| Automatic expansion `autoExpand` | ✅ | ✅ | ✅ | ✅ |
| Running indicators `getMetrics()` | ✅ | ✅ | ✅ | ✅ |
| Manual disk brush `flush()` | ✅ | ✅ | ✅ | ✅ |
| Explicit checkpoint `checkpoint()` | ✅ | ✅ | ✅ | ❌ (The linked list queue is automatically snapshotted by `offer/poll`) |
| Space compression `compact()` | ✅ | ✅ | ✅ | ✅ (only linked list queue) |
| Transactions | ✅ (`SegmentedHashIndex` only) | ❌ | ❌ | ❌ |
| Batch operation `putAll()`/`getAll()` | ✅ (1.1.7+, cross-bond atomicity is not guaranteed) | ❌ | ❌ | ❌ |
| `defaultTTL()` data expired | ✅ | ✅ | ✅ | ✅ |
| `autoCheckpoint()` AUTO CHECKPOINT | ✅ | ✅ | ✅ | ✅ |
| `lowHeapIndex()` Ultra-low heap index | ✅ (String keys only) | ❌ | ✅ (String elements only) | ❌ |
| Iteration capability | `forEach` | `Iterator` + `ListIterator` | `Iterator` (Fail-fast) | ❌ |

## Quick check of default parameters

| Project | Default |
|---|---|
| `RogueMap.allocateSize` | `2GB` |
| `RogueList.allocateSize` | `256MB` |
| `RogueSet.allocateSize` | `256MB` |
| `RogueQueue.allocateSize` | `256MB` |
| `RogueMap.segmentedIndex` | `64` segment |
| `RogueSet.segmentCount` | `64` segment |

## Selection suggestions (according to business goals)

1. Multikey atomic writes are required: Prioritize `RogueMap`, and keep the default segment index or explicit `segmentedIndex`.
2. Need to traverse sequentially and preserve insertion order: Prioritize `RogueList`.
3. The focus is on duplicate removal and existence judgment: give priority to `RogueSet`.
4. The focus is on FIFO consumption: Priority `RogueQueue`.

## Boundaries that are easy to step on

- `RogueMap` transaction does not support `basicIndex()` and `primitiveIndex()`.
- `RogueQueue.compact()` only supports linked list mode (`linked()`).
- `segmentCount`/`segmentedIndex` It is recommended to use a power of 2 for the number of segments.
- On persistence recovery, the codec must be consistent with the first write.
- `lowHeapIndex()` only supports String type keys/elements and does not support transactions (`beginTransaction()`).

## Next step

- [Getting started (10 minutes) ](./quick-start-path.md)
- [Configuration option ](./configuration.md)
- [FAQs and Troubleshooting ](./troubleshooting.md)
