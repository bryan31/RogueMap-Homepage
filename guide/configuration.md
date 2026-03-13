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

设置默认数据过期时间。设置后所有写入的数据自动携带过期时间戳，读取时自动判断并惰性删除过期数据。`TTL = 0` 表示永不过期。

```java
import java.util.concurrent.TimeUnit;

// 30 分钟后过期
.defaultTTL(30, TimeUnit.MINUTES)

// 24 小时后过期
.defaultTTL(24, TimeUnit.HOURS)

// 7 天后过期
.defaultTTL(7, TimeUnit.DAYS)
```

**存储格式**：
```
[expireTime: 8 字节 (long)][实际序列化数据]
```

数据写入时，在 mmap 文件中实际数据前额外存储 8 字节的过期时间戳（绝对毫秒值）。读取时自动检查是否过期，过期数据惰性删除。

**适用范围**: 全部四种数据结构的 builder 均支持 `defaultTTL()`。其中 **RogueMap** 提供完整的运行时惰性删除和单条 TTL 覆盖（`put(key, value, ttl, unit)`）。

**示例**：

```java
RogueMap<String, String> cache = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .defaultTTL(10, TimeUnit.MINUTES)
    .build();

cache.put("session", "abc123");
// 10 分钟后 get("session") 返回 null
```

## 自动 Checkpoint 配置

#### autoCheckpoint（按时间间隔）

按固定时间间隔自动执行 checkpoint，将索引和元数据持久化到磁盘。

```java
import java.util.concurrent.TimeUnit;

// 每 5 分钟自动 checkpoint
.autoCheckpoint(5, TimeUnit.MINUTES)

// 每 30 秒自动 checkpoint
.autoCheckpoint(30, TimeUnit.SECONDS)
```

#### autoCheckpoint（按操作次数）

按写操作次数自动执行 checkpoint。

```java
// 每 10000 次写操作自动 checkpoint
.autoCheckpoint(10000)

// 每 1000 次写操作自动 checkpoint
.autoCheckpoint(1000)
```

**两种模式可以同时开启**（OR 逻辑），任一条件满足即触发 checkpoint。使用守护线程池，不影响主线程性能。

**适用范围**: 全部四种数据结构（RogueMap、RogueList、RogueSet、RogueQueue），仅在持久化模式下有意义。

**示例**：

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/counters.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 每 5 分钟
    .autoCheckpoint(10000)                // 或每 1 万次操作
    .build();
```

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

- [最佳实践](./best-practices.md) - 使用建议
- [运维指南](./operations.md) - 监控和维护
- [内存管理](./memory-management.md) - 内存管理详解
