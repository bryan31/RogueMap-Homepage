# RogueMemory 介绍

RogueMemory 是 RogueMap 1.1.1 内置的 AI 记忆层，提供向量近似搜索（ANN）与 BM25 关键词检索的混合检索能力，所有数据基于 mmap 持久化存储。

**无需外部向量数据库或搜索引擎**，开箱即用。

## 为什么需要 RogueMemory？

如果你在开发 AI Agent 或 LLM 应用，通常需要让系统"记住"之前的对话、用户偏好、知识库等信息。传统做法是引入一个外部向量数据库（如 Milvus、Pinecone）或搜索引擎（如 Elasticsearch），这增加了部署复杂度和运维成本。

RogueMemory 让你在 Java 应用中直接获得这些能力：

- **AI Agent 长期记忆** — 跨会话持久化对话上下文与用户偏好，让 Agent 具备真正的记忆能力
- **RAG（检索增强生成）** — 基于 Embedding 的文档/知识库检索，为 LLM 应用提供精准上下文
- **语义搜索** — 对文本、代码等任意可嵌入内容进行"找相似"查询
- **混合检索** — 语义理解 + 精确关键词匹配双通道召回，提升召回准确率

## 核心特性

- **混合检索** — 向量 ANN（HNSW）+ BM25 关键词双通道，通过 Reciprocal Rank Fusion 融合排序
- **多服务商支持** — 兼容所有实现了 OpenAI `/v1/embeddings` 协议的 Embedding 服务，不限服务商
- **零外部依赖** — 所有数据基于 mmap 持久化，无需引入向量数据库或搜索引擎
- **维度自动推断** — 无需手动指定 Embedding 向量维度
- **元数据过滤** — 为记忆附加键值对标签，检索时按标签过滤
- **命名空间隔离** — 按用户或业务逻辑分区，检索时指定范围
- **离线可用** — `KEYWORD_ONLY` 模式完全不需要 Embedding API，纯本地 BM25 检索

## 功能边界

当前版本（1.1.1）的 RogueMemory 功能边界：

| 能力 | 状态 | 说明 |
|---|---|---|
| 向量 + BM25 混合检索 | 已支持 | 三种模式：HYBRID / VECTOR_ONLY / KEYWORD_ONLY |
| mmap 持久化与恢复 | 已支持 | 正常关闭自动持久化，异常退出自动重建索引 |
| 手动检查点 | 已支持 | `checkpoint()` 手动刷盘 |
| 自动检查点 | 已支持 | `autoCheckpoint(interval, TimeUnit)` 和 `autoCheckpoint(count)` 两种模式 |
| TTL 数据过期 | 未支持 | 存储层已预留 `expireTime` 字段，公开 API 尚未暴露 |

## 模块依赖

```xml
<!-- 核心堆外数据结构 -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.1</version>
</dependency>

<!-- AI 记忆层（自动传递依赖 roguemap-embedding） -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.1</version>
</dependency>
```

`roguemap-memory` 会自动传递依赖 `roguemap-embedding`（提供 `UniversalEmbeddingProvider`），你不需要单独引入。

## 阅读路径

1. [快速开始](./quick-start.md) — 5 分钟跑起来
2. [检索模式](./search-modes.md) — HYBRID / VECTOR_ONLY / KEYWORD_ONLY 详解
3. [数据操作](./data-operations.md) — 增删改查与检索
4. [元数据与命名空间](./metadata-namespace.md) — 过滤与隔离
5. [Embedding 服务配置](./embedding-config.md) — 对接各种 Embedding 服务
6. [存储结构与性能](./storage-and-performance.md) — 底层存储结构、算法参数与性能特性
7. [持久化与运维](./persistence.md) — 持久化恢复、空间回收
8. [检查点与自动检查点](./auto-checkpoint.md) — 手动与自动检查点配置
