# 检查点与自动检查点

`checkpoint()` 用于强制将索引持久化到磁盘。调用后，即使进程崩溃（不调用 `close()`），下次打开文件时也能直接加载索引，避免全量扫描重建。

---

## 手动 checkpoint

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .build();

// 写入记忆
mem.add("用户喜欢简洁的代码风格", Map.of("type", "preference"), "user-1");
mem.add("项目 deadline 是下周五", Map.of("type", "task"), "user-1");

// 创建检查点——崩溃后可从此点恢复
mem.checkpoint();

// 继续写入...
mem.add("用户使用深色主题", Map.of("type", "preference"), "user-1");
// 如果此时崩溃，恢复到第一次 checkpoint 时的状态
```

### 适合场景

- 长时间运行的 AI Agent，需要定期保存防止意外崩溃后漫长的全量重建
- 批量写入记忆后，确保数据已持久化
- 重要操作完成后，主动建立恢复点

---

## 自动检查点（AutoCheckpoint）

RogueMemory 支持基于时间间隔和操作次数的自动检查点，无需手动调用 `checkpoint()`。

### 按时间间隔触发

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 每 5 分钟自动 checkpoint
    .build();
```

### 按操作次数触发

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(1000)  // 每 1000 次写操作自动 checkpoint
    .build();
```

### 两种模式同时开启

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 时间触发
    .autoCheckpoint(1000)                // 操作次数触发
    // 任一条件满足即执行 checkpoint
    .build();
```

触发 checkpoint 的写操作包括 `add()`、`delete()`、`update()`。

::: tip 实现细节
- 使用守护线程池（`ScheduledExecutorService`），不阻塞业务线程。
- 操作计数器采用 CAS 原子操作，避免重复触发。
- `close()` 时自动停止自动检查点线程。
:::

---

## checkpoint vs close

| 操作 | 持久化索引 | 崩溃恢复 | 继续使用 |
|-----|-----------|---------|---------|
| `checkpoint()` | ✅ | ✅ | ✅ |
| `close()` | ✅ | ✅ | ❌（实例已关闭） |

- **`checkpoint()`** — 将 HNSW 向量索引、BM25 倒排索引、序数注册表写入文件，`dirty` 标记置为 0。实例仍可继续使用。
- **`close()`** — 自动执行 checkpoint + flush，然后释放所有资源。实例不可再使用。

---

## 配置建议

| 场景 | 推荐配置 | 说明 |
|------|---------|------|
| 长期运行 Agent | `autoCheckpoint(5, TimeUnit.MINUTES)` | 适合写入速率稳定的场景，推荐 1-10 分钟 |
| 批量导入数据 | `autoCheckpoint(5000)` | 适合突发写入，推荐每 500-5000 次操作 |
| 混合负载 | 两种同时开启 | 覆盖不同负载模式，任一条件满足即触发 |

---

## 下一步

- [持久化与运维](./persistence.md) — 文件结构、恢复机制与空间回收
- [存储结构与性能](./storage-and-performance.md) — 底层存储细节
