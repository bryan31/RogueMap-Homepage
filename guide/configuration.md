# 配置选项

本文档详细说明 RogueMap 的所有配置选项。

## OffHeap 模式配置

### 完整配置示例

```java
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    // 必需配置
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .maxMemory(1024 * 1024 * 1024) // 最大内存 (默认 1GB)

    // 索引策略（三选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引

    .build();
```

### 参数说明

#### maxMemory

设置最大堆外内存大小。

```java
// 100 MB
.maxMemory(100 * 1024 * 1024)

// 1 GB
.maxMemory(1024 * 1024 * 1024)

// 4 GB
.maxMemory(4L * 1024 * 1024 * 1024)
```

**默认值**: 1 GB

**建议**:
- 根据实际数据量设置
- 不要超过 `-XX:MaxDirectMemorySize`
- 留有一定余量（建议 20%）

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

## Mmap 临时文件模式配置

### 完整配置示例

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .temporary()                  // 临时文件模式
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(10L * 1024 * 1024 * 1024) // 预分配大小 (默认 10GB)

    // 索引策略（三选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引

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

**默认值**: 10 GB

**注意**:
- 会立即占用磁盘空间
- 确保磁盘有足够空间

## Mmap 持久化模式配置

### 完整配置示例

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    // 必需配置
    .persistent("data.db")        // 持久化文件路径
    .keyCodec(keyCodec)           // 键的编解码器
    .valueCodec(valueCodec)       // 值的编解码器

    // 可选配置
    .allocateSize(10L * 1024 * 1024 * 1024) // 预分配大小 (默认 10GB)

    // 索引策略（三选一，默认 segmentedIndex）
    .basicIndex()                 // 使用基础索引
    .segmentedIndex(64)           // 使用分段索引
    .primitiveIndex()             // 使用原始索引

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
RogueMap<String, User> cache = RogueMap.<String, User>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .maxMemory(2 * 1024 * 1024 * 1024) // 2GB
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
    .segmentedIndex(64)
    .build();
```

### 内存敏感场景

```java
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(512 * 1024 * 1024) // 512MB
    .primitiveIndex() // 节省 81% 内存
    .build();
```

## JVM 参数配置

### 直接内存大小

```bash
# 设置最大直接内存
java -XX:MaxDirectMemorySize=4g -jar app.jar

# 同时设置堆内存和直接内存
java -Xmx2g -XX:MaxDirectMemorySize=2g -jar app.jar
```

### 推荐配置

```bash
# 4GB 应用
java -Xmx2g -XX:MaxDirectMemorySize=2g -jar app.jar

# 8GB 应用
java -Xmx4g -XX:MaxDirectMemorySize=4g -jar app.jar

# 16GB 应用
java -Xmx8g -XX:MaxDirectMemorySize=8g -jar app.jar
```

## 配置最佳实践

### 1. 内存配置

```java
// 根据实际需求估算
long recordCount = 1_000_000;
int avgRecordSize = 200; // 字节
double overhead = 1.2; // 20% 开销

long requiredMemory = (long) (recordCount * avgRecordSize * overhead);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(requiredMemory)
    .build();
```

### 2. 索引配置

```java
// 高并发场景
int threads = Runtime.getRuntime().availableProcessors() * 2;
int segments = Math.max(64, Integer.highestOneBit(threads) * 2);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .segmentedIndex(segments)
    .build();
```

### 3. 文件路径配置

```java
// 使用配置文件
String dataDir = System.getProperty("data.dir", "./data");
String fileName = System.getProperty("data.file", "default.db");
String filePath = dataDir + "/" + fileName;

// 确保目录存在
new File(dataDir).mkdirs();

RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent(filePath)
    .build();
```

### 4. 环境变量配置

```bash
# 设置环境变量
export ROGUEMAP_MAX_MEMORY=2147483648  # 2GB
export ROGUEMAP_DATA_DIR=/var/data/roguemap
export ROGUEMAP_SEGMENTS=128
```

```java
// 读取环境变量
long maxMemory = Long.parseLong(
    System.getenv().getOrDefault("ROGUEMAP_MAX_MEMORY", "1073741824")
);
String dataDir = System.getenv().getOrDefault("ROGUEMAP_DATA_DIR", "./data");
int segments = Integer.parseInt(
    System.getenv().getOrDefault("ROGUEMAP_SEGMENTS", "64")
);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(maxMemory)
    .segmentedIndex(segments)
    .build();
```

## 配置验证

### 验证配置

```java
// 检查直接内存限制
long maxDirectMemory = VM.maxDirectMemory();
long configuredMemory = 2L * 1024 * 1024 * 1024; // 2GB

if (configuredMemory > maxDirectMemory) {
    throw new IllegalArgumentException(
        "Configured memory exceeds MaxDirectMemorySize"
    );
}

// 检查磁盘空间
File file = new File("data.db");
long freeSpace = file.getFreeSpace();
long allocateSize = 10L * 1024 * 1024 * 1024; // 10GB

if (freeSpace < allocateSize) {
    throw new IllegalStateException("Not enough disk space");
}
```

## 下一步

- [最佳实践](./best-practices.md) - 使用建议
- [性能测试](../performance/benchmark.md) - 性能数据
- [内存管理](./memory-management.md) - 内存管理详解
