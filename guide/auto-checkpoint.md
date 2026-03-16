# 检查点与自动检查点

`checkpoint()` 用于强制持久化索引到磁盘。调用后，即使进程崩溃（不调用 `close()`），下次打开文件时也能恢复到最近一次 checkpoint 时的状态。

## 手动 checkpoint

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

### 批量写入后 checkpoint

```java
for (int batch = 0; batch < 100; batch++) {
    for (int i = 0; i < 1000; i++) {
        map.put("key-" + (batch * 1000 + i), (long) i);
    }
    map.checkpoint();  // 每批写入后 checkpoint
}
```

### 事务提交后 checkpoint

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key1", 100L);
    txn.put("key2", 200L);
    txn.commit();
}
map.checkpoint();  // 确保事务结果持久化
```

## 自动检查点（AutoCheckpoint）

RogueMap 支持基于时间间隔和操作次数的自动检查点，避免手动调用 `checkpoint()` 的繁琐。

### 按时间间隔触发

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 每 5 分钟自动 checkpoint
    .build();
```

### 按操作次数触发

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .autoCheckpoint(10000)  // 每 10000 次写操作自动 checkpoint
    .build();
```

### 两种模式同时开启

```java
.autoCheckpoint(5, TimeUnit.MINUTES)  // 时间触发
.autoCheckpoint(10000)                // 操作次数触发
// 任一条件满足即执行 checkpoint
```

::: tip 实现细节
- 使用守护线程池（`ScheduledExecutorService`），不阻塞业务线程。
- 操作计数器采用 CAS 原子操作，避免重复触发。
- 仅在持久化模式下生效；临时模式下自动跳过。
- 所有四种数据结构均支持。
:::

## checkpoint vs flush vs close

| 操作 | 持久化索引 | 崩溃恢复 | 继续使用 |
|-----|-----------|---------|---------|
| `checkpoint()` | ✅ | ✅ | ✅ |
| `flush()` | ❌（仅同步数据页） | ❌ | ✅ |
| `close()` | ✅ | ✅ | ❌（实例已关闭） |

- **`checkpoint()`**：将索引和元数据快照写入文件，是完整的持久化点。崩溃后可从此点恢复。
- **`flush()`**：将内存中修改过的页面同步到磁盘，但不保存索引快照。
- **`close()`**：自动调用 checkpoint + flush，然后释放资源。

## 最佳实践

### 配置建议

- **时间间隔模式** — 适合写入速率稳定的场景，推荐 1-10 分钟。
- **操作次数模式** — 适合突发写入的场景，推荐每 1000-50000 次操作触发一次。
- 两种模式可同时开启（OR 逻辑），建议组合使用以覆盖不同负载模式。

### 定期 checkpoint

```java
ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
scheduler.scheduleAtFixedRate(() -> {
    map.checkpoint();
    log.info("Checkpoint completed");
}, 0, 5, TimeUnit.MINUTES);  // 每 5 分钟
```

### 注意事项

- `checkpoint()` 仅对持久化模式有效
- 每次 checkpoint 会消耗文件空间存储索引快照
- 可通过 [compact](./compact.md) 回收 checkpoint 占用的空间

## 下一步

- [持久化与崩溃恢复](./persistence.md) — 持久化机制详解
- [空间回收](./compact.md) — 回收碎片空间
- [配置选项](./configuration.md) — 完整配置参数速查
