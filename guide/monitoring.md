# 监控指标

RogueMap 提供 `StorageMetrics` 接口，用于监控存储状态、碎片率和空间使用情况。

## 获取指标

```java
StorageMetrics metrics = map.getMetrics();
```

## 指标说明

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

### LowHeapStringIndex 专用指标

使用 `lowHeapIndex()` 时，还可以获取以下指标：

```java
StorageMetrics metrics = map.getMetrics();
long heapEstimate = metrics.getIndexHeapBytesEstimate();  // 堆内存估算
long mmapBytes = metrics.getIndexMmapBytes();             // mmap 占用
double avgKeyBytes = metrics.getAvgKeyBytes();            // 平均键长度
```

## 监控示例

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

## 告警设置

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

## Prometheus 集成

```java
public class RogueMapMetricsExporter {
    private final RogueMap<String, Long> map;

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

        if (metrics.getFragmentationRatio() > 0.5) {
            log.warn("High fragmentation: {}%",
                metrics.getFragmentationRatio() * 100);
        }

        double usageRate = (double) metrics.getUsedBytes() / metrics.getTotalFileSize();
        if (usageRate > 0.9) {
            log.warn("High disk usage: {}%", usageRate * 100);
        }

        log.info("Health check - Entries: {}, FileSize: {}, Fragmentation: {}%",
            metrics.getEntryCount(),
            metrics.getTotalFileSize() / (1024 * 1024) + "MB",
            metrics.getFragmentationRatio() * 100);
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

## 下一步

- [空间回收](./compact.md) — 碎片率过高时执行 compact
- [自动扩容](./auto-expand.md) — 空间不足时自动扩容
- [自动检查点](./auto-checkpoint.md) — 自动持久化保障
