# 持久化

RogueMap 的 Mmap 持久化模式支持将数据持久化到磁盘，并在应用重启后自动恢复。

## 基本使用

### 创建持久化 Map

```java
// 第一次运行：创建并写入数据
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("alice", 100L);
map.put("bob", 200L);
map.put("charlie", 300L);

map.close(); // 自动刷盘
```

### 恢复数据

```java
// 第二次运行：重新打开并恢复数据
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

Long score = map.get("alice");  // 100L（从磁盘恢复）
System.out.println("Alice's score: " + score);
```

## 文件结构

### 文件头（Header）

```
File Header (4KB)
┌────────────────────────────────┐
│ Magic Number (4 bytes)         │ 0x524D4150 ("RMAP")
├────────────────────────────────┤
│ Version (4 bytes)               │ 1
├────────────────────────────────┤
│ Allocated Size (8 bytes)        │ 1073741824
├────────────────────────────────┤
│ Current Offset (8 bytes)        │ 当前写入位置
├────────────────────────────────┤
│ Entry Count (4 bytes)           │ 条目数量
├────────────────────────────────┤
│ Reserved (4060 bytes)           │ 预留空间
└────────────────────────────────┘
```

### 数据区

```
Data Area
┌────────────────────────────────┐
│ Entry 1                         │
│ ├─ Key Data                     │
│ ├─ Value Data                   │
│ └─ Metadata                     │
├────────────────────────────────┤
│ Entry 2                         │
├────────────────────────────────┤
│ ...                             │
└────────────────────────────────┘
```

## 刷盘机制

### 自动刷盘

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("key1", 100L);
map.put("key2", 200L);

// close() 会自动调用 flush()
map.close();
```

### 手动刷盘

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 写入大量数据
for (int i = 0; i < 1000000; i++) {
    map.put("key" + i, (long) i);
}

// 手动刷盘
map.flush();

// 继续使用
Long value = map.get("key1");
```

### 定期刷盘

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 启动定期刷盘线程
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    map.flush();
    System.out.println("Flushed to disk");
}, 1, 5, TimeUnit.MINUTES); // 每 5 分钟刷盘一次

// 应用结束时
scheduler.shutdown();
map.close();
```

## 数据恢复

### 正常恢复

```java
// 应用正常关闭后重启
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 数据自动恢复
int size = map.size();
System.out.println("Recovered entries: " + size);
```

### 异常恢复

```java
// 应用异常崩溃后重启
try {
    RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build();

    // 恢复上次刷盘的数据
    // 未刷盘的数据可能丢失
    System.out.println("Recovered entries: " + map.size());
} catch (Exception e) {
    // 文件损坏
    System.err.println("Failed to recover: " + e.getMessage());
}
```

## 预分配策略

### 固定大小预分配

```java
// 预分配 10GB 空间
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .allocateSize(10L * 1024 * 1024 * 1024) // 10GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

### 根据数据量估算

```java
long recordCount = 10_000_000; // 1000 万条记录
int avgKeySize = 20; // 平均键大小
int avgValueSize = 100; // 平均值大小
double safetyFactor = 1.5; // 安全系数

long estimatedSize = (long) (recordCount * (avgKeySize + avgValueSize) * safetyFactor);

RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data.db")
    .allocateSize(estimatedSize)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

## 多文件管理

### 分片存储

```java
// 按日期分片
String date = LocalDate.now().toString();
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/metrics_" + date + ".db")
    .allocateSize(1024 * 1024 * 1024L)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 多实例管理

```java
// 管理多个持久化 Map
Map<String, RogueMap<String, Long>> maps = new HashMap<>();

// 创建多个实例
maps.put("users", RogueMap.<String, Long>mmap()
    .persistent("data/users.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build());

maps.put("sessions", RogueMap.<String, Long>mmap()
    .persistent("data/sessions.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build());

// 使用
maps.get("users").put("alice", 100L);
maps.get("sessions").put("session1", System.currentTimeMillis());

// 关闭所有
for (RogueMap<String, Long> map : maps.values()) {
    map.close();
}
```

## 数据迁移

### 导出数据

```java
// 从旧文件导出
RogueMap<String, Long> oldMap = RogueMap.<String, Long>mmap()
    .persistent("data/old.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 导出到新文件
RogueMap<String, Long> newMap = RogueMap.<String, Long>mmap()
    .persistent("data/new.db")
    .allocateSize(2L * 1024 * 1024 * 1024) // 2GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 迁移数据（需要实现迭代功能）
// 示例：假设有 getAllEntries() 方法
for (Map.Entry<String, Long> entry : oldMap.getAllEntries()) {
    newMap.put(entry.getKey(), entry.getValue());
}

oldMap.close();
newMap.close();
```

## 最佳实践

### 1. 定期刷盘

```java
// 重要数据定期刷盘
ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
scheduler.scheduleAtFixedRate(() -> {
    try {
        map.flush();
    } catch (Exception e) {
        logger.error("Flush failed", e);
    }
}, 0, 5, TimeUnit.MINUTES);
```

### 2. 优雅关闭

```java
// 注册 Shutdown Hook
Runtime.getRuntime().addShutdownHook(new Thread(() -> {
    System.out.println("Closing RogueMap...");
    map.close(); // 自动刷盘
    System.out.println("RogueMap closed.");
}));
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
    map.put("key", 100L);

} catch (Exception e) {
    logger.error("Error using RogueMap", e);
} finally {
    if (map != null) {
        try {
            map.close();
        } catch (Exception e) {
            logger.error("Error closing RogueMap", e);
        }
    }
}
```

### 4. 文件路径规范

```java
// 使用绝对路径或相对于工作目录的路径
String dataDir = System.getProperty("user.dir") + "/data";
new File(dataDir).mkdirs(); // 确保目录存在

RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent(dataDir + "/mydata.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

## 注意事项

### 1. 编解码器一致性

```java
// 创建时的编解码器
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.close();

// 恢复时必须使用相同的编解码器 ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // 相同
    .valueCodec(PrimitiveCodecs.LONG) // 相同
    .build();

// 使用不同的编解码器会导致数据损坏 ❌
```

### 2. 文件大小限制

```java
// allocateSize() 会立即占用磁盘空间
// 确保磁盘有足够空间
long freeSpace = new File("/").getFreeSpace();
long allocateSize = 10L * 1024 * 1024 * 1024; // 10GB

if (freeSpace < allocateSize) {
    throw new IllegalStateException("Not enough disk space");
}
```

### 3. 并发访问

```java
// 不支持多进程并发访问同一文件
// 一个文件同时只能被一个 RogueMap 实例打开
```

## 下一步

- [配置选项](./configuration.md) - 详细配置说明
- [最佳实践](./best-practices.md) - 使用建议
- [性能白皮书](../performance/) - 性能数据与分析
