# Storage structure and performance

This article introduces the underlying storage structure, core algorithm parameters, and performance characteristics of RogueMemory.

---

## File structure

After calling `persistent("data/mem")`, RogueMemory creates two files:

| Documentation | Description |
|---|---|
| `data/mem.mem` | Master data file (mmap), including 4KB file header + record data + ordinal registry + BM25 index |
| `data/mem.hnsw` | HNSW vector index file (independent storage) |

---

## Record storage structure

Each memory is written to the mmap file in append-only mode, and the binary layout is as follows:

```
┌──────────────────────────────────────────────────┐
│ expireTime │ 8B long │ Expiration timestamp, 0=never expires │
│ id (MSB) │ 8B long │ UUID high bit │
│ id (LSB) │ 8B long │ UUID low bit │
│ ns_len │ 2B short │ Namespace byte length │
│ namespace │ ns_len B │ UTF-8 namespace │
│ content_len │ 4B int │ Content byte length │
│ content │ content_len B │ UTF-8 memory content │
│ meta_len │ 4B int │ Metadata byte length │
│ metadata │ meta_len B │ Encoded key-value pair metadata │
│ vector_len │ 4B int │ Number of vector dimensions │
│ vector │ vector_len × 4B │ float32 vector data │
│ deleted │ 1B byte │ 0=valid, 1=deleted (tombstone) │
│ createdAt │ 8B long │ Creation timestamp (epoch ms) │
└──────────────────────────────────────────────────┘
```

### Metadata encoding

```
┌────────────────────────────────────────┐
│ pair_count │ 2B short │ Number of key-value pairs │
│ Per pair: │
│   key_len   │ 2B short │               │
│   key       │ key_len B │ UTF-8        │
│   val_len   │ 2B short │               │
│   val       │ val_len B │ UTF-8        │
└────────────────────────────────────────┘
```

### Fixed overhead

Fixed overhead of **47 bytes** per record (excluding namespace, content, metadata, variable length parts of the vector):

```
8 + 16 + 2 + 4 + 4 + 4 + 1 + 8 = 47 bytes
```

### Storage estimation example

One memory: content 50 bytes Chinese, no metadata, 1536-dimensional vector:

```
47 + 50 (content) + 2 (empty metadata) + 1536 × 4 (vector) = 6,235 bytes ≈ 6KB
```

100,000 such memories take up approximately **600MB** of disk space.

---

## Vector Index — HNSW

RogueMemory uses the **HNSW (Hierarchical Navigable Small World)** algorithm for approximate nearest neighbor (ANN) search, implemented based on `hnswlib-core`.

### Algorithm parameters

| Parameter | Value | Description |
|---|---|---|
| M | 16 | Maximum number of connections per node per layer |
| efConstruction | 200 | Dynamic candidate list size at build time |
| ef | 50 | Dynamic candidate list size when searching |
| Distance measure | Cosine distance | `1 - cosine_similarity` |

These parameters provide a good balance between accuracy and performance:
- `M=16` provides sufficient graph connectivity while controlling index size
- `efConstruction=200` ensures build quality, builds slightly slower but only takes once
- `ef=50` returns high-quality results while maintaining millisecond latency when searching

### Vectors are stored outside the heap

Key design: Vector data is stored directly in mmap files, **does not occupy JVM heap memory**. The HNSW index node only holds an mmap address offset (8 bytes) of type `long`, and the float array is directly read from mmap through `Unsafe` when calculating distance.

This means that even when storing 1 million 1536-dimensional vectors (~6GB of raw data), the JVM heap memory increase is minimal.

### Search process

```
search(query, topK)
  │
  ├─ embed(query) // Call the Embedding API to obtain the query vector
  ├─ hnswIndex.findNearest(qv, candidates) // ANN search
  │ └─ candidates = topK × 4 + deletedCount + 10 // Excess recall compensation tombstone
  ├─ Filter deleted and expired entries
  └─ Return topK results
```

---

## Keyword Index — BM25

RogueMemory uses the **BM25** algorithm for keyword retrieval, which is parallel to the vector retrieval dual channel.

### Algorithm parameters

| Parameter | Value | Description |
|---|---|---|
| k1 | 1.2 | Word frequency saturation parameter, controlling the upper limit of the impact of word frequency on scores |
| b | 0.75 | Document length normalization parameter, controlling the penalty for long documents |

### Chinese word segmentation

BM25's word segmentation strategy **automatically switches** according to the text language:

- **Chinese (CJK text)**: bigram (two-character sliding window). For example, "User Preferences" is divided into `["用户", "户偏", "偏好"]`
- **English/Other**: space segmentation + lowercase

Automatic detection standard: If CJK characters account for more than 50% of non-whitespace characters, it is determined to be Chinese text.

No additional word segmentation dependencies, no need to install a dictionary or word segmentation plug-in.

### BM25 scoring formula

```
IDF = log((N - df + 0.5) / (df + 0.5) + 1)
tfNorm = (tf × (k1 + 1)) / (tf + k1 × (1 - b + b × dl / avgDl))
score = Σ (IDF × tfNorm) // Sum each term in the query
```

Among them:
- N = total number of active documents
- df = number of documents containing the term
- tf = the number of occurrences of the term in the document
- dl = document length (number of tokens)
- avgDl = average document length

---

## Hybrid retrieval—RRF fusion

In `HYBRID` mode, the vector channel and keyword channel each return `topK × 4` candidates, merged through **Reciprocal Rank Fusion (RRF)**:

```
RRF_score[id] = Σ  1 / (C + rank + 1)
```

Default constant C = 60 (adjustable via `SearchOptions.rrfConstant()`).

**Effect**: Entries that appear in both channels at the same time get higher scores, taking into account semantic similarity and keyword matching.

---

## Performance Features

### Write

| Operations | Features |
|---|---|
| `add()` | Append write mmap, O(1); insert node into HNSW graph, O(log n); add document to BM25 inverted index |
| `update()` | Append new record + old record tombstone, vector re-embedding (1 Embedding API call) |
| `delete()` | Mark tombstone (soft delete), O(1) |

### Read

| Operations | Features |
|---|---|
| `search()` HYBRID | HNSW ANN search + BM25 retrieval parallel + RRF fusion, latency mainly depends on Embedding API response time |
| `search()` VECTOR_ONLY | Pure HNSW ANN search, skipping BM25 |
| `search()` KEYWORD_ONLY | Pure BM25, **No Embedding API calls**, extremely low latency |
| `get()` | Read mmap records directly by ID, O(1) |

### Memory

| Data | Storage location |
|---|---|
| Memory content + vector | mmap file (off-heap) |
| HNSW Figure Index | `.hnsw` File (off-heap) |
| BM25 inverted index | mmap file tail (off-heap) |
| HNSW node pointer | JVM heap (~8 byte offset per node) |
| Ordinal registry | JVM heap (UUID → int mapping) |

**Core conclusion**: Most data is stored outside the heap, and the JVM heap memory footprint is much lower than that of traditional vector database clients. The main overhead on the heap comes from HNSW's Java object and ordinal mapping tables, which are linearly related to the number of entries.

### Main latency bottleneck

- **Write**: Embedding API call (network I/O), usually 10-100ms/time
- **Search**: Embedding API call (1 time) + HNSW search + BM25 search, where Embedding API is usually the main bottleneck
- **KEYWORD_ONLY mode**: No Embedding API calls, latency is purely local BM25 calculation

---

## Relationship with roguemap-memory-pro

`roguemap-memory` uses `hnswlib-core` (a Java HNSW implementation based on jelmerk), and `roguemap-memory-pro` uses `jvector` (a high-performance vector search library based on DataStax). The public APIs of the two are exactly the same, but the internal vector index implementation is different.

| | roguemap-memory | roguemap-memory-pro |
|---|---|---|
| Vector Index | `hnswlib-core` | `jvector` |
| Graph construction | Immediate construction (when adding) | Delayed construction (batch construction during the first search) |
| Writing performance | Update the graph every time add | Extremely fast (only record vectors, do not update the graph) |
| First time search | No additional overhead | Requires graph building (one-time only) |
| Applicable scenarios | Need to search immediately after writing | Centralized search after batch writing |

## Next step

- [Persistence and Operations ](./persistence.md) — Learn about persistence recovery, checkpoints, and space reclamation
- [Search mode ](./search-modes.md) — Detailed explanation of the three search modes
