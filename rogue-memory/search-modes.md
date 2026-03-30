# 检索模式

RogueMemory 提供三种检索模式，适用于不同场景。

## 总览

| 模式 | 说明 | 需要 EmbeddingProvider | 适合场景 |
|---|---|---|---|
| `HYBRID` | 向量 + 关键词混合检索（默认） | 需要 | 大多数场景，兼顾语义和精确匹配 |
| `VECTOR_ONLY` | 纯向量近似搜索 | 需要 | 纯语义搜索 |
| `KEYWORD_ONLY` | 纯 BM25 关键词检索 | 不需要 | 纯文本匹配，无需外部 API |

通过 Builder 的 `searchMode()` 配置：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)   // 在这里切换模式
    .embeddingProvider(provider)
    .build();
```

---

## HYBRID（默认，推荐）

同时走向量 ANN 和 BM25 关键词两条通道，通过 **Reciprocal Rank Fusion（RRF）** 融合排序。

工作流程：
1. 向量通道：将查询文本转为向量，在 HNSW 索引中做近似最近邻搜索
2. 关键词通道：对查询文本分词，在 BM25 倒排索引中计算相关性分数
3. RRF 融合：两条通道各自返回候选结果，按 RRF 公式合并排序

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)   // 默认就是 HYBRID，可以省略
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

List<MemoryResult> results = mem.search("用户的偏好", 5);
```

**优势**：语义理解和精确匹配兼得，召回质量最高。

---

## VECTOR_ONLY

只走向量通道，纯语义搜索。

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.VECTOR_ONLY)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

List<MemoryResult> results = mem.search("与这段话意思相近的内容", 5);
```

**适合场景**：跨语言搜索、模糊语义匹配、不需要精确关键词的场景。

---

## KEYWORD_ONLY

只走 BM25 关键词通道，不走向量搜索。

**最大的优势：不需要 `EmbeddingProvider`**，不调用任何外部 API，完全本地运行。

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)
    // 不需要 embeddingProvider
    .build();

List<MemoryResult> results = mem.search("深色模式", 5);
```

**适合场景**：
- 不需要语义理解，只需要关键词匹配
- 无法访问外部 Embedding API（内网环境）
- 想要最快的检索速度

### 中文分词

BM25 检索对中文采用 **bigram 分词**（两字滑动窗口），对英文采用空格分词，自动检测语言，无需额外配置。

例如 "用户偏好深色模式" 会被分为：`用户`、`户偏`、`偏好`、`好深`、`深色`、`色模`、`模式`。

---

## 如何选择？

```
需要语义理解？
  ├─ 是 → 需要精确关键词匹配？
  │       ├─ 是 → HYBRID（推荐）
  │       └─ 否 → VECTOR_ONLY
  └─ 否 → KEYWORD_ONLY（无需 Embedding API）
```

## RRF 常数调优

在 HYBRID 模式下，RRF 融合使用常数 C（默认 60）。C 越小，头部结果的权重差异越大；C 越大，排名越平滑。

可以通过 `SearchOptions` 自定义：

```java
List<MemoryResult> results = mem.search("查询", 5,
    SearchOptions.builder()
        .rrfConstant(30)    // 默认 60，调小让头部结果更突出
        .build());
```

大多数情况下默认值即可，无需调整。

## 下一步

- [数据操作](./data-operations.md) — 详细的 CRUD API
- [Embedding 服务配置](./embedding-config.md) — 对接各种 Embedding 服务
