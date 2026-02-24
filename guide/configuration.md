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

    // 索引策略（三选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引
    .initialCapacity(16)          // 索引初始容量（默认 16）

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

    // 索引策略（三选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引
    .initialCapacity(16)          // 索引初始容量（默认 16）

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

#### initialCapacity

设置索引初始容量（默认 16）。

```java
.initialCapacity(16)
.initialCapacity(1024)
```

**建议**：
- 如果你能预估键数量，适当调大可降低扩容次数。
- 如果数据规模不确定，保持默认值即可。

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
