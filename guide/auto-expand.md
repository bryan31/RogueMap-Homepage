# 自动扩容

RogueMap 支持自动扩容功能，当文件空间不足时自动按倍数扩大文件，无需重新创建实例。

::: info 适用范围
自动扩容**适用于所有四种数据结构**（RogueMap、RogueList、RogueSet、RogueQueue），且仅在持久化模式下生效。底层共享同一个 `MmapAllocator`，扩容机制对所有数据结构一致。
:::

## 各数据结构支持情况

| 数据结构 | `autoExpand()` | `expandFactor()` | `maxFileSize()` |
|---|---|---|---|
| RogueMap | ✅ | ✅ | ✅ |
| RogueList | ✅ | ✅ | ✅ |
| RogueSet | ✅ | ✅ | ✅ |
| RogueQueue | ✅ | ✅ | ✅ |

所有数据结构的配置方式完全相同，均在 Builder 链式调用中设置。

## 启用自动扩容

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

## 配置选项

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `autoExpand(true)` | 开启自动扩容 | false |
| `expandFactor(factor)` | 每次扩容的倍数 | 2.0 |
| `maxFileSize(size)` | 文件大小上限（字节） | 0（无限制） |

## 扩容特性

- ✅ **透明扩容** — 扩容时仅对新增区域创建映射，已有数据地址完全不变
- ✅ **线程安全** — 普通写入持读锁，扩容时独占写锁，扩容完成后继续
- ✅ **按需增长** — 文件满时自动触发，无需预估容量

## 扩容过程

```
初始状态：
┌─────────────────────────────────────┐
│         64MB 文件空间                 │
│  ████████████████████░░░░░░░░░░░░░  │
│  (已使用)           (空闲)           │
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

## 监控扩容

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

## 最佳实践

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

## 其他数据结构示例

RogueList、RogueSet、RogueQueue 的自动扩容配置方式与 RogueMap 完全一致：

```java
// RogueList
RogueList<String> list = RogueList.<String>mmap()
    .persistent("data/list.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();

// RogueSet
RogueSet<String> set = RogueSet.<String>mmap()
    .persistent("data/set.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();

// RogueQueue
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .allocateSize(64 * 1024 * 1024L)
    .autoExpand(true)
    .expandFactor(2.0)
    .codec(StringCodec.INSTANCE)
    .build();
```

## 下一步

- [空间回收](./compact.md) — 回收碎片空间
- [监控指标](./monitoring.md) — 监控文件大小和使用率
- [配置选项](./configuration.md) — 完整配置参数速查
