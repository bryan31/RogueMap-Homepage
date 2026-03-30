# 存储结构与性能

本文介绍 RogueMemory 的底层存储结构、核心算法参数以及性能特性。

---

## 文件结构

调用 `persistent("data/mem")` 后，RogueMemory 创建两个文件：

| 文件 | 说明 |
|---|---|
| `data/mem.mem` | 主数据文件（mmap），包含 4KB 文件头 + 记录数据 + 序数注册表 + BM25 索引 |
| `data/mem.hnsw` | HNSW 向量索引文件（独立存储） |

---

## 记录存储结构

每条记忆以追加写入（append-only）方式写入 mmap 文件，二进制布局如下：

```
┌──────────────────────────────────────────────────┐
│ expireTime   │ 8B long   │ 过期时间戳，0=永不过期   │
│ id (MSB)     │ 8B long   │ UUID 高位               │
│ id (LSB)     │ 8B long   │ UUID 低位               │
│ ns_len       │ 2B short  │ 命名空间字节长度          │
│ namespace    │ ns_len B  │ UTF-8 命名空间           │
│ content_len  │ 4B int    │ 内容字节长度              │
│ content      │ content_len B │ UTF-8 记忆内容        │
│ meta_len     │ 4B int    │ 元数据字节长度            │
│ metadata     │ meta_len B │ 编码后的键值对元数据      │
│ vector_len   │ 4B int    │ 向量维度数               │
│ vector       │ vector_len × 4B │ float32 向量数据    │
│ deleted      │ 1B byte   │ 0=有效，1=已删除（墓碑）   │
│ createdAt    │ 8B long   │ 创建时间戳（epoch ms）     │
└──────────────────────────────────────────────────┘
```

### 元数据编码

```
┌────────────────────────────────────────┐
│ pair_count  │ 2B short │ 键值对数量     │
│ 每对:                              │
│   key_len   │ 2B short │               │
│   key       │ key_len B │ UTF-8        │
│   val_len   │ 2B short │               │
│   val       │ val_len B │ UTF-8        │
└────────────────────────────────────────┘
```

### 固定开销

每条记录的固定开销为 **47 字节**（不含命名空间、内容、元数据、向量的变长部分）：

```
8 + 16 + 2 + 4 + 4 + 4 + 1 + 8 = 47 bytes
```

### 存储估算示例

一条记忆：内容 50 字节中文、无元数据、1536 维向量：

```
47 + 50(内容) + 2(空元数据) + 1536 × 4(向量) = 6,235 bytes ≈ 6KB
```

10 万条此类记忆约占 **600MB** 磁盘空间。

---

## 向量索引 — HNSW

RogueMemory 使用 **HNSW（Hierarchical Navigable Small World）** 算法做近似最近邻（ANN）搜索，基于 `hnswlib-core` 实现。

### 算法参数

| 参数 | 值 | 说明 |
|---|---|---|
| M | 16 | 每层每节点最大连接数 |
| efConstruction | 200 | 构建时的动态候选列表大小 |
| ef | 50 | 搜索时的动态候选列表大小 |
| 距离度量 | 余弦距离 | `1 - cosine_similarity` |

这些参数在**准确率和性能之间取得了较好的平衡**：
- `M=16` 提供足够的图连通性，同时控制索引大小
- `efConstruction=200` 确保构建质量，构建速度稍慢但只需一次
- `ef=50` 搜索时返回高质量结果，同时保持毫秒级延迟

### 向量存储在堆外

关键设计：向量数据直接存储在 mmap 文件中，**不占用 JVM 堆内存**。HNSW 索引节点只持有一个 `long` 类型的 mmap 地址偏移量（8 字节），计算距离时通过 `Unsafe` 直接从 mmap 读取 float 数组。

这意味着即使存储 100 万条 1536 维向量（约 6GB 原始数据），JVM 堆内存增量极小。

### 搜索流程

```
search(query, topK)
  │
  ├─ embed(query)                    // 调用 Embedding API 获取查询向量
  ├─ hnswIndex.findNearest(qv, candidates)  // ANN 搜索
  │   └─ candidates = topK × 4 + deletedCount + 10  // 超额召回补偿墓碑
  ├─ 过滤已删除和已过期的条目
  └─ 返回 topK 结果
```

---

## 关键词索引 — BM25

RogueMemory 使用 **BM25** 算法做关键词检索，与向量检索双通道并行。

### 算法参数

| 参数 | 值 | 说明 |
|---|---|---|
| k1 | 1.2 | 词频饱和参数，控制词频对分数的影响上限 |
| b | 0.75 | 文档长度归一化参数，控制长文档的惩罚力度 |

### 中文分词

BM25 的分词策略根据文本语言**自动切换**：

- **中文（CJK 文本）**：bigram（两字滑动窗口）。例如 "用户偏好" 分为 `["用户", "户偏", "偏好"]`
- **英文/其他**：空格分词 + 小写化

自动检测标准：非空白字符中 CJK 字符占比超过 50% 即判定为中文文本。

无额外分词依赖，无需安装词典或分词插件。

### BM25 评分公式

```
IDF = log((N - df + 0.5) / (df + 0.5) + 1)
tfNorm = (tf × (k1 + 1)) / (tf + k1 × (1 - b + b × dl / avgDl))
score = Σ (IDF × tfNorm)    // 对查询中的每个词项求和
```

其中：
- N = 活跃文档总数
- df = 包含该词项的文档数
- tf = 该词项在文档中的出现次数
- dl = 文档长度（token 数）
- avgDl = 平均文档长度

---

## 混合检索 — RRF 融合

在 `HYBRID` 模式下，向量通道和关键词通道各返回 `topK × 4` 个候选，通过 **Reciprocal Rank Fusion（RRF）** 合并：

```
RRF_score[id] = Σ  1 / (C + rank + 1)
```

默认常数 C = 60（可通过 `SearchOptions.rrfConstant()` 调整）。

**效果**：同时出现在两个通道的条目获得更高分数，兼顾语义相似和关键词匹配。

---

## 性能特性

### 写入

| 操作 | 特性 |
|---|---|
| `add()` | 追加写入 mmap，O(1)；向 HNSW 图插入节点，O(log n)；向 BM25 倒排索引添加文档 |
| `update()` | 追加新记录 + 旧记录标记墓碑，向量重新嵌入（1 次 Embedding API 调用） |
| `delete()` | 标记墓碑（软删除），O(1) |

### 读取

| 操作 | 特性 |
|---|---|
| `search()` HYBRID | HNSW ANN 搜索 + BM25 检索并行 + RRF 融合，延迟主要取决于 Embedding API 响应时间 |
| `search()` VECTOR_ONLY | 纯 HNSW ANN 搜索，跳过 BM25 |
| `search()` KEYWORD_ONLY | 纯 BM25，**无 Embedding API 调用**，延迟极低 |
| `get()` | 按 ID 直接读取 mmap 记录，O(1) |

### 内存

| 数据 | 存储位置 |
|---|---|
| 记忆内容 + 向量 | mmap 文件（堆外） |
| HNSW 图索引 | `.hnsw` 文件（堆外） |
| BM25 倒排索引 | mmap 文件尾部（堆外） |
| HNSW 节点指针 | JVM 堆（每节点约 8 字节偏移量） |
| 序数注册表 | JVM 堆（UUID → int 映射） |

**核心结论**：大部分数据存储在堆外，JVM 堆内存占用远低于传统向量数据库客户端。堆上主要开销来自 HNSW 的 Java 对象和序数映射表，与条目数量线性相关。

### 主要延迟瓶颈

- **写入**：Embedding API 调用（网络 I/O），通常 10-100ms/次
- **搜索**：Embedding API 调用（1 次）+ HNSW 搜索 + BM25 搜索，其中 Embedding API 通常是主要瓶颈
- **KEYWORD_ONLY 模式**：无 Embedding API 调用，延迟为纯本地 BM25 计算

---

## 与 roguemap-memory-pro 的关系

`roguemap-memory` 使用 `hnswlib-core`（基于 jelmerk 的 Java HNSW 实现），`roguemap-memory-pro` 使用 `jvector`（基于 DataStax 的高性能向量搜索库）。两者**公开 API 完全一致**，只是内部向量索引实现不同。

| | roguemap-memory | roguemap-memory-pro |
|---|---|---|
| 向量索引 | `hnswlib-core` | `jvector` |
| 图构建 | 即时构建（add 时） | 延迟构建（首次 search 时批量构建） |
| 写入性能 | 每次 add 都更新图 | 极快（只记录向量，不更新图） |
| 首次搜索 | 无额外开销 | 需要构建图（一次性） |
| 适用场景 | 写入后需要立即搜索 | 批量写入后集中搜索 |

## 下一步

- [持久化与运维](./persistence.md) — 了解持久化恢复、检查点和空间回收
- [检索模式](./search-modes.md) — 三种检索模式详解
