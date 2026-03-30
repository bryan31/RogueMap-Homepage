# 持久化与运维

RogueMemory 的所有数据基于 mmap 持久化存储。本文介绍持久化恢复与空间回收。

关于检查点与自动检查点，请参考 [检查点与自动检查点](./auto-checkpoint.md)。

---

## 文件结构

调用 `persistent("data/mem")` 后，RogueMemory 会创建以下文件：

| 文件 | 说明 |
|---|---|
| `data/mem.mem` | 主数据文件（mmap），4KB 文件头 + 记录数据 + 序数注册表 + BM25 索引 |
| `data/mem.hnsw` | HNSW 向量索引 |

### 文件头（4KB）

```
┌──────────────────────────────────────────┐
│ magic     │ 4B int  │ 0x524D4150 ("RMAP") │
│ version   │ 4B int  │ 2                    │
│ dataType  │ 4B int  │ 5 (MEMORY)           │
│ dirty     │ 4B int  │ 1=脏, 0=干净         │
│ ...       │ 剩余    │ 对齐填充至 4KB        │
└──────────────────────────────────────────┘
```

`dirty` 标记在 `build()` 时置为 1，`close()` / `checkpoint()` 成功后置为 0。用于检测上次是否正常关闭。

---

## 持久化与恢复

### 正常关闭

`close()` 时自动将所有索引持久化到磁盘：

1. HNSW 向量索引序列化到 `.hnsw` 文件
2. BM25 倒排索引序列化到 `.mem` 文件尾部
3. 序数注册表（UUID → int 映射）序列化到 `.mem` 文件尾部
4. `dirty` 标记置为 0

### 恢复机制

下次用相同路径打开时：

| 上次状态 | 恢复方式 | 说明 |
|---|---|---|
| 正常关闭（dirty=0） | 直接加载索引 | 从文件尾部读取 BM25 和序数注册表，从 `.hnsw` 文件加载向量索引。速度最快 |
| 异常退出（dirty=1） | 全量扫描重建 | 扫描所有记录，过滤已删除和已过期的条目，重建全部索引。数据不丢失，但打开较慢 |

**无论哪种情况，记录数据都不会丢失**——数据始终写在 mmap 文件中，由操作系统负责刷盘。

---

## 空间回收（compact）

RogueMemory 的存储基于追加写入（append-only），删除和更新会产生废弃空间（墓碑记录）。当废弃空间较多时，可以通过 `compact` 回收：

```java
RogueMemory compacted = mem.compact(64 * 1024 * 1024);  // 新文件 64MB
```

### compact 做了什么

1. 创建新的 mmap 文件
2. 只拷贝有效（未删除、未过期）的记录到新文件
3. 重建所有索引（HNSW 向量索引 + BM25 倒排索引 + 序数注册表）
4. 原子替换旧文件

### 使用方式

`compact` 返回一个**新的 `RogueMemory` 实例**，旧实例在显式关闭前仍可使用。

```java
RogueMemory old = ...;
RogueMemory compacted = old.compact(64 * 1024 * 1024);

old.close();       // 关闭旧实例
// 之后使用 compacted
```

### 什么时候该 compact

- 大量删除操作后
- 频繁更新导致旧版本记录堆积
- 磁盘空间紧张时

---

## TTL 数据过期

### 当前状态

RogueMemory 的存储层已经预留了 `expireTime` 字段（每条记录 8 字节），搜索和 compact 时会自动跳过已过期的条目。但**当前版本的公开 API 尚未暴露 TTL 设置方法**，所有记录的 `expireTime` 默认为 0（永不过期）。

这意味着：
- 存储格式已就绪，未来版本可通过 API 直接设置每条记忆的过期时间
- 当前如需过期功能，可以在应用层通过元数据记录时间戳，检索后手动过滤

---

## Builder 选项

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")               // 必填：存储路径
    .searchMode(SearchMode.HYBRID)        // 可选：检索模式，默认 HYBRID
    .embeddingProvider(provider)           // 可选：KEYWORD_ONLY 模式不需要
    .allocateSize(64 * 1024 * 1024)       // 可选：预分配文件大小，默认 64MB
    .autoCheckpoint(5, TimeUnit.MINUTES)  // 可选：按时间间隔自动 checkpoint
    .autoCheckpoint(1000)                 // 可选：按操作次数自动 checkpoint
    .build();
```

| 选项 | 默认值 | 说明 |
|---|---|---|
| `persistent(path)` | 无（必填） | 存储路径，不带扩展名 |
| `searchMode(mode)` | `HYBRID` | 检索模式 |
| `embeddingProvider(p)` | 无 | 向量服务，KEYWORD_ONLY 可不设 |
| `allocateSize(size)` | `64MB` | 预分配 mmap 文件大小 |
| `autoCheckpoint(interval, TimeUnit)` | 未启用 | 按时间间隔自动 checkpoint |
| `autoCheckpoint(count)` | 未启用 | 按写操作次数自动 checkpoint |

---

## 完整示例：带持久化的 AI Agent

```java
public class AgentMemory {
    private final RogueMemory memory;

    public AgentMemory(String apiKey, String userId) {
        memory = RogueMemory.mmap()
            .persistent("data/agent-" + userId)
            .searchMode(SearchMode.HYBRID)
            .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
            .autoCheckpoint(5, TimeUnit.MINUTES)  // 每 5 分钟自动持久化
            .autoCheckpoint(500)                   // 或每 500 次写操作自动持久化
            .build();
    }

    /** 记住一条信息 */
    public void remember(String content, String type) {
        memory.add(content, Map.of("type", type), "agent");
    }

    /** 回忆相关信息 */
    public List<MemoryResult> recall(String query, int topK) {
        return memory.search(query, topK,
            SearchOptions.builder()
                .namespace("agent")
                .build());
    }

    /** 定期保存 */
    public void save() {
        memory.checkpoint();
    }

    /** 关闭 */
    public void close() {
        memory.close();
    }
}
```

使用：

```java
AgentMemory am = new AgentMemory(apiKey, "user-001");

am.remember("用户喜欢简洁的代码风格", "preference");
am.remember("项目 deadline 是下周五", "task");

// 下次对话
List<MemoryResult> results = am.recall("代码风格", 3);
for (MemoryResult r : results) {
    System.out.println("[记忆] " + r.getContent());
}

am.save();   // 定期保存
am.close();  // 关闭时自动持久化
```

## 下一步

- [存储结构与性能](./storage-and-performance.md) — 底层存储细节和算法参数
- [数据操作](./data-operations.md) — 完整 CRUD API 参考
