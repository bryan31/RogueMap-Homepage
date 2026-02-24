# 运维指南

本文档介绍 RogueMap 的运维功能，包括自动扩容、空间回收、检查点和监控指标。

## 自动扩容

### 概述

RogueMap 支持自动扩容功能，当文件空间不足时自动按倍数扩大文件，无需重新创建实例。

### 启用自动扩容

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(64 * 1024 * 1024L)  // 初始 64MB
    .autoExpand(true)                  // 开启自动扩容
    .expandFactor(2.0)                 // 每次扩容为原来的 2 倍（默认）
    // .maxFileSize(10L * 1024 * 1024 * 1024)  // 可选：设置最大文件大小上限
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 配置选项

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `autoExpand(true)` | 开启自动扩容 | false |
| `expandFactor(factor)` | 每次扩容的倍数 | 2.0 |
| `maxFileSize(size)` | 文件大小上限（字节） | 0（无限制） |

### 扩容特性

- ✅ **透明扩容** - 扩容时仅对新增区域创建映射，已有数据地址完全不变
- ✅ **线程安全** - 普通写入持读锁，扩容时独占写锁，扩容完成后继续
- ✅ **按需增长** - 文件满时自动触发，无需预估容量

### 扩容过程

```
初始状态：
┌─────────────────────────────────────┐
│         64MB 文件空间                 │
│  ████████████████████░░░░░░░░░░░░░  │
│  (已使用)           (空闲)│
└─────────────────────────────────────┘

写入触发扩容：
┌─────────────────────────────────────┬─────────────────────────────────────┐
│         64MB 原有空间                 │         新增 64MB 空间                │
│  ████████████████████████████████   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  (已使用)                            │  (新分配，继续写入)                    │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                                    ↓
                                          expandFactor(2.0)
```

### 监控扩容

```java
// 获取当前文件大小
StorageMetrics metrics = map.getMetrics();
System.out.println("当前文件大小: " + metrics.getTotalFileSize());

// 写入数据后再次检查
for (int i = 0; i < 10_000_000; i++) {
    map.put("key-" + i, (long) i);
}

metrics = map.getMetrics();
System.out.println("扩容后文件大小: " + metrics.getTotalFileSize());
```

### 最佳实践

```java
// 场景1：不确定数据量，开启自动扩容
RogueMap<String, String> map = RogueMap.<String, String>mmap()
    .persistent("data/app.db")
    .allocateSize(128 * 1024 * 1024L)  // 初始 128MB
    .autoExpand(true)
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// 场景2：数据量可控，预估容量避免扩容开销
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .persistent("data/known.db")
    .allocateSize(10L * 1024 * 1024 * 1024)  // 直接分配 10GB
    .autoExpand(false)  // 不需要自动扩容
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 场景3：限制最大文件大小
RogueMap<String, byte[]> map = RogueMap.<String, byte[]>mmap()
    .persistent("data/cache.db")
    .allocateSize(256 * 1024 * 1024L)
    .autoExpand(true)
    .maxFileSize(2L * 1024 * 1024 * 1024)  // 最大 2GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(new BytesCodec())
    .build();
```

## 空间回收

### 概述

随着数据的写入、更新和删除，存储文件中会产生碎片（已删除/旧数据占用的空间）。`compact()` 方法用于回收这些空间。

### 使用compact

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 大量写入和删除操作后...
for (int i = 0; i < 1000000; i++) {
    map.put("key-" + i, (long) i);
}
for (int i = 0; i < 500000; i++) {
    map.remove("key-" + i);  // 删除一半数据，产生碎片
}

// 检查碎片率
StorageMetrics metrics = map.getMetrics();
System.out.println("碎片率: " + (metrics.getFragmentationRatio() * 100) + "%");

// 执行 compact
map = map.compact(256* 1024 * 1024L);  // 压缩到新文件，256MB
```

### compact 原理

```
压缩前：
┌─────────────────────────────────────────────┐
│  数据1  │  碎片  │  数据2  │  碎片  │  数据3  │
└─────────────────────────────────────────────┘

压缩后：
┌─────────────────────────┐
│  数据1  │  数据2  │  数据3  │
└─────────────────────────┘
```

### 判断是否需要 compact

```java
StorageMetrics metrics = map.getMetrics();

// 方式1：使用内置判断方法
if (metrics.shouldCompact(0.5)) {  // 碎片率 > 50%
    map = map.compact(newAllocateSize);
}

// 方式2：自定义判断
double fragmentation = metrics.getFragmentationRatio();
if (fragmentation > 0.3) {  // 碎片率 > 30%
    map = map.compact(newAllocateSize);
}
```

### compact 注意事项

::: warning 重要
- `compact()` 会返回**新的 RogueMap 实例**，原实例已关闭
- 仅 MMAP持久化模式支持 compact
- 临时文件不支持 compact
- 使用方式：`map = map.compact(newSize);`
:::

```java
// 正确用法 ✅
map = map.compact(512 * 1024 * 1024L);

// 错误用法 ❌
map.compact(512 * 1024 * 1024L);  // 原实例已关闭，但没有接收新实例
map.get("key");  // 抛出异常！
```

## 检查点

### 概述

`checkpoint()` 用于强制持久化索引到磁盘。调用后，即使进程崩溃（不调用 close()），下次打开文件时也能恢复到最近一次 checkpoint 时的状态。

### 使用 checkpoint

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 写入数据
for (int i = 0; i < 10000; i++) {
    map.put("key-" + i, (long) i);
}

// 创建检查点
map.checkpoint();  // 确保持久化，崩溃后可恢复

// 继续写入...
for (int i = 10000; i < 20000; i++) {
    map.put("key-" + i, (long) i);
}
// 如果此时崩溃，只能恢复到 10000 条数据
```

### checkpoint vs close

| 操作 | 持久化索引 | 崩溃恢复 | 继续使用 |
|-----|-----------|---------|---------|
| `checkpoint()` | ✅ | ✅ | ✅ |
| `close()` | ✅ | ✅ | ❌（实例已关闭） |

### 最佳实践

```java
// 场景1：定期 checkpoint
ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
scheduler.scheduleAtFixedRate(() -> {
    map.checkpoint();
    log.info("Checkpoint completed");
}, 0, 5, TimeUnit.MINUTES);  // 每 5 分钟

// 场景2：批量写入后 checkpoint
for (int batch = 0; batch < 100; batch++) {
    for (int i = 0; i < 1000; i++) {
        map.put("key-" + (batch * 1000 + i), (long) i);
    }
    map.checkpoint();  // 每批写入后checkpoint
}

// 场景3：事务提交后 checkpoint
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key1", 100L);
    txn.put("key2", 200L);
    txn.commit();
}
map.checkpoint();  // 确保事务结果持久化
```

### 注意事项

- `checkpoint()` 仅对持久化模式有效
- 每次checkpoint 会消耗文件空间存储索引快照
- 可通过 `compact()` 回收checkpoint 占用的空间

## 监控指标

### 获取指标

```java
StorageMetrics metrics = map.getMetrics();
```

### 指标说明

| 指标 | 方法 | 说明 |
|-----|------|------|
| 文件大小 | `getTotalFileSize()` | 当前文件总大小（字节） |
| 已使用空间 | `getUsedBytes()` | 已分配使用的空间（字节） |
| 可用空间 | `getAvailableBytes()` | 剩余可用空间（字节） |
| 条目数 | `getEntryCount()` | 当前存储的键值对数量 |
| 活跃数据 | `getLiveBytes()` | 活跃数据占用的空间（字节） |
| 碎片空间 | `getDeadBytes()` | 已删除数据占用的空间（字节） |
| 碎片率 | `getFragmentationRatio()` | 碎片率（0.0 - 1.0） |
| 是否临时文件 | `isTemporary()` | 是否为临时文件模式 |
| 文件路径 | `getFilePath()` | 文件存储路径 |

### 监控示例

```java
public void printMetrics(RogueMap<String, Long> map) {
    StorageMetrics metrics = map.getMetrics();

    System.out.println("=== RogueMap 监控指标 ===");
    System.out.println("文件大小: " + formatSize(metrics.getTotalFileSize()));
    System.out.println("已使用: " + formatSize(metrics.getUsedBytes()));
    System.out.println("可用空间: " + formatSize(metrics.getAvailableBytes()));
    System.out.println("条目数: " + metrics.getEntryCount());
    System.out.println("活跃数据: " + formatSize(metrics.getLiveBytes()));
    System.out.println("碎片空间: " + formatSize(metrics.getDeadBytes()));
    System.out.println("碎片率: " + String.format("%.2f%%", metrics.getFragmentationRatio() * 100));
    System.out.println("临时文件: " + metrics.isTemporary());
    System.out.println("文件路径: " + metrics.getFilePath());
}

private String formatSize(long bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)) + " MB";
    return (bytes / (1024 * 1024 * 1024)) + " GB";
}
```

### 监控告警

```java
public void checkHealth(RogueMap<String, Long> map) {
    StorageMetrics metrics = map.getMetrics();

    // 检查碎片率
    if (metrics.getFragmentationRatio() > 0.5) {
        log.warn("碎片率过高: {}%，建议执行 compact",
            metrics.getFragmentationRatio() * 100);
    }

    // 检查空间使用率
    double usageRate = (double) metrics.getUsedBytes() / metrics.getTotalFileSize();
    if (usageRate > 0.9) {
        log.warn("空间使用率过高: {}%，请考虑扩容", usageRate * 100);
    }

    // 检查是否需要 compact
    if (metrics.shouldCompact(0.3)) {
        log.info("建议执行 compact 回收空间");
    }
}
```

### 集成监控系统

```java
// 与 Prometheus 集成示例
public class RogueMapMetricsExporter {
    private final RogueMap<String, Long> map;

    // Prometheus 指标
    private final Gauge fileSizeGauge = Gauge.build()
        .name("roguemap_file_size_bytes")
        .help("Current file size in bytes")
        .register();

    private final Gauge entryCountGauge = Gauge.build()
        .name("roguemap_entry_count")
        .help("Number of entries")
        .register();

    private final Gauge fragmentationGauge = Gauge.build()
        .name("roguemap_fragmentation_ratio")
        .help("Fragmentation ratio")
        .register();

    public void export() {
        StorageMetrics metrics = map.getMetrics();
        fileSizeGauge.set(metrics.getTotalFileSize());
        entryCountGauge.set(metrics.getEntryCount());
        fragmentationGauge.set(metrics.getFragmentationRatio());
    }
}
```

## 完整运维脚本

```java
public class RogueMapMaintenance {
    private final RogueMap<String, Long> map;
    private final ScheduledExecutorService scheduler;

    public RogueMapMaintenance(RogueMap<String, Long> map) {
        this.map = map;
        this.scheduler = Executors.newScheduledThreadPool(2);
    }

    public void start() {
        // 定期 checkpoint（每 5 分钟）
        scheduler.scheduleAtFixedRate(this::doCheckpoint,
            5, 5, TimeUnit.MINUTES);

        // 定期健康检查（每 1 分钟）
        scheduler.scheduleAtFixedRate(this::doHealthCheck,
            1, 1, TimeUnit.MINUTES);
    }

    private void doCheckpoint() {
        try {
            map.checkpoint();
            log.info("Checkpoint completed successfully");
        } catch (Exception e) {
            log.error("Checkpoint failed", e);
        }
    }

    private void doHealthCheck() {
        StorageMetrics metrics = map.getMetrics();

        // 检查碎片率
        if (metrics.getFragmentationRatio() > 0.5) {
            log.warn("High fragmentation: {}%",
                metrics.getFragmentationRatio() * 100);
        }

        // 检查空间使用
        double usageRate = (double) metrics.getUsedBytes() / metrics.getTotalFileSize();
        if (usageRate > 0.9) {
            log.warn("High disk usage: {}%", usageRate * 100);
        }

        log.info("Health check - Entries: {}, FileSize: {}, Fragmentation: {}%",
            metrics.getEntryCount(),
            metrics.getTotalFileSize() / (1024 * 1024) + "MB",
            metrics.getFragmentationRatio() * 100);
    }

    public void doCompact(long newSize) {
        log.info("Starting compact...");
        map = map.compact(newSize);
        log.info("Compact completed");
    }

    public void stop() {
        scheduler.shutdown();
        try {
            scheduler.awaitTermination(10, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

## 最佳实践总结

| 场景 | 建议 |
|-----|------|
| 不确定数据量 | 开启 `autoExpand(true)` |
| 数据量可控 | 预估容量，避免扩容开销 |
| 大量删除操作 | 定期检查碎片率，必要时 compact |
| 关键数据 | 定期 checkpoint，确保崩溃恢复 |
| 生产环境 | 集成监控，设置告警阈值 |

## 下一步

- [事务](./transaction.md) - 事务使用
- [最佳实践](./best-practices.md) - 更多使用建议
- [配置选项](./configuration.md) - 详细配置
