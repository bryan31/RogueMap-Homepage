# 最佳实践

本文档总结了使用 RogueMap 的最佳实践和常见陷阱。

## 资源管理

### 1. 使用 try-with-resources

```java
// 推荐 ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // 使用 map
    map.put("key", 100L);
} // 自动调用 close()，释放资源

// 避免 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close() 会导致内存泄漏
```

### 2. 注册 Shutdown Hook

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 注册 Shutdown Hook 确保优雅关闭
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    try {
        map.close();
        System.out.println("RogueMap closed successfully");
    } catch (Exception e) {
        System.err.println("Error closing RogueMap: " + e.getMessage());
    }
}));
```

## 性能优化

### 1. 优先使用原始类型

```java
// 好 ✅ - 零拷贝，高性能
RogueMap<Long, Long> map = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 避免 ❌ - 序列化开销
RogueMap<String, String> map = RogueMap.<String, String>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
// 如果可以用 Long，就不要用 String
```

### 2. 选择合适的索引

```java
// 高并发场景：SegmentedHashIndex
RogueMap<String, User> cache = RogueMap.<String, User>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(128) // 高并发
    .build();

// Long 键 + 内存敏感：LongPrimitiveIndex
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .primitiveIndex() // 节省 81% 内存
    .build();
```

### 3. 批量操作

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

### 4. 合理设置内存大小

```java
// 估算内存需求
long recordCount = 1_000_000;
int avgKeySize = 20;
int avgValueSize = 100;
double overhead = 1.2;

long requiredMemory = (long) (recordCount * (avgKeySize + avgValueSize) * overhead);

RogueMap<K, V> map = RogueMap.<K, V>offHeap()
    .maxMemory(requiredMemory)
    .build();
```

## 存储模式选择

### 1. OffHeap - 内存敏感场景

```java
// 适合：降低 GC 压力，中等数据量
RogueMap<String, User> cache = RogueMap.<String, User>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .maxMemory(2 * 1024 * 1024 * 1024) // 2GB
    .build();
```

**适用场景**:
- 需要降低 GC 压力
- 数据量在 GB 级别
- 不需要持久化

### 2. Mmap Temp - 大数据临时处理

```java
// 适合：大数据量临时处理
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .allocateSize(50L * 1024 * 1024 * 1024) // 50GB
    .build();
```

**适用场景**:
- 大数据量临时处理（10GB+）
- 批处理任务
- 自动清理

### 3. Mmap Persist - 持久化存储

```java
// 适合：需要持久化
RogueMap<String, Document> db = RogueMap.<String, Document>mmap()
    .persistent("data/documents.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Document.class))
    .allocateSize(20L * 1024 * 1024 * 1024) // 20GB
    .build();
```

**适用场景**:
- 需要数据持久化
- 嵌入式数据库
- 配置管理

## 并发使用

### 1. 高并发读写

```java
// 使用 SegmentedHashIndex
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(128) // 增加段数
    .build();

// 多线程并发访问
ExecutorService executor = Executors.newFixedThreadPool(32);
for (int i = 0; i < 1000; i++) {
    final int index = i;
    executor.submit(() -> {
        map.put("key" + index, (long) index);
        Long value = map.get("key" + index);
    });
}
```

### 2. 避免复合操作

```java
// 避免 ❌ - 非原子性
if (!map.containsKey("key")) {
    map.put("key", 100L);
}

// 好 ✅ - 使用外部同步
synchronized (lock) {
    if (!map.containsKey("key")) {
        map.put("key", 100L);
    }
}
```

## 持久化最佳实践

### 1. 定期刷盘

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 定期刷盘
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    try {
        map.flush();
    } catch (Exception e) {
        logger.error("Flush failed", e);
    }
}, 1, 5, TimeUnit.MINUTES);
```

### 2. 保持编解码器一致

```java
// 创建时
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

// 恢复时 - 必须使用相同的编解码器 ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // 相同
    .valueCodec(PrimitiveCodecs.LONG) // 相同
    .build();
```

### 3. 异常处理

```java
RogueMap<String, Long> map = null;
try {
    map = RogueMap.<String, Long>mmap()
        .persistent("data.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();

    // 使用 map
} catch (Exception e) {
    logger.error("Error", e);
} finally {
    if (map != null) {
        try {
            map.close();
        } catch (Exception e) {
            logger.error("Error closing", e);
        }
    }
}
```

## 内存管理

### 1. 设置 JVM 参数

```bash
# 同时设置堆内存和直接内存
java -Xmx4g -XX:MaxDirectMemorySize=4g -jar app.jar
```

### 2. 监控内存使用

```java
// 堆内存
Runtime runtime = Runtime.getRuntime();
long heapUsed = runtime.totalMemory() - runtime.freeMemory();
System.out.println("Heap: " + heapUsed / 1024 / 1024 + " MB");

// Map 大小
int size = map.size();
System.out.println("Map size: " + size);
```

### 3. 避免内存泄漏

```java
// 确保关闭
try (RogueMap<String, Long> map = ...) {
    // 使用 map
} // 自动关闭

// 或使用 Shutdown Hook
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    map.close();
}));
```

## 常见陷阱

### 1. 忘记关闭

```java
// 错误 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close()

// 正确 ✅
try (RogueMap<String, Long> map = ...) {
    // 使用
}
```

### 2. 超出内存限制

```java
// 错误 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .maxMemory(10L * 1024 * 1024 * 1024) // 10GB
    .build();
// 但 -XX:MaxDirectMemorySize=2g 只有 2GB

// 正确 ✅
// 确保 maxMemory <= MaxDirectMemorySize
```

### 3. 编解码器不一致

```java
// 错误 ❌
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

RogueMap<String, String> map2 = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE) // 不同！
    .build();

// 正确 ✅
// 使用相同的编解码器
```

### 4. 磁盘空间不足

```java
// 检查磁盘空间
File file = new File("data.db");
long freeSpace = file.getFreeSpace();
long allocateSize = 100L * 1024 * 1024 * 1024; // 100GB

if (freeSpace < allocateSize) {
    throw new IllegalStateException("Not enough disk space");
}
```

## 调试和监控

### 1. 启用日志

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

Logger logger = LoggerFactory.getLogger(MyApp.class);

RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

logger.info("RogueMap created, size: {}", map.size());
```

### 2. 性能监控

```java
long startTime = System.nanoTime();

// 执行操作
for (int i = 0; i < 1_000_000; i++) {
    map.put("key" + i, (long) i);
}

long endTime = System.nanoTime();
long duration = (endTime - startTime) / 1_000_000; // ms
System.out.println("Write 1M entries: " + duration + " ms");
```

### 3. 定期检查

```java
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    int size = map.size();
    Runtime runtime = Runtime.getRuntime();
    long heapUsed = runtime.totalMemory() - runtime.freeMemory();

    System.out.println("Map size: " + size);
    System.out.println("Heap used: " + heapUsed / 1024 / 1024 + " MB");
}, 0, 1, TimeUnit.MINUTES);
```

## 生产环境建议

### 1. 配置文件化

```java
// application.properties
roguemap.maxMemory=2147483648
roguemap.dataDir=/var/data/roguemap
roguemap.segments=128

// 读取配置
long maxMemory = config.getLong("roguemap.maxMemory");
String dataDir = config.getString("roguemap.dataDir");
int segments = config.getInt("roguemap.segments");
```

### 2. 监控告警

```java
// 监控内存使用
if (heapUsed > maxMemory * 0.9) {
    logger.warn("Memory usage high: {}%", heapUsed * 100 / maxMemory);
    // 发送告警
}
```

### 3. 优雅关闭

```java
// Spring Boot 示例
@PreDestroy
public void destroy() {
    logger.info("Closing RogueMap...");
    try {
        map.close();
        logger.info("RogueMap closed successfully");
    } catch (Exception e) {
        logger.error("Error closing RogueMap", e);
    }
}
```

## 总结

**DO**:
- ✅ 使用 try-with-resources
- ✅ 优先使用原始类型
- ✅ 选择合适的索引
- ✅ 定期刷盘（持久化模式）
- ✅ 设置 JVM 参数
- ✅ 异常处理

**DON'T**:
- ❌ 忘记关闭
- ❌ 超出内存限制
- ❌ 编解码器不一致
- ❌ 忽略磁盘空间检查
- ❌ 复合操作不加锁

## 下一步

- [性能白皮书](../performance/benchmark) - 性能数据与分析
- [配置选项](./configuration.md) - 配置说明
