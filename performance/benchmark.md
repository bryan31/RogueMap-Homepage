# 性能测试

本文档详细记录了 RogueMap 的性能测试结果和分析。

## 测试环境

- **硬件**: MacBook Pro (M3, 18GB)
- **Java 版本**: Java 8+
- **测试数据量**: 1,000,000 条记录
- **键值类型**: Long -> TestValueObject (含 10 个字段的值对象)

## RogueMap 多模式性能对比

### 综合指标

| 模式 | 写入 | 读取 | 写吞吐(ops/s) | 读吞吐(ops/s) | 堆内存(MB) |
|------|------|------|---------------|---------------|------------|
| HashMap模式 | 611ms | 463ms | 1,636,661 | 2,159,827 | 304.04 |
| OffHeap模式 | 658ms | 251ms | 1,519,756 | 3,984,063 | 40.46 |
| Mmap临时文件 | 629ms | 212ms | 1,589,825 | 4,716,981 | 40.13 |
| **Mmap持久化** | **547ms** | **195ms** | **1,828,153** | **5,128,205** | **40.01** |

### 性能图表

```
写入性能 (越低越好)
HashMap       ████████████ 611ms
OffHeap       █████████████ 658ms
Mmap Temp     ████████████ 629ms
Mmap Persist  ███████████ 547ms ⭐

读取性能 (越低越好)
HashMap       ███████████████████ 463ms
OffHeap       ████████ 251ms
Mmap Temp     ███████ 212ms
Mmap Persist  ██████ 195ms ⭐

堆内存占用 (越低越好)
HashMap       ████████████████████ 304.04MB
OffHeap       ███ 40.46MB
Mmap Temp     ███ 40.13MB
Mmap Persist  ███ 40.01MB ⭐
```

### 关键发现

#### 写入性能

- **最快**: Mmap 持久化模式 (547ms, 1,828,153 ops/s)
- **提升**: 比 OffHeap 快 20%
- **原因**: 操作系统页缓存优化 + 顺序写入

#### 读取性能

- **最快**: Mmap 持久化模式 (195ms, 5,128,205 ops/s)
- **提升**: 比 HashMap 快 **2.4 倍**
- **原因**: 内存映射零拷贝 + OS 优化

#### 内存占用

- **堆外模式**: 40 MB
- **HashMap**: 304 MB
- **节省**: **87%** 堆内存

## RogueMap vs MapDB

### 综合对比

| 实现方式 | 写入 | 读取 | 写吞吐(ops/s) | 读吞吐(ops/s) |
|---------|------|------|---------------|---------------|
| **RogueMap Mmap持久化** | **632ms** | **202ms** | **1,582,278** | **4,950,495** |
| MapDB 持久化 | 2,764ms | 3,207ms | 361,794 | 311,817 |
| **性能提升** | **4.4x** | **15.9x** | **4.4x** | **15.9x** |

### 性能对比图

```
写入性能对比
RogueMap  ████ 632ms
MapDB     ████████████████████ 2,764ms
性能提升: 4.4x ⚡

读取性能对比
RogueMap  ██ 202ms
MapDB     ████████████████████ 3,207ms
性能提升: 15.9x ⚡⚡⚡

吞吐量对比
写入:
  RogueMap  ████████████████ 1,582,278 ops/s
  MapDB     ████ 361,794 ops/s

读取:
  RogueMap  ████████████████████ 4,950,495 ops/s
  MapDB     ██ 311,817 ops/s
```

### 核心优势

| 维度 | RogueMap | MapDB | 优势 |
|-----|----------|-------|------|
| 写入速度 | 1,582,278 ops/s | 361,794 ops/s | **4.4x** |
| 读取速度 | 4,950,495 ops/s | 311,817 ops/s | **15.9x** |
| 堆内存 | 40 MB | 0.08 MB | 劣势 |
| 整体性能 | 极致 | 中等 | **显著优势** |

::: tip 性能权衡
MapDB 的堆内存占用更小，但这是以牺牲性能为代价的。RogueMap 使用更多堆内存来缓存元数据和索引，从而实现更高的吞吐量。
:::

## 详细性能分析

### 写入性能分析

**RogueMap Mmap 持久化模式**:
- 时间: 547ms
- 吞吐量: 1,828,153 ops/s
- 特点: 顺序写入 + 页缓存优化

**MapDB 持久化模式**:
- 时间: 2,764ms
- 吞吐量: 361,794 ops/s
- 差异: **4.4 倍性能差距**

### 读取性能分析

**RogueMap Mmap 持久化模式**:
- 时间: 195ms
- 吞吐量: 5,128,205 ops/s
- 特点: 零拷贝 + 内存映射

**MapDB 持久化模式**:
- 时间: 3,207ms
- 吞吐量: 311,817 ops/s
- 差异: **15.9 倍性能差距**

### 内存使用分析

**RogueMap**:
- 堆内存: 40 MB (索引 + 元数据)
- 堆外内存: 根据数据量
- 总体: 适中

**MapDB**:
- 堆内存: 0.08 MB
- 堆外内存: 根据数据量
- 总体: 极低

## 场景推荐

### 高性能场景 → RogueMap

```java
// 推荐使用 RogueMap
RogueMap<String, User> cache = RogueMap.<String, User>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .maxMemory(2 * 1024 * 1024 * 1024)
    .segmentedIndex(128)
    .build();

// 特点：
// ✅ 读取速度快 15.9 倍
// ✅ 写入速度快 4.4 倍
// ✅ 极致性能
```

### 极低内存场景 → MapDB

```java
// 极端内存受限环境
DB db = DBMaker.memoryDB().make();
HTreeMap<String, User> map = db.hashMap("cache").create();

// 特点：
// ✅ 堆内存占用极小
// ⚠️ 性能较低
```

## 性能优化建议

### 1. 选择最优模式

```java
// 高性能 + 持久化 → Mmap 持久化
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .build();

// 高性能 + 临时 → Mmap 临时文件
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .temporary()
    .build();

// 内存敏感 → OffHeap
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(512 * 1024 * 1024)
    .build();
```

### 2. 使用原始类型

```java
// 推荐 ✅ - 零拷贝
RogueMap<Long, Long> map = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 避免 ❌ - 序列化开销
RogueMap<String, String> map = RogueMap.<String, String>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

### 3. 合理预分配

```java
// 估算内存需求
long recordCount = 10_000_000;
int avgRecordSize = 200;
double overhead = 1.2;

long requiredMemory = (long) (recordCount * avgRecordSize * overhead);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(requiredMemory)
    .build();
```

### 4. 批量操作

```java
// 批量写入
Map<String, Long> batch = new HashMap<>();
for (int i = 0; i < 10000; i++) {
    batch.put("key" + i, (long) i);
}

// 一次性提交
for (Map.Entry<String, Long> entry : batch.entrySet()) {
    map.put(entry.getKey(), entry.getValue());
}
```

## 运行性能测试

### RogueMap 多模式对比

```bash
mvn test -Dtest=MemoryUsageComparisonTest
```

### RogueMap vs MapDB 对比

```bash
mvn test -Dtest=RogueMapVsMapDBComparisonTest
```

### 所有性能测试

```bash
mvn test -Dtest=*ComparisonTest
```

## 测试结论

### RogueMap 核心优势

1. **极致性能**
   - 写入速度比 MapDB 快 **4.4 倍**
   - 读取速度比 MapDB 快 **15.9 倍**

2. **灵活模式**
   - HashMap: 小数据量
   - OffHeap: 临时缓存
   - Mmap 临时: 临时处理
   - Mmap 持久: 持久化存储

3. **低 GC 压力**
   - 减少 **87%** 堆内存占用
   - 适合大数据量场景

4. **易用性**
   - 简洁的 Builder API
   - 自动资源管理
   - 类型安全

## 下一步

- [对比分析](./comparison.md) - 详细对比分析
- [性能优化](./optimization.md) - 性能优化技巧
- [最佳实践](../guide/best-practices.md) - 使用建议
