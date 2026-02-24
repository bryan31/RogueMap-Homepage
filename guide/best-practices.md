# 最佳实践

本文档总结了使用 RogueMap 的最佳实践和常见陷阱。

## 资源管理

### 1. 使用 try-with-resources

```java
// 推荐 ✅
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    // 使用 map
    map.put("key", 100L);
} // 自动调用 close()，释放资源

// 避免 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close() 会导致资源泄漏
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
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 避免 ❌ - 序列化开销
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
// 如果可以用 Long，就不要用 String
```

### 2. 选择合适的索引

```java
// 高并发场景：SegmentedHashIndex
RogueMap<String, User> cache = RogueMap.<String, User>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .segmentedIndex(128) // 高并发
    .build();

// Long 键 + 内存敏感：LongPrimitiveIndex
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap()
    .temporary()
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

### 4. 开启自动扩容

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .allocateSize(256 * 1024 * 1024L) // 初始 256MB
    .autoExpand(true)  // 开启自动扩容
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

## 存储模式选择

### 1. Mmap Temp - 大数据临时处理

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

### 2. Mmap Persist - 持久化存储

```java
// 适合：需要持久化
RogueMap<String, Document> db = RogueMap.<String, Document>mmap()
    .persistent("data/documents.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Document.class))
    .allocateSize(20L * 1024 * 1024 * 1024) // 20GB
    .autoExpand(true)
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
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
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

## 常见陷阱

### 1. 忘记关闭

```java
// 错误 ❌
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
// 忘记调用 close()

// 正确 ✅
try (RogueMap<String, Long> map = ...) {
    // 使用
}
```

### 2. 编解码器不一致

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

### 3. 磁盘空间不足

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

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
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

## 总结

**DO**:
- ✅ 使用 try-with-resources
- ✅ 优先使用原始类型
- ✅ 选择合适的索引
- ✅ 定期刷盘（持久化模式）
- ✅ 异常处理

**DON'T**:
- ❌ 忘记关闭
- ❌ 编解码器不一致
- ❌ 忽略磁盘空间检查
- ❌ 复合操作不加锁

## 下一步

- [性能白皮书](../performance/benchmark) - 性能数据与分析
- [配置选项](./configuration.md) - 配置说明
- [运维指南](./operations.md) - 监控和维护
