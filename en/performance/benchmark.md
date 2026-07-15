# RogueMap Performance White Paper

## Overview

RogueMap is a high-performance embedded key-value storage engine that focuses on solving the pain points of limited heap memory and data persistence in Java applications. This document will objectively and comprehensively demonstrate the performance of RogueMap and explain its design trade-offs.

## Design Concept: Impossible Triangle of Choice

There is a classic "impossible triangle" in the field of key-value storage:

```
        ultimate speed
           /\
          /  \
         /    \
        /      \
       /________\
  Storage breakthrough concurrency safety
```

**Three Dimensions**:
1. **Ultimate Speed** - Pure memory operations, no serialization overhead (such as HashMap, FastUtil)
2. **Storage Breakthrough** - Break through the JVM heap memory limit and support disk mapping and persistence
3. **Concurrency Safety** - Thread safety, supports high concurrent reading and writing

**Only two of the three can be chosen**:
- HashMap/FastUtil: Choose "speed + concurrency safety" and abandon "storage breakthrough"
- RogueMap: Choose "storage breakthrough + concurrency safety" to make a trade-off in speed

### Why does RogueMap choose the latter two?

The core pain points faced by modern Java applications:

1. **Limited heap memory** - Large data volume leads to frequent Full GC and application lags
2. **Data is volatile** - all data will be lost when the process is restarted
3. **High memory cost** - The cost of heap memory expansion is much higher than that of disk

These problems cannot be solved by pure memory solutions such as HashMap, FastUtil, and Caffeine. Therefore, RogueMap selects:

- ✅ **Storage Breakthrough** - Based on memory mapped files (mmap), reducing heap memory usage by 84.7%
- ✅ **Concurrency Safety** - 64-segment segment lock + StampedLock optimistic lock
- ⚠️ **Speed Tradeoff** - Reading involves serialization, which is about 1/4 of HashMap

### but still very fast

Despite the trade-offs, RogueMap puts a lot of effort into speed optimization:

1. **Write Optimization** - Only writes the index without writing data, **1.45 times faster than HashMap**
2. **Zero-copy serialization** - Direct memory layout of primitive types
3. **Slab memory allocator** - 7 size classes to reduce fragmentation
4. **Segment lock optimization** - 64 segments concurrency, reducing lock competition
5. **Operating System Optimization** - mmap page cache acceleration

**Results**: On a Linux 2C4G machine, RogueMap read throughput reached **1.55 million ops/s**. This performance:
- **15.6x faster** than Redis Network (Redis Network: 100,000 ops/s)
- **1.56x faster** than Redis local (Redis local: 1,000,000 ops/s)
- **12.0x faster** than MapDB (MapDB: 129,718 ops/s)
- Meets most business scenarios

## Test environment

**Hardware Configuration**:
- CPU: Linux 2 cores
- Memory: 4GB
- Storage: SSD

**Test data**:
- Data volume: 1 million records
- Object structure: PO value object containing 10 attributes
- Test type: sequential write + random read

**Performance Data Description**:
- **RogueMap, HashMap, FastUtil, Caffeine**: measured data, based on real test results
- **MapDB**: measured data, based on real test results (from independent performance testing)
- **Redis Local**: Estimate, based on typical performance of Unix socket local communication (~1μs latency)
- **Redis Network**: Estimate, based on typical performance of TCP/IP network communication (~100μs latency)

## Complete performance comparison

### Comprehensive performance

Based on Linux 2C4G server, 1 million data test results:

| Scenario | Write time | Read time | Write throughput | Read throughput | Heap memory usage | Persistence |
|-----|----------|----------|----------|----------|-----------|--------|
| **HashMap** | 1,535ms | **158ms** | 651,465 ops/s | **6,329,113 ops/s** | 311.31 MB | ❌ |
| **FastUtil** | **600ms** | **32ms** | **1,666,666 ops/s** | **31,250,000 ops/s** | 275.69 MB | ❌ |
| **Caffeine** | 1,107ms | 2,298ms | 903,342 ops/s | 435,161 ops/s | 351.69 MB | ❌ |
| **RogueMap Mmap Persistence** | **1,057ms** | **642ms** | **946,073 ops/s** | **1,557,632 ops/s** | **47.63 MB** | ✅ |
| **RogueMap Mmap Temporary** | 1,113ms | 704ms | 898,472 ops/s | 1,420,454 ops/s | **47.66 MB** | ❌ |
| **MapDB OffHeap** | 8,259ms | 8,451ms | 121,080 ops/s | 118,329 ops/s | 11.14 MB | ❌ |
| **MapDB Temporary Files** | 9,002ms | 7,717ms | 111,086 ops/s | 129,584 ops/s | 7.71 MB | ❌ |
| **MapDB Persistence** | 8,117ms | 7,709ms | 123,198 ops/s | 129,718 ops/s | 7.71 MB | ✅ |
| **Redis (local)** | ~1500ms | ~1000ms | ~666,667 ops/s | ~1,000,000 ops/s | 0 MB (external service) | ✅ |
| **Redis (Network)** | ~15000ms | ~10000ms | ~66,667 ops/s | ~100,000 ops/s | 0 MB (External Service) | ✅ |

### Performance visualization

#### 📊 Write performance ranking (lower is better)

| Ranking | Solutions | Time Elapsed | Performance Rating | Relative Benchmark |
|------|------|------|----------|----------|
| 🥇 | FastUtil | 600ms | ⭐⭐⭐⭐⭐ | 1.0x (fastest) |
| 🥈 | RogueMap (persistence mode) | 1,057ms | ⭐⭐⭐⭐ | 1.8x |
| 🥉 | Caffeine | 1,107ms | ⭐⭐⭐⭐ | 1.8x |
| 4 | RogueMap (Temporary file mode) | 1,113ms | ⭐⭐⭐⭐ | 1.9x |
| 5 | Redis (local) | 1,500ms | ⭐⭐⭐ | 2.5x |
| 6 | HashMap | 1,535ms | ⭐⭐⭐ | 2.6x |
| 7 | MapDB (persistent mode) | 8,117ms | ⭐ | 13.5x |
| 8 | MapDB (off-heap memory mode) | 8,259ms | ⭐ | 13.8x |
| 9 | MapDB (Temporary File Mode) | 9,002ms | ⭐ | 15.0x |
| 10 | Redis(network) | 15,000ms | ⭐ | 25.0x |

#### 📊 Read performance ranking (lower is better)

| Ranking | Solutions | Time Elapsed | Performance Rating | Relative Benchmark |
|------|------|------|----------|----------|
| 🥇 | FastUtil | 32ms | ⭐⭐⭐⭐⭐ | 1.0x (fastest) |
| 🥈 | HashMap | 158ms | ⭐⭐⭐⭐⭐ | 4.9x |
| 🥉 | RogueMap (persistence mode) | 642ms | ⭐⭐⭐ | 20.1x |
| 4 | RogueMap (temporary file mode) | 704ms | ⭐⭐ | 22.0x |
| 5 | Redis (local) | 1,000ms | ⭐⭐ | 31.3x |
| 6 | Caffeine | 2,298ms | ⭐ | 71.8x |
| 7 | MapDB (persistent mode) | 7,709ms | ⭐ | 240.9x |
| 8 | MapDB (Temporary file mode) | 7,717ms | ⭐ | 241.2x |
| 9 | MapDB (off-heap memory mode) | 8,451ms | ⭐ | 264.1x |
| 10 | Redis(network) | 10,000ms | ⭐ | 312.5x |

#### 💾 Heap memory usage ranking (the lower, the better)

| Ranking | Plans | Memory usage | Performance ratings | Relative benchmarks |
|------|------|----------|----------|----------|
| 🥇 | MapDB (Temporary file mode) | 7.71 MB | ⭐⭐⭐⭐⭐ | 1.0x (optimal) |
| 🥇 | MapDB (persistent mode) | 7.71 MB | ⭐⭐⭐⭐⭐ | 1.0x |
| 🥈 | MapDB (off-heap memory mode) | 11.14 MB | ⭐⭐⭐⭐⭐ | 1.4x |
| 🥉 | RogueMap (persistence mode) | 47.63 MB | ⭐⭐⭐⭐⭐ | 6.2x |
| 4 | RogueMap (Temporary file mode) | 47.66 MB | ⭐⭐⭐⭐⭐ | 6.2x |
| 5 | FastUtil | 275.69 MB | ⭐⭐ | 35.8x |
| 6 | HashMap | 311.31 MB | ⭐⭐ | 40.4x |
| 7 | Caffeine | 351.69 MB | ⭐ | 45.6x |

::: tip 💡 Key findings
- **The fastest persistence solution**: RogueMap (persistence mode) has the best performance among all solutions that support persistence
  - Write: 1,057ms, 31% faster than HashMap (1,535ms), 7.7 times faster than MapDB (8,117ms)
  - Read: 642ms (1.55 million ops/s), 12 times faster than MapDB (7,709ms), 15.6 times faster than Redis network (10,000ms)
- **Memory usage greatly optimized**: RogueMap (47.63 MB) saves 84.7% of heap memory than HashMap (311.31 MB)
- **The highest overall cost-effectiveness**: achieve the best balance in the three aspects of persistence + performance + memory
:::

## In-depth analysis

### The core advantages of RogueMap

#### 1. Heap memory usage reduced by 84.7%

**Compare HashMap**:
- HashMap: 311.31 MB
- RogueMap: 47.63 MB
- **Saving**: 263.68 MB (84.7%)

**Meaning**:
- Significantly reduces GC pressure and reduces application lags
- Supports larger data volume (more than 6.5 times)
- Avoid OOM risks

#### 2. Write performance improved by 1.45 times

**Compare HashMap**:
- HashMap: 1,535ms (651,465 ops/s)
- RogueMap Mmap: 1,057ms (946,073 ops/s)
- **Improvement**: 1.45 times

**Reason**:
- Only writes the index, not the data (delayed serialization)
- mmap page cache optimization
- Sequential write optimization

#### 3. Million-level read throughput

**RogueMap Mmap persistence**:
- Reading time: 642ms
- Read throughput: **1,557,632 ops/s** (1.55 million ops/s)
- Single read latency: approximately **0.64 μs**

**Comparison**:
- About 4 times slower than HashMap (because of deserialization involved)
- But 1.55 million ops/s is already very good for 2C4G machines**
- **15.6x faster** than Redis (Network) (Redis Network: 100,000 ops/s)
- **1.56x faster** than Redis (local) (Redis local: 1,000,000 ops/s)
- **12.0x faster** than MapDB (MapDB average: 129,718 ops/s)

#### 4. Best performance among similar persistence solutions

**Persistence solution comparison**:

| Solution | Persistence | Write throughput | Read throughput | Performance synthesis |
|-----|--------|----------|----------|---------|
| HashMap | ❌ | 651,465 | 6,329,113 | Pure memory, does not support persistence |
| FastUtil | ❌ | 1,666,666 | 31,250,000 | Pure memory, does not support persistence |
| Caffeine | ❌ | 903,342 | 435,161 | Pure memory, does not support persistence |
| **RogueMap Mmap** | ✅ | **946,073** | **1,557,632** | **Fastest among persistence solutions** |
| MapDB Persistence | ✅ | 123,198 | 129,718 | RogueMap is **7.7x faster for writes, 12.0x faster for reads** |
| Redis (local) | ✅ | ~666,667 | ~1,000,000 | External service, network communication required |
| Redis (Network) | ✅ | ~66,667 | ~100,000 | Large network overhead |

**Key Findings**:
- RogueMap is the only solution that simultaneously meets the requirements of high performance + persistence + embeddedness
- **7.7x faster** for writes and **12.0x** faster for reads than MapDB
- Slightly faster than local Redis calls and does not require external services

## Next step

- [QUICK START ](../guide/getting-started.md) - Get started with RogueMap in 5 minutes
- [Storage Mode ](../guide/storage-modes.md) - Understand the differences between the two storage modes
- [Best Practice ](../guide/best-practices.md) - Recommendations for use in production environments
- [GitHub repository ](https://github.com/bryan31/RogueMap) - View source code and examples
