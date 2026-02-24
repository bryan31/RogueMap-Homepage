# 功能矩阵

这页用于“先选结构，再看能力边界”。

## 四种结构能力总览

| 能力 | RogueMap | RogueList | RogueSet | RogueQueue |
|---|---|---|---|---|
| 临时模式 `temporary()` | ✅ | ✅ | ✅ | ✅ |
| 持久化 `persistent(path)` | ✅ | ✅ | ✅ | ✅ |
| 自动扩容 `autoExpand` | ✅ | ✅ | ✅ | ✅ |
| 运行指标 `getMetrics()` | ✅ | ✅ | ✅ | ✅ |
| 手动刷盘 `flush()` | ✅ | ✅ | ✅ | ✅ |
| 显式检查点 `checkpoint()` | ✅ | ✅ | ✅ | ❌（链表队列由 `offer/poll` 自动快照） |
| 空间压缩 `compact()` | ✅ | ✅ | ✅ | ✅（仅链表队列） |
| 事务 | ✅（仅 `SegmentedHashIndex`） | ❌ | ❌ | ❌ |
| 迭代能力 | `forEach` | `Iterator` + `ListIterator` | `Iterator`（Fail-fast） | ❌ |

## 默认参数速查

| 项目 | 默认值 |
|---|---|
| `RogueMap.allocateSize` | `2GB` |
| `RogueList.allocateSize` | `256MB` |
| `RogueSet.allocateSize` | `256MB` |
| `RogueQueue.allocateSize` | `256MB` |
| `RogueMap.segmentedIndex` | `64` 段 |
| `RogueSet.segmentCount` | `64` 段 |

## 选型建议（按业务目标）

1. 需要多键原子写入：优先 `RogueMap`，并保持默认分段索引或显式 `segmentedIndex`。
2. 需要顺序遍历并保留插入顺序：优先 `RogueList`。
3. 重点是去重、存在性判断：优先 `RogueSet`。
4. 重点是 FIFO 消费：优先 `RogueQueue`。

## 容易踩坑的边界

- `RogueMap` 事务不支持 `basicIndex()` 与 `primitiveIndex()`。
- `RogueQueue.compact()` 只支持链表模式（`linked()`）。
- `segmentCount`/`segmentedIndex` 段数建议使用 2 的幂次方。
- 持久化恢复时，编解码器必须与首次写入保持一致。

## 下一步

- [上手路线（10 分钟）](./quick-start-path.md)
- [配置选项](./configuration.md)
- [常见问题与排障](./troubleshooting.md)
