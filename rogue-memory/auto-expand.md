# 自动扩容

RogueMemory 支持自动扩容功能，当记忆存储空间不足时自动按倍数扩大文件，无需预估容量或重新创建实例。

::: info 适用范围
自动扩容**适用于所有检索模式**（HYBRID、SEMANTIC、KEYWORD_ONLY），底层共享与 RogueMap 相同的 `MmapAllocator`，扩容机制与核心数据结构一致。
:::

---

## 启用自动扩容

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(64 * 1024 * 1024L)  // 初始 64MB
    .autoExpand(true)                  // 开启自动扩容
    .expandFactor(2.0)                 // 每次扩容为原来的 2 倍（默认）
    // .maxFileSize(10L * 1024 * 1024 * 1024)  // 可选：设置最大文件大小上限
    .build();
```

## 配置选项

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `autoExpand(true)` | 开启自动扩容 | false |
| `expandFactor(factor)` | 每次扩容的倍数，最小 1.1 | 2.0 |
| `maxFileSize(size)` | 文件大小上限（字节），0 表示无限制 | 0 |

---

## 扩容特性

- ✅ **透明扩容** — 扩容时仅对新增区域创建映射，已有记忆数据的地址完全不变
- ✅ **检索不受影响** — 扩容期间 HNSW 向量索引与 BM25 倒排索引正常工作，`search()` 无感知
- ✅ **线程安全** — 普通写入持读锁（CAS），扩容时独占写锁，扩容完成后自动继续
- ✅ **所有模式适用** — HYBRID、SEMANTIC、KEYWORD_ONLY 均支持

## 扩容过程

```
初始状态：
┌─────────────────────────────────────┐
│         64MB 文件空间                 │
│  ████████████████████░░░░░░░░░░░░░  │
│  (已使用)           (空闲)           │
└─────────────────────────────────────┘

记忆写入触发扩容：
┌─────────────────────────────────────┬─────────────────────────────────────┐
│         64MB 原有空间                 │         新增 64MB 空间                │
│  ████████████████████████████████   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│  (已使用)                            │  (新分配，继续写入记忆)                  │
└─────────────────────────────────────┴─────────────────────────────────────┘
                                                    ↓
                                          expandFactor(2.0)
```

---

## KEYWORD_ONLY 模式

KEYWORD_ONLY 模式（不使用向量）同样支持自动扩容：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)  // 纯关键词检索，无需 EmbeddingProvider
    .allocateSize(16 * 1024 * 1024L)
    .autoExpand(true)
    .build();
```

---

## 监控扩容

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .build();

// 获取当前文件大小
StorageMetrics metrics = mem.getMetrics();
System.out.println("当前文件大小: " + metrics.getTotalFileSize());

// 大量写入记忆后检查
for (int i = 0; i < 100_000; i++) {
    mem.add("记忆内容 " + i, Map.of("batch", "import"), "knowledge");
}

metrics = mem.getMetrics();
System.out.println("扩容后文件大小: " + metrics.getTotalFileSize());
```

---

## 扩容与持久化恢复

扩容后的数据在 `close()` + 重新打开后完整保留：

```java
// 第一轮：写入记忆，触发扩容
RogueMemory mem1 = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(16 * 1024)   // 16KB，极易触发扩容
    .autoExpand(true)
    .build();

List<String> ids = new ArrayList<>();
for (int i = 0; i < 500; i++) {
    ids.add(mem1.add("持久化记忆内容 " + i, Map.of("idx", String.valueOf(i)), "docs"));
}
mem1.close();

// 第二轮：重新打开，所有记忆完整恢复
RogueMemory mem2 = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(provider)
    .allocateSize(16 * 1024)
    .autoExpand(true)
    .build();

for (String id : ids) {
    MemoryEntry entry = mem2.get(id);
    assert entry != null;  // 所有数据完整恢复
}
mem2.close();
```

---

## 最佳实践

| 场景 | 推荐配置 | 说明 |
|------|---------|------|
| AI Agent 长期记忆 | `autoExpand(true)` + `maxFileSize(2GB)` | 记忆量不可预估，设上限防磁盘写满 |
| 知识库批量导入 | `autoExpand(true)` + `expandFactor(4.0)` | 数据量大，大倍数减少扩容次数 |
| 固定规模测试 | `autoExpand(false)` + 足够大的 `allocateSize` | 数据量已知，无需扩容开销 |

::: warning 注意
不开启 `autoExpand` 且 `allocateSize` 不足时，写入超过容量的记忆会抛出异常。建议生产环境始终开启 `autoExpand(true)`。
:::

---

## 下一步

- [持久化与运维](./persistence.md) — 文件结构、恢复机制与空间回收
- [存储结构与性能](./storage-and-performance.md) — 底层存储细节
