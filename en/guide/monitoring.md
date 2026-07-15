# Monitoring indicators

RogueMap provides the `StorageMetrics` interface for monitoring storage status, fragmentation rate, and space usage.

## Get indicators

```java
StorageMetrics metrics = map.getMetrics();
```

## Indicator description

| Indicators | Method | Description |
|-----|------|------|
| File size | `getTotalFileSize()` | Total current file size (bytes) |
| Used space | `getUsedBytes()` | Allocated used space (bytes) |
| Free space | `getAvailableBytes()` | Remaining free space (bytes) |
| Number of entries | `getEntryCount()` | Number of key-value pairs currently stored |
| Active data | `getLiveBytes()` | Space occupied by active data (bytes) |
| Fragmented space | `getDeadBytes()` | Space occupied by deleted data (bytes) |
| Fragmentation rate | `getFragmentationRatio()` | Fragmentation rate (0.0 - 1.0) |
| Is it a temporary file | `isTemporary()` | Is it a temporary file mode |
| File path | `getFilePath()` | File storage path |

### LowHeapStringIndex special indicator

When using `lowHeapIndex()`, you can also obtain the following indicators:

```java
StorageMetrics metrics = map.getMetrics();
long heapEstimate = metrics.getIndexHeapBytesEstimate();  // Heap memory estimate
long mmapBytes = metrics.getIndexMmapBytes();             // mmap occupied
double avgKeyBytes = metrics.getAvgKeyBytes();            // average bond length
```

## Monitoring example

```java
public void printMetrics(RogueMap<String, Long> map) {
    StorageMetrics metrics = map.getMetrics();

    System.out.println("=== RogueMap monitoring indicators ===");
    System.out.println("File size:" + formatSize(metrics.getTotalFileSize()));
    System.out.println("Used:" + formatSize(metrics.getUsedBytes()));
    System.out.println("Available space:" + formatSize(metrics.getAvailableBytes()));
    System.out.println("Number of entries:" + metrics.getEntryCount());
    System.out.println("Active data:" + formatSize(metrics.getLiveBytes()));
    System.out.println("Fragmented space:" + formatSize(metrics.getDeadBytes()));
    System.out.println("Fragmentation rate:" + String.format("%.2f%%", metrics.getFragmentationRatio() * 100));
    System.out.println("Temporary files:" + metrics.isTemporary());
    System.out.println("File path:" + metrics.getFilePath());
}

private String formatSize(long bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)) + " MB";
    return (bytes / (1024 * 1024 * 1024)) + " GB";
}
```

## Alarm settings

```java
public void checkHealth(RogueMap<String, Long> map) {
    StorageMetrics metrics = map.getMetrics();

    // Check fragmentation rate
    if (metrics.getFragmentationRatio() > 0.5) {
        log.warn("Fragmentation rate is too high: {}%, it is recommended to perform compact",
            metrics.getFragmentationRatio() * 100);
    }

    // Check space usage
    double usageRate = (double) metrics.getUsedBytes() / metrics.getTotalFileSize();
    if (usageRate > 0.9) {
        log.warn("Space usage is too high: {}%, please consider expanding the capacity", usageRate * 100);
    }

    // Check if compact is required
    if (metrics.shouldCompact(0.3)) {
        log.info("It is recommended to execute compact to reclaim space");
    }
}
```

## Prometheus integration

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

## Complete operation and maintenance script

```java
public class RogueMapMaintenance {
    private final RogueMap<String, Long> map;
    private final ScheduledExecutorService scheduler;

    public RogueMapMaintenance(RogueMap<String, Long> map) {
        this.map = map;
        this.scheduler = Executors.newScheduledThreadPool(2);
    }

    public void start() {
        // Periodic checkpoint (every 5 minutes)
        scheduler.scheduleAtFixedRate(this::doCheckpoint,
            5, 5, TimeUnit.MINUTES);

        // Periodic health check (every 1 minute)
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

## Next step

- [Space Reclamation ](./compact.md) — Perform compact when the fragmentation rate is too high
- [Automatic expansion ](./auto-expand.md) — Automatic expansion when space is insufficient
- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
