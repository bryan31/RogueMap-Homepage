# 配置选项

本文档详细说明 RogueMap 的所有配置选项。

## Mmap 临时文件模式配置

### 完整配置示例

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .temporary()                  // 临时文件模式
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(2L * 1024 * 1024 * 1024) // 预分配大小 (默认 2GB)
    .autoExpand(true)             // 开启自动扩容

    // 索引策略（四选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引
    .lowHeapIndex()               // 使用超低堆 String 索引
    .initialCapacity(16)          // 索引初始容量（默认 16）

    // TTL（可选）
    .defaultTTL(30, TimeUnit.MINUTES)  // 默认数据过期时间

    // 自动 checkpoint（可选）
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 按时间自动 checkpoint
    .autoCheckpoint(10000)                // 按操作次数自动 checkpoint

    .build();
```

### 参数说明

#### temporary

启用临时文件模式。

```java
.temporary()
```

**特点**:
- 自动创建临时文件
- JVM 关闭时自动删除

#### allocateSize

设置预分配文件大小。

```java
// 1 GB
.allocateSize(1024 * 1024 * 1024L)

// 10 GB
.allocateSize(10L * 1024 * 1024 * 1024)

// 100 GB
.allocateSize(100L * 1024 * 1024 * 1024)
```

**默认值**: 2 GB

**注意**:
- 会立即占用磁盘空间
- 确保磁盘有足够空间

#### autoExpand

开启自动扩容。

```java
.autoExpand(true)        // 开启自动扩容
.expandFactor(2.0)       // 扩容倍数（默认 2.0）
.maxFileSize(100L * 1024 * 1024 * 1024)  // 最大文件大小限制
```

## Mmap 持久化模式配置

### 完整配置示例

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .persistent("data.db")        // 持久化文件路径
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(2L * 1024 * 1024 * 1024) // 预分配大小 (默认 2GB)
    .autoExpand(true)             // 开启自动扩容

    // 索引策略（四选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引
    .lowHeapIndex()               // 使用超低堆 String 索引
    .initialCapacity(16)          // 索引初始容量（默认 16）

    // TTL（可选）
    .defaultTTL(30, TimeUnit.MINUTES)  // 默认数据过期时间

    // 自动 checkpoint（可选）
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 按时间自动 checkpoint
    .autoCheckpoint(10000)                // 按操作次数自动 checkpoint

    .build();
```

### 参数说明

#### persistent

设置持久化文件路径。

```java
// 相对路径
.persistent("data.db")

// 绝对路径
.persistent("/var/data/roguemap/data.db")

// 带目录
.persistent("data/users/profiles.db")
```

**注意**:
- 确保目录存在
- 确保有读写权限

#### autoExpand / expandFactor / maxFileSize

```java
.autoExpand(true)         // 开启自动扩容
.expandFactor(2.0)        // 每次扩容为原来的 2 倍
.maxFileSize(10L * 1024 * 1024 * 1024)  // 最大 10GB
```

## 索引配置

#### basicIndex

使用基础索引（ConcurrentHashMap）。

```java
.basicIndex()
```

**适用场景**:
- 单线程或低并发
- 简单的键值存储

#### segmentedIndex

使用分段索引（默认）。

```java
.segmentedIndex(64)  // 64 个段
.segmentedIndex(128) // 128 个段
```

**参数**:
- `segments`: 段数量，默认 64
- `segments` 必须是 2 的幂次方（例如 32/64/128）

**建议**:
- 高并发：128 或 256
- 中等并发：64（默认）
- 低并发：32

#### primitiveIndex

使用原始索引（仅 Long/Integer 键）。

```java
.primitiveIndex()
```

**限制**:
- 仅支持 Long 或 Integer 类型的键

**优势**:
- 节省 81% 内存

#### lowHeapIndex

使用超低堆 String 索引。索引数据存储在 mmap 文件中，JVM 堆上仅保留段元数据和锁。

```java
.lowHeapIndex()
```

**限制**:
- 仅支持 String 类型的键/元素（RogueMap 和 RogueSet）
- 不支持事务（`beginTransaction()`）

**优势**:
- 堆内存占用极低，适合海量 String 键场景

#### lowHeapOptions

自定义 LowHeap 索引参数，需配合 `lowHeapIndex()` 使用。

```java
import com.yomahub.roguemap.index.LowHeapOptions;

.lowHeapIndex()
.lowHeapOptions(new LowHeapOptions(128, 0.75, 16))
```

**参数说明**:
- `segmentCount`：分段数量，默认 64，必须是 2 的幂次方
- `loadFactor`：负载因子，默认 0.80，范围 (0.1, 0.95)
- `maxProbe`：最大探测次数，默认 16

#### initialCapacity

设置索引初始容量（默认 16）。

```java
.initialCapacity(16)
.initialCapacity(1024)
```

**建议**：
- 如果你能预估键数量，适当调大可降低扩容次数。
- 如果数据规模不确定，保持默认值即可。

## TTL 配置

#### defaultTTL

设置默认数据过期时间。详细说明请参阅 [TTL 数据过期](./ttl.md)。

```java
import java.util.concurrent.TimeUnit;

// 30 分钟后过期
.defaultTTL(30, TimeUnit.MINUTES)

// 24 小时后过期
.defaultTTL(24, TimeUnit.HOURS)

// 7 天后过期
.defaultTTL(7, TimeUnit.DAYS)
```

**适用范围**: 全部四种数据结构的 builder 均支持。

## 自动 Checkpoint 配置

详细说明请参阅 [检查点与自动检查点](./auto-checkpoint.md)。

#### autoCheckpoint（按时间间隔）

```java
// 每 5 分钟自动 checkpoint
.autoCheckpoint(5, TimeUnit.MINUTES)
```

#### autoCheckpoint（按操作次数）

```java
// 每 10000 次写操作自动 checkpoint
.autoCheckpoint(10000)
```

两种模式可以同时开启（OR 逻辑），任一条件满足即触发 checkpoint。

**适用范围**: 全部四种数据结构，仅在持久化模式下有意义。

## 编解码器配置

### 键编解码器

```java
// String 键
.keyCodec(StringCodec.INSTANCE)

// Long 键
.keyCodec(PrimitiveCodecs.LONG)

// Integer 键
.keyCodec(PrimitiveCodecs.INTEGER)

// 自定义编解码器
.keyCodec(MyCustomCodec.INSTANCE)
```

### 值编解码器

```java
// 原始类型
.valueCodec(PrimitiveCodecs.LONG)
.valueCodec(PrimitiveCodecs.INTEGER)
.valueCodec(PrimitiveCodecs.DOUBLE)

// String
.valueCodec(StringCodec.INSTANCE)

// 对象
.valueCodec(KryoObjectCodec.create(User.class))

// 自定义
.valueCodec(MyCustomCodec.INSTANCE)
```

## 配置模板

### 高性能缓存

```java
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .allocateSize(2L * 1024 * 1024 * 1024) // 2GB
    .segmentedIndex(128) // 高并发
    .build();
```

### 大数据临时处理

```java
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .allocateSize(50L * 1024 * 1024 * 1024) // 50GB
    .primitiveIndex() // 节省内存
    .build();
```

### 持久化数据库

```java
RogueMap<String, Document> db = RogueMap.<String, Document>mmap()
    .persistent("data/documents.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Document.class))
    .allocateSize(20L * 1024 * 1024 * 1024) // 20GB
    .autoExpand(true)
    .segmentedIndex(64)
    .build();
```

## 下一步

- [最佳实践](./best-practices.md) — 使用建议
- [TTL 数据过期](./ttl.md) — TTL 详细说明
- [自动检查点](./auto-checkpoint.md) — 检查点详细说明
- [自动扩容](./auto-expand.md) — 自动扩容详细说明
- [内存管理](./memory-management.md) — 内存管理详解
