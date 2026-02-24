# 内存管理

RogueMap 使用内存映射文件进行数据存储，本文档介绍内存管理的相关内容。

## MmapAllocator（内存映射文件）

### 概述

MmapAllocator 是 RogueMap 的内存分配器，使用 `MappedByteBuffer` 将文件映射到内存。

### 内存映射机制

```
文件系统
    ↓
文件 (data.db)
    ↓
MappedByteBuffer
    ↓
虚拟内存
    ↓
物理内存（由操作系统管理）
```

### 大文件支持

MappedByteBuffer 单个分段最大 2GB，RogueMap 自动处理超过 2GB 的文件：

```
文件 (10GB)
├─ Segment 0: 0 - 2GB
├─ Segment 1: 2GB - 4GB
├─ Segment 2: 4GB - 6GB
├─ Segment 3: 6GB - 8GB
└─ Segment 4: 8GB - 10GB
```

### 分配流程

```
请求分配 100 字节
    ↓
CAS 操作递增偏移量
    ↓
计算所属分段
    ↓
返回地址（分段索引 + 偏移量）
```

### 持久化模式

```java
// 创建持久化文件
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB 预分配
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 文件结构
// ┌─────────────────────────────┐
// │ File Header (元数据)         │ 4KB
// ├─────────────────────────────┤
// │ Data Area (数据区)           │ 1GB - 4KB
// └─────────────────────────────┘
```

### 临时文件模式

```java
// 自动创建临时文件
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(5 * 1024 * 1024 * 1024L) // 5GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// JVM 关闭时自动删除临时文件
```

### 优势

- ✅ **超大容量** - 支持远超内存的数据量
- ✅ **操作系统优化** - 利用 OS 页面缓存
- ✅ **持久化** - 数据自动落盘
- ✅ **内存映射快速** - 接近内存访问速度

### 注意事项

1. **预分配空间** - `allocateSize()` 会立即占用磁盘空间
2. **文件权限** - 确保有读写权限
3. **关闭刷盘** - `close()` 会自动调用 `flush()`

## UnsafeOps（底层操作）

### 概述

UnsafeOps 封装了 `sun.misc.Unsafe` API，提供底层内存操作。

### 主要操作

```java
// 写入数据
UnsafeOps.putLong(address, 100L);
UnsafeOps.putInt(address + 8, 42);
UnsafeOps.putByte(address + 12, (byte) 1);

// 读取数据
long value1 = UnsafeOps.getLong(address);
int value2 = UnsafeOps.getInt(address + 8);
byte value3 = UnsafeOps.getByte(address + 12);

// 批量操作
UnsafeOps.copyMemory(srcAddress, destAddress, 100);
```

### 性能优势

- ✅ **零拷贝** - 直接内存操作
- ✅ **极致性能** - 无 JVM 开销
- ✅ **原始类型优化** - 固定长度读写

### 安全性

::: warning Unsafe API
`sun.misc.Unsafe` 是 JVM 内部 API，未来可能被移除。RogueMap 计划支持 Java 17+ 的 `Foreign Memory API`。
:::

## 内存占用分析

### HashMap vs RogueMap

100 万条 String -> Long 数据：

```
HashMap:
├─ Entry 对象: 32 字节 × 1,000,000 = 32 MB
├─ String 对象: 40 字节 × 1,000,000 = 40 MB
├─ Long 对象: 24 字节 × 1,000,000 = 24 MB
├─ 哈希表数组: 8 字节 × 1,048,576 = 8 MB
└─ 字符串数据: ~200 MB
总计: ~311 MB（堆内存，实测值）

RogueMap Mmap:
├─ 索引（堆内存）: ~30 MB
└─ 数据（文件映射）: ~18 MB
总堆内存: ~48 MB（实测值）
内存节省: 84.7%
```

### 原始索引 vs 对象索引

100 万条 Long -> Long 数据：

```
SegmentedHashIndex:
├─ HashMap 索引: ~28 MB
└─ 数据（文件映射）: ~20 MB
总堆内存: ~48 MB

LongPrimitiveIndex:
├─ long[] keys: 8 MB
├─ long[] addresses: 8 MB
├─ int[] sizes: 4 MB
└─ 数据（文件映射）: ~20 MB
总堆内存: ~20 MB
内存节省: 约 58%
```

## 内存配置建议

### Mmap 模式

```java
// 根据数据量预估
long estimatedSize = recordCount * averageRecordSize * 1.5;

RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .autoExpand(true)  // 或开启自动扩容
    .build();
```

## 内存泄漏防护

### 1. 使用 try-with-resources

```java
// 推荐 ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // 使用 map
} // 自动调用 close()，释放资源

// 避免 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close() 会导致资源泄漏
```

### 2. 显式关闭

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();
    // 使用 map
} finally {
    if (map != null) {
        map.close(); // 确保释放
    }
}
```

## 性能监控

### 内存使用情况

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 获取大小
int size = map.size();

// 监控堆内存
Runtime runtime = Runtime.getRuntime();
long heapUsed = runtime.totalMemory() - runtime.freeMemory();
System.out.println("Heap used: " + heapUsed / 1024 / 1024 + " MB");
```

## 下一步

- [并发控制](./concurrency.md) - 深入了解并发机制
- [配置选项](./configuration.md) - 详细配置说明
- [最佳实践](./best-practices.md) - 使用建议
