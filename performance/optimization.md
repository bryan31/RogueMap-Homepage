# 性能优化

本文档介绍 RogueMap 的性能优化技巧和最佳实践。

## 存储模式优化

### 选择最优模式

根据场景选择合适的存储模式：

```java
// 场景 1: 高性能 + 持久化
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .allocateSize(10L * 1024 * 1024 * 1024)
    .build();
// 最高读写性能 + 数据持久化

// 场景 2: 临时大数据处理
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .temporary()
    .allocateSize(50L * 1024 * 1024 * 1024)
    .build();
// 支持超大数据 + 自动清理

// 场景 3: 内存敏感缓存
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(2 * 1024 * 1024 * 1024)
    .build();
// 降低 GC + 适中性能
```

### 模式性能对比

| 模式 | 写入 | 读取 | 适用场景 |
|-----|------|------|---------|
| Mmap 持久化 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 生产环境 |
| Mmap 临时 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 临时处理 |
| OffHeap | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 缓存 |
| HashMap | ⭐⭐⭐⭐ | ⭐⭐⭐ | 简单场景 |

## 数据类型优化

### 优先使用原始类型

```java
// 最优 ⭐⭐⭐⭐⭐
RogueMap<Long, Long> map1 = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 零拷贝，极致性能

// 次优 ⭐⭐⭐⭐
RogueMap<String, Long> map2 = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// String 有序列化开销

// 避免 ⭐⭐
RogueMap<String, User> map3 = RogueMap.<String, User>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
// 对象序列化开销大
```

### 性能对比

| 类型组合 | 读性能 | 写性能 | 推荐度 |
|---------|--------|--------|--------|
| Long -> Long | 5,000,000 ops/s | 1,800,000 ops/s | ⭐⭐⭐⭐⭐ |
| String -> Long | 3,500,000 ops/s | 1,500,000 ops/s | ⭐⭐⭐⭐ |
| String -> Object | 1,000,000 ops/s | 600,000 ops/s | ⭐⭐⭐ |

## 索引策略优化

### 高并发场景

```java
// 推荐：SegmentedHashIndex
int threads = Runtime.getRuntime().availableProcessors() * 2;
int segments = Math.max(64, Integer.highestOneBit(threads) * 2);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .keyCodec(keyCodec)
    .valueCodec(valueCodec)
    .segmentedIndex(segments)
    .build();

// 性能提升：3-5 倍（16+ 线程）
```

### 内存敏感场景

```java
// 推荐：LongPrimitiveIndex
RogueMap<Long, V> map = RogueMap.<Long, V>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(valueCodec)
    .primitiveIndex()
    .build();

// 内存节省：81%
```

### 索引性能对比

| 索引类型 | 16 线程读 | 16 线程写 | 内存占用 |
|---------|-----------|-----------|---------|
| SegmentedHashIndex | 100ms | 150ms | 105 MB |
| LongPrimitiveIndex | 195ms | 260ms | 19 MB |
| BasicIndex | 200ms | 350ms | 100 MB |

## 内存配置优化

### JVM 参数调优

```bash
# 推荐配置（8GB 机器）
java -Xmx4g \
     -XX:MaxDirectMemorySize=4g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -jar app.jar

# 推荐配置（16GB 机器）
java -Xmx8g \
     -XX:MaxDirectMemorySize=8g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=200 \
     -XX:G1HeapRegionSize=16m \
     -jar app.jar
```

### 内存预分配

```java
// 精确估算
long recordCount = 10_000_000;
int avgKeySize = 20;
int avgValueSize = 100;
double overhead = 1.2;

long requiredMemory = (long) (recordCount * (avgKeySize + avgValueSize) * overhead);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(requiredMemory)
    .build();

// 避免频繁扩容
```

## 并发优化

### 线程池配置

```java
// CPU 密集型
int cpuThreads = Runtime.getRuntime().availableProcessors();
ExecutorService cpuExecutor = Executors.newFixedThreadPool(cpuThreads);

// I/O 密集型
int ioThreads = cpuThreads * 2;
ExecutorService ioExecutor = Executors.newFixedThreadPool(ioThreads);

// 匹配 RogueMap 段数
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .segmentedIndex(Math.max(64, ioThreads))
    .build();
```

### 批量操作

```java
// 优化前 ❌ - 逐个操作
for (int i = 0; i < 1_000_000; i++) {
    map.put("key" + i, (long) i);
}

// 优化后 ✅ - 批量操作
Map<String, Long> batch = new HashMap<>();
for (int i = 0; i < 10000; i++) {
    batch.put("key" + i, (long) i);
}
// 批量提交
for (Map.Entry<String, Long> entry : batch.entrySet()) {
    map.put(entry.getKey(), entry.getValue());
}

// 性能提升：20-30%
```

## 持久化优化

### 刷盘策略

```java
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .build();

// 策略 1: 定时刷盘
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    map.flush();
}, 5, 5, TimeUnit.MINUTES);

// 策略 2: 批量刷盘
int batchSize = 10000;
for (int i = 0; i < 1_000_000; i++) {
    map.put("key" + i, (long) i);
    if (i % batchSize == 0) {
        map.flush();
    }
}

// 策略 3: 按需刷盘
map.put("critical-key", value);
map.flush(); // 立即刷盘
```

### 文件预分配

```java
// 避免频繁扩容
long estimatedSize = calculateEstimatedSize();

RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .build();

// 性能提升：避免文件扩容开销
```

## 编解码器优化

### 自定义高性能编解码器

```java
public class OptimizedCodec<T> implements Codec<T> {
    private final ThreadLocal<ByteBuffer> bufferPool =
        ThreadLocal.withInitial(() -> ByteBuffer.allocate(4096));

    @Override
    public byte[] encode(T value) {
        ByteBuffer buffer = bufferPool.get();
        buffer.clear();
        // 使用缓冲池，避免频繁分配
        // ... 序列化逻辑
        return Arrays.copyOf(buffer.array(), buffer.position());
    }

    @Override
    public T decode(byte[] bytes) {
        ByteBuffer buffer = bufferPool.get();
        buffer.clear();
        buffer.put(bytes);
        buffer.flip();
        // ... 反序列化逻辑
        return value;
    }
}
```

## 监控和调优

### 性能监控

```java
public class PerformanceMonitor {
    public static void monitor(RogueMap<?, ?> map) {
        // 监控大小
        int size = map.size();
        System.out.println("Map size: " + size);

        // 监控堆内存
        Runtime runtime = Runtime.getRuntime();
        long heapUsed = runtime.totalMemory() - runtime.freeMemory();
        System.out.println("Heap used: " + heapUsed / 1024 / 1024 + " MB");

        // 监控操作延迟
        long start = System.nanoTime();
        map.get("test-key");
        long latency = System.nanoTime() - start;
        System.out.println("Get latency: " + latency + " ns");
    }
}
```

### 性能基准测试

```java
public class Benchmark {
    public static void benchmark(RogueMap<Long, Long> map, int operations) {
        // 预热
        for (int i = 0; i < 100000; i++) {
            map.put((long) i, (long) i);
        }

        // 测试写入
        long start = System.nanoTime();
        for (int i = 0; i < operations; i++) {
            map.put((long) i, (long) i);
        }
        long writeTime = System.nanoTime() - start;
        double writeThroughput = operations * 1_000_000_000.0 / writeTime;
        System.out.println("Write: " + writeThroughput + " ops/s");

        // 测试读取
        start = System.nanoTime();
        for (int i = 0; i < operations; i++) {
            map.get((long) i);
        }
        long readTime = System.nanoTime() - start;
        double readThroughput = operations * 1_000_000_000.0 / readTime;
        System.out.println("Read: " + readThroughput + " ops/s");
    }
}
```

## 性能调优清单

### 配置层面

- [ ] 选择最优存储模式
- [ ] 设置合理的内存大小
- [ ] 配置合适的 JVM 参数
- [ ] 选择合适的索引策略
- [ ] 预分配文件大小（Mmap 模式）

### 代码层面

- [ ] 优先使用原始类型
- [ ] 批量操作代替逐个操作
- [ ] 合理配置线程池
- [ ] 实现高效的编解码器
- [ ] 定期刷盘（持久化模式）

### 监控层面

- [ ] 监控内存使用
- [ ] 监控操作延迟
- [ ] 定期性能基准测试
- [ ] 分析 GC 日志
- [ ] 监控磁盘 I/O（Mmap 模式）

## 常见性能问题

### 问题 1: 频繁 GC

**症状**: 应用卡顿，GC 时间长

**解决方案**:
```java
// 使用 OffHeap 或 Mmap 模式
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(2 * 1024 * 1024 * 1024)
    .build();

// 增加直接内存
java -XX:MaxDirectMemorySize=4g -jar app.jar
```

### 问题 2: 写入性能低

**症状**: 写入速度慢

**解决方案**:
```java
// 1. 使用 Mmap 持久化模式
RogueMap<K, V> map = RogueMap.<K, V>mmap()
    .persistent("data.db")
    .build();

// 2. 批量写入
// 3. 减少刷盘频率
```

### 问题 3: 高并发性能差

**症状**: 多线程下性能不佳

**解决方案**:
```java
// 增加段数
RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .segmentedIndex(128)
    .build();
```

## 总结

### 性能优化优先级

1. **选择最优模式** - 影响最大
2. **使用原始类型** - 零拷贝
3. **合理索引策略** - 高并发
4. **JVM 参数调优** - 基础优化
5. **批量操作** - 减少开销

### 预期性能提升

| 优化项 | 性能提升 |
|--------|---------|
| Mmap 模式 | 2-3x |
| 原始类型 | 2-5x |
| 分段索引 | 3-5x (高并发) |
| 批量操作 | 20-30% |

## 下一步

- [性能测试](./benchmark.md) - 详细性能数据
- [对比分析](./comparison.md) - 方案对比
- [最佳实践](../guide/best-practices.md) - 使用建议
