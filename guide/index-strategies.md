# 索引策略

RogueMap 提供了多种索引策略，每种策略都针对特定的使用场景进行了优化。

## 索引类型概览

| 索引类型 | 特点 | 适用场景 |
|---------|------|---------|
| BasicIndex | 简单高效 | 单线程或低并发 |
| SegmentedHashIndex | 高并发优化 | 高并发读写 |
| LongPrimitiveIndex | 内存优化 | Long 键，内存敏感 |
| IntPrimitiveIndex | 内存优化 | Integer 键，内存敏感 |
| LowHeapStringIndex | 超低堆占用 | String 键，堆内存极度敏感 |

## BasicIndex（基础索引）

### 概述

BasicIndex 基于 `ConcurrentHashMap` 实现，提供简单可靠的索引功能。

### 使用方式

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .basicIndex()
    .build();
```

### 特点

- ✅ 实现简单，稳定可靠
- ✅ 适合单线程或低并发场景
- ✅ 内存占用适中
- ⚠️ 高并发性能不如分段索引

### 适用场景

- 单线程应用
- 低并发场景
- 简单的键值存储

## SegmentedHashIndex（分段索引）

### 概述

SegmentedHashIndex 是 RogueMap 的**默认索引**，采用 64 个独立段 + StampedLock 乐观锁优化，专为高并发场景设计。

### 使用方式

```java
// 默认使用分段索引
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 或显式指定分段数
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64) // 64 个段
    .build();
```

### 并发机制

```
分段策略：
┌─────────┬─────────┬─────────┬─────────┐
│ Segment │ Segment │ Segment │ Segment │
│    0    │    1    │    2    │   ...   │
└─────────┴─────────┴─────────┴─────────┘
    ↓           ↓           ↓
StampedLock StampedLock StampedLock
（乐观读）  （乐观读）  （乐观读）
```

**乐观读流程**：
1. 获取乐观读戳
2. 读取数据
3. 验证读戳
4. 如果验证失败，降级为悲观读

### 特点

- ✅ **高并发性能** - 64 个段，减少锁竞争
- ✅ **乐观读优化** - 大部分读操作无锁
- ✅ **写性能优异** - 仅锁定单个段
- ✅ **默认选择** - 适合大多数场景

### 性能优势

相比 BasicIndex：
- 高并发读取性能提升 **3-5 倍**
- 高并发写入性能提升 **2-3 倍**

### 适用场景

- **高并发应用**（推荐）
- Web 应用缓存
- 多线程数据处理
- 大多数生产环境

## LongPrimitiveIndex（Long 原始索引）

### 概述

LongPrimitiveIndex 专为 Long 键优化，使用原始数组存储，大幅降低内存占用。

### 使用方式

```java
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex()
    .build();
```

::: warning 键类型限制
只能用于 `Long` 类型的键，其他类型会抛出异常。
:::

### 内存优化

**传统索引**：
```
HashMap<Long, Entry>
  ↓
每个 Entry 包含：
- Long 对象（24 字节）
- Entry 对象（32 字节）
- 引用（8 字节）
总计：64 字节/条
```

**原始索引**：
```
long[] keys
long[] addresses
int[] sizes
  ↓
每个条目：
- long key（8 字节）
- long address（8 字节）
- int size（4 字节）
总计：20 字节/条
```

**内存节省**：81% = (64 - 20) / 64

### 特点

- ✅ **极低内存占用** - 节省 81% 内存
- ✅ **高性能** - 原始数组访问快
- ✅ **StampedLock 优化** - 乐观读支持
- ⚠️ **仅支持 Long 键** - 类型限制

### 性能表现

| 指标 | SegmentedHashIndex | LongPrimitiveIndex | 提升 |
|-----|-------------------|-------------------|------|
| 内存占用 | 100 MB | 19 MB | 81% ↓ |
| 读性能 | 1000 万 ops/s | 950 万 ops/s | -5% |
| 写性能 | 800 万 ops/s | 750 万 ops/s | -6% |

### 适用场景

- Long 类型键
- 内存敏感应用
- 大数据量存储
- ID 映射表

## IntPrimitiveIndex（Integer 原始索引）

### 概述

IntPrimitiveIndex 专为 Integer 键优化，与 LongPrimitiveIndex 类似。

### 使用方式

```java
RogueMap<Integer, Integer> map = RogueMap.<Integer, Integer>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .primitiveIndex()
    .build();
```

::: warning 键类型限制
只能用于 `Integer` 类型的键。
:::

### 特点

- ✅ **极低内存占用** - 节省约 75% 内存
- ✅ **高性能** - 原始数组访问
- ✅ **StampedLock 优化** - 乐观读支持
- ⚠️ **仅支持 Integer 键** - 类型限制

### 适用场景

- Integer 类型键
- 内存敏感应用
- 索引映射表

## LowHeapStringIndex（超低堆索引）

### 概述

LowHeapStringIndex 是 String 键专用的超低堆索引。槽位表（slot table）和键字节全部存储在 mmap 文件中，JVM 堆上仅保留段元数据和锁。适用于需要存储海量 String 键但希望将 JVM 堆内存占用降到最低的场景。

### 工作原理

```
┌──────────────── mmap 文件（堆外）────────────────┐
│  ┌─────────────────────────────────────────────┐  │
│  │          Slot Table（32 字节/槽位）           │  │
│  │  ┌──────┬──────┬──────┬──────┬──────┐       │  │
│  │  │ hash │ key  │value │value │state │       │  │
│  │  │  FP  │offset│offset│ size │      │       │  │
│  │  │(8B)  │(8B)  │(8B)  │(4B)  │(4B)  │       │  │
│  │  └──────┴──────┴──────┴──────┴──────┘       │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │         Key Records（键字节数据）             │  │
│  │  [length: 4B][UTF-8 bytes: N bytes]          │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘

┌──── JVM 堆（极小）────┐
│  Segment[] (64 个段)  │
│  StampedLock × 64     │
│  段内元数据            │
└───────────────────────┘
```

- **32 字节固定大小槽位**：每个槽位包含 hash 指纹、键偏移、值偏移、值大小和状态标记
- **状态标记**：`EMPTY`（空）、`USED`（已使用）、`DELETED`（已删除）
- **开放寻址**：使用线性探测解决哈希冲突，超过 maxProbe 次探测自动扩容

### 使用方式

#### RogueMap 中使用

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/low-heap.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .build();
```

#### 自定义 LowHeapOptions

```java
import com.yomahub.roguemap.index.LowHeapOptions;

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/low-heap.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .lowHeapOptions(new LowHeapOptions(128, 0.75, 16))
    .build();
```

#### RogueSet 中使用

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .persistent("data/low-heap-set.db")
    .elementCodec(StringCodec.INSTANCE)
    .lowHeapIndex()
    .build();
```

### LowHeapOptions 配置

| 参数 | 默认值 | 说明 |
|-----|--------|------|
| `segmentCount` | 64 | 分段数量，必须是 2 的幂次方 |
| `loadFactor` | 0.80 | 负载因子，范围 (0.1, 0.95) |
| `maxProbe` | 16 | 最大探测次数，超过后自动扩容 |

### 监控指标

LowHeapStringIndex 提供了专用的监控方法，可通过 `StorageMetrics` 获取：

```java
StorageMetrics metrics = map.getMetrics();
long heapEstimate = metrics.getIndexHeapBytesEstimate();  // 堆内存估算
long mmapBytes = metrics.getIndexMmapBytes();             // mmap 占用
double avgKeyBytes = metrics.getAvgKeyBytes();            // 平均键长度
```

### 特点

- ✅ **超低堆占用** - 索引数据几乎全部在堆外，堆上仅约 `段数 × 256 + 1024` 字节
- ✅ **分段锁** - 64 段 StampedLock，支持高并发读写
- ✅ **乐观读** - 读操作优先尝试无锁乐观读
- ✅ **适合 RogueMap 和 RogueSet** - 两种数据结构均支持

::: warning 限制
- 仅支持 **String** 类型键/元素
- 不支持事务（`beginTransaction()`）
- 不自动迁移旧格式索引
:::

### 适用场景

- String 键，堆内存极度敏感
- 海量键值对存储
- 需要将 GC 压力降到最低的场景

## 索引选择指南

### 决策树

```
开始
  ↓
键是 Long 类型？
  ├─ 是 → 内存敏感？
  │        ├─ 是 → LongPrimitiveIndex ✅
  │        └─ 否 → SegmentedHashIndex ✅
  └─ 否 → 键是 Integer 类型？
           ├─ 是 → 内存敏感？
           │        ├─ 是 → IntPrimitiveIndex ✅
           │        └─ 否 → SegmentedHashIndex ✅
           └─ 否 → 键是 String 类型？
                    ├─ 是 → 堆内存极度敏感？
                    │        ├─ 是 → LowHeapStringIndex ✅
                    │        └─ 否 → 高并发场景？
                    │                 ├─ 是 → SegmentedHashIndex ✅
                    │                 └─ 否 → BasicIndex ✅
                    └─ 否 → 高并发场景？
                             ├─ 是 → SegmentedHashIndex ✅
                             └─ 否 → BasicIndex ✅
```

### 推荐配置

#### 场景 1: 高并发 Web 应用

```java
// 推荐：SegmentedHashIndex（默认）
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(64)
    .build();
```

#### 场景 2: 大量 Long ID 映射

```java
// 推荐：LongPrimitiveIndex
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex()
    .build();
```

#### 场景 3: 单线程数据处理

```java
// 推荐：BasicIndex
RogueMap<String, String> config = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .basicIndex()
    .build();
```

#### 场景 4: 内存敏感的大数据集

```java
// 推荐：LongPrimitiveIndex
RogueMap<Long, Record> records = RogueMap.<Long, Record>mmap()
    .persistent("records.db")
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .primitiveIndex()
    .build();
```

#### 场景 5: 海量 String 键，堆内存极度敏感

```java
// 推荐：LowHeapStringIndex
RogueMap<String, Long> counters = RogueMap.<String, Long>mmap()
    .persistent("counters.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .lowHeapIndex()
    .build();
```

## 性能对比

### 读性能对比（100 万次操作）

| 索引类型 | 单线程 | 4 线程 | 16 线程 |
|---------|--------|--------|---------|
| BasicIndex | 200ms | 180ms | 200ms |
| SegmentedHashIndex | 210ms | 120ms | 90ms |
| LongPrimitiveIndex | 195ms | 190ms | 195ms |
| LowHeapStringIndex | 230ms | 140ms | 100ms |

### 写性能对比（100 万次操作）

| 索引类型 | 单线程 | 4 线程 | 16 线程 |
|---------|--------|--------|---------|
| BasicIndex | 250ms | 280ms | 350ms |
| SegmentedHashIndex | 260ms | 180ms | 140ms |
| LongPrimitiveIndex | 255ms | 260ms | 260ms |
| LowHeapStringIndex | 280ms | 200ms | 160ms |

### 内存占用对比（100 万条目）

| 索引类型 | 索引内存 | 节省比例 |
|---------|----------|---------|
| BasicIndex | 100 MB | - |
| SegmentedHashIndex | 105 MB | -5% |
| LongPrimitiveIndex | 19 MB | 81% ↓ |
| LowHeapStringIndex | ~0.02 MB 堆 + mmap | 99%+ ↓（堆内存）|

## 注意事项

### SegmentedHashIndex

1. **段数选择** - 默认 64 段适合大多数场景
2. **内存开销** - 略高于 BasicIndex（约 5%）
3. **性能稳定** - 高并发下性能稳定

### LongPrimitiveIndex

1. **类型限制** - 仅支持 Long 键
2. **扩容开销** - 数组扩容需要复制
3. **并发限制** - 使用单锁，高并发性能不如 SegmentedHashIndex

### IntPrimitiveIndex

1. **类型限制** - 仅支持 Integer 键
2. **其他特性** - 与 LongPrimitiveIndex 类似

### LowHeapStringIndex

1. **类型限制** - 仅支持 String 键/元素
2. **不支持事务** - 不能与 `beginTransaction()` 配合使用
3. **不迁移旧索引** - 不自动迁移旧格式索引，需要重新构建

## 下一步

- [编解码器](./codecs.md) — 自定义数据序列化
- [并发控制](./concurrency.md) — 深入了解并发机制
- [配置选项](./configuration.md) — 详细配置说明
