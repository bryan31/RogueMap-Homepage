# 存储模式

RogueMap 支持三种存储模式，每种模式都有其特定的使用场景和优势。

## OffHeap 模式（堆外内存）

### 概述

OffHeap 模式将数据存储在 JVM 堆外内存中，通过 `sun.misc.Unsafe` API 直接操作本地内存。

### 使用方式

```java
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(100 * 1024 * 1024) // 100MB
    .build();
```

### 配置选项

```java
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    // 必需配置
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .maxMemory(1024 * 1024 * 1024) // 最大内存 (默认 1GB)

    // 索引策略（三选一）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引 (默认)
    .primitiveIndex()             // 使用原始索引（仅Long/Integer键）

    .build();
```

### 优势

- ✅ **降低 GC 压力** - 减少 84.7% 堆内存占用
- ✅ **高性能** - 写入速度快于 HashMap
- ✅ **避免 OOM** - 不受堆内存限制
- ✅ **简单易用** - API 简洁明了

### 劣势

- ⚠️ **内存限制** - 受 `-XX:MaxDirectMemorySize` 限制
- ⚠️ **无持久化** - 应用重启后数据丢失

### 适用场景

- 高性能缓存
- 内存敏感应用
- 需要降低 GC 压力的场景
- 临时数据存储

### 性能表现

在 100 万条数据测试中（Linux 2C4G 服务器）：

| 指标 | 性能 |
|-----|------|
| 写入时间 | 1,924ms |
| 读取时间 | 854ms |
| 写吞吐量 | 519,750 ops/s |
| 读吞吐量 | 1,170,960 ops/s |
| 堆内存占用 | 47.81 MB |

## Mmap 临时文件模式

### 概述

Mmap 临时文件模式使用内存映射临时文件，JVM 关闭后自动删除文件。

### 使用方式

```java
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(500 * 1024 * 1024L) // 500MB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 配置选项

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .temporary()                  // 临时文件模式
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(10L * 1024 * 1024 * 1024) // 预分配大小 (默认 10GB)

    // 索引策略（三选一）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引 (默认)
    .primitiveIndex()             // 使用原始索引（仅Long/Integer键）

    .build();
```

### 优势

- ✅ **超大容量** - 支持远超内存的数据量
- ✅ **自动清理** - JVM 关闭后自动删除
- ✅ **高性能** - 综合性能优异
- ✅ **低内存占用** - 堆内存占用极低

### 劣势

- ⚠️ **磁盘空间** - 需要足够的磁盘空间
- ⚠️ **无持久化** - 数据不保留

### 适用场景

- 大数据量临时处理
- 数据分析和转换
- 批处理任务
- 需要超大容量的临时存储

### 性能表现

在 100 万条数据测试中（Linux 2C4G 服务器）：

| 指标 | 性能 |
|-----|------|
| 写入时间 | 1,113ms |
| 读取时间 | 704ms |
| 写吞吐量 | 898,472 ops/s |
| 读吞吐量 | 1,420,454 ops/s |
| 堆内存占用 | 47.66 MB |

## Mmap 持久化模式

### 概述

Mmap 持久化模式将数据持久化到磁盘文件，支持数据恢复和长期存储。

### 使用方式

```java
// 第一次：创建并写入数据
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map1.put("alice", 100L);
map1.put("bob", 200L);
map1.flush(); // 刷新到磁盘
map1.close();

// 第二次：重新打开并恢复数据
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

long score = map2.get("alice"); // 100L（从磁盘恢复）
map2.close();
```

### 配置选项

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .persistent("data.db")        // 持久化文件路径
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(10L * 1024 * 1024 * 1024) // 预分配大小 (默认 10GB)

    // 索引策略（三选一）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引 (默认)
    .primitiveIndex()             // 使用原始索引（仅Long/Integer键）

    .build();
```

### 优势

- ✅ **数据持久化** - 应用重启后数据不丢失
- ✅ **最高性能** - 读写性能最优
- ✅ **超大容量** - 支持远超内存的数据量
- ✅ **自动恢复** - 重新打开时自动加载数据

### 劣势

- ⚠️ **磁盘空间** - 需要预分配磁盘空间
- ⚠️ **初始化开销** - 首次创建需要分配文件

### 适用场景

- 嵌入式数据库
- 持久化配置管理
- 会话状态存储
- 需要数据持久化的场景

### 性能表现

在 100 万条数据测试中（Linux 2C4G 服务器）：

| 指标 | 性能 |
|-----|------|
| 写入时间 | 1,057ms |
| 读取时间 | 642ms |
| 写吞吐量 | 946,073 ops/s |
| 读吞吐量 | 1,557,632 ops/s |
| 堆内存占用 | 47.63 MB |

### 持久化操作

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 写入数据
map.put("key1", 100L);
map.put("key2", 200L);

// 手动刷盘
map.flush();

// 关闭（自动刷盘）
map.close();
```

## 模式对比

| 特性 | OffHeap | Mmap Temp | Mmap Persist |
|-----|---------|-----------|--------------|
| 存储位置 | 堆外内存 | 临时文件 | 持久化文件 |
| 持久化 | ❌ | ❌ | ✅ |
| 容量限制 | MaxDirectMemory | 磁盘空间 | 磁盘空间 |
| 写性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 读性能 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 堆内存占用 | 极低 | 极低 | 极低 |
| 适用场景 | 缓存 | 临时处理 | 持久化存储 |

## 选择建议

### 选择 OffHeap 模式

- ✅ 需要降低 GC 压力
- ✅ 数据量在 GB 级别以内
- ✅ 不需要持久化
- ✅ 追求简单易用

### 选择 Mmap 临时文件模式

- ✅ 大数据量临时处理（10GB+）
- ✅ 批处理任务
- ✅ 不需要持久化
- ✅ 需要自动清理

### 选择 Mmap 持久化模式

- ✅ 需要数据持久化
- ✅ 嵌入式数据库
- ✅ 配置管理
- ✅ 追求极致性能

## 注意事项

### OffHeap 模式

```bash
# 设置最大直接内存大小
java -XX:MaxDirectMemorySize=2g -jar your-app.jar
```

### Mmap 模式

1. **预分配大小** - `allocateSize()` 会立即占用磁盘空间
2. **文件路径** - 确保目录存在且有写权限
3. **自动恢复** - 重新打开时使用相同的 Codec

## 下一步

- [索引策略](./index-strategies.md) - 选择合适的索引
- [配置选项](./configuration.md) - 详细配置说明
- [最佳实践](./best-practices.md) - 使用建议
