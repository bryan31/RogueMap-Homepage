# 内存管理

RogueMap 提供了两种内存分配器，分别用于堆外内存和内存映射文件存储。

## SlabAllocator（堆外内存）

### 概述

SlabAllocator 是 OffHeap 模式的内存分配器，采用 Slab 分配策略减少内存碎片。

### Slab 分配策略

```
内存布局：
┌─────────────────────────────────────┐
│         SlabAllocator               │
├─────────────────────────────────────┤
│ Size Class 1: 16 字节               │
│ ├─ Block 1 (1MB)                    │
│ ├─ Block 2 (1MB)                    │
│ └─ ...                              │
├─────────────────────────────────────┤
│ Size Class 2: 64 字节               │
│ ├─ Block 1 (1MB)                    │
│ └─ ...                              │
├─────────────────────────────────────┤
│ Size Class 3: 256 字节              │
├─────────────────────────────────────┤
│ Size Class 4: 1 KB                  │
├─────────────────────────────────────┤
│ Size Class 5: 4 KB                  │
├─────────────────────────────────────┤
│ Size Class 6: 16 KB                 │
├─────────────────────────────────────┤
│ Size Class 7: Large (>16 KB)        │
└─────────────────────────────────────┘
```

### Size Class（大小类别）

SlabAllocator 将内存分为 7 个大小类别：

| Size Class | 大小 | 适用场景 |
|-----------|------|---------|
| 1 | 16 字节 | 极小对象 |
| 2 | 64 字节 | 小对象 |
| 3 | 256 字节 | 中小对象 |
| 4 | 1 KB | 中等对象 |
| 5 | 4 KB | 中大对象 |
| 6 | 16 KB | 大对象 |
| 7 | > 16 KB | 超大对象 |

### 分配流程

```
请求分配 100 字节
    ↓
选择 Size Class 3 (256 字节)
    ↓
查找 Size Class 3 的空闲列表
    ↓
有空闲？
├─ 是 → 从空闲列表取出 → 返回地址
└─ 否 → 分配新块 (1MB) → 返回地址
```

### 内存回收

```java
// 释放内存时，加入空闲列表重用
allocator.free(address, size);
    ↓
确定 Size Class
    ↓
加入该 Size Class 的空闲列表
    ↓
下次分配时优先使用
```

### 优势

- ✅ **减少碎片** - 固定大小块分配
- ✅ **快速分配** - O(1) 时间复杂度
- ✅ **内存重用** - 空闲列表重用
- ✅ **负载因子自适应** - 自动扩容

### 配置示例

```java
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(1024 * 1024 * 1024) // 1GB 最大内存
    .build();
```

## MmapAllocator（内存映射文件）

### 概述

MmapAllocator 是 Mmap 模式的内存分配器，使用 `MappedByteBuffer` 将文件映射到内存。

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
// 分配内存
long address = UnsafeOps.allocate(1024);

// 写入数据
UnsafeOps.putLong(address, 100L);
UnsafeOps.putInt(address + 8, 42);
UnsafeOps.putByte(address + 12, (byte) 1);

// 读取数据
long value1 = UnsafeOps.getLong(address);
int value2 = UnsafeOps.getInt(address + 8);
byte value3 = UnsafeOps.getByte(address + 12);

// 批量操作
byte[] data = new byte[100];
UnsafeOps.copyMemory(data, 0, address, 100);

// 释放内存
UnsafeOps.free(address);
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
总计: ~304 MB（堆内存）

RogueMap OffHeap:
├─ 索引（堆内存）: ~25 MB
├─ 数据（堆外内存）: ~15 MB
└─ 总堆内存: ~40 MB
内存节省: 87%
```

### 原始索引 vs 对象索引

100 万条 Long -> Long 数据：

```
SegmentedHashIndex:
├─ HashMap 索引: 100 MB
└─ 数据: 20 MB
总计: 120 MB

LongPrimitiveIndex:
├─ long[] keys: 8 MB
├─ long[] addresses: 8 MB
├─ int[] sizes: 4 MB
└─ 数据: 20 MB
总计: 40 MB
内存节省: 67%
```

## 内存配置建议

### OffHeap 模式

```bash
# 设置最大直接内存
java -XX:MaxDirectMemorySize=4g -jar your-app.jar

# 示例：4GB 应用
# JVM 堆内存: 2GB
# 直接内存: 2GB
java -Xmx2g -XX:MaxDirectMemorySize=2g -jar your-app.jar
```

### Mmap 模式

```java
// 根据数据量预估
long estimatedSize = recordCount * averageRecordSize * 1.5;

RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .build();
```

## 内存泄漏防护

### 1. 使用 try-with-resources

```java
// 推荐 ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // 使用 map
} // 自动调用 close()，释放内存

// 避免 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close() 会导致内存泄漏
```

### 2. 显式关闭

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>offHeap()
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
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
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
