---
layout: home

hero:
  name: "RogueMap"
  text: "Java 嵌入式存储引擎 + AI 记忆层"
  tagline: "基于 mmap 的堆外数据结构与 RogueMemory 混合检索，突破 JVM 内存墙，让 Java 应用拥有持久化与 AI 智能记忆能力。"
  image:
    light: /logo-in-light.svg
    dark: /logo-in-dark.svg
    alt: RogueMap
  theme: brand
  actions:
    - theme: brand
      text: 10 分钟上手
      link: /guide/quick-start-path
    - theme: alt
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: GitHub
      link: https://github.com/bryan31/RogueMap

features:
  - icon: 🧩
    title: 嵌入式存储引擎
    details: "RogueMap、RogueList、RogueSet、RogueQueue 四种堆外数据结构，统一 Builder 风格，支持持久化、事务、TTL、自动检查点与崩溃恢复。"

  - icon: 🧠
    title: RogueMemory AI 记忆层
    details: "内置向量 ANN + BM25 关键词混合检索，支持 OpenAI、Ollama 等主流 Embedding 服务，无需外部向量数据库或搜索引擎。"

  - icon: ⚙️
    title: 高并发与大容量
    details: "分段索引、乐观读、自动扩容、超低堆 LowHeap 索引（堆内存再降 99%），数据容量可达 TB 级。"

  - icon: 📈
    title: 运行可观测
    details: "内置 `StorageMetrics`，可监控使用量、碎片率、条目数并按阈值触发 compact。支持 TTL 数据自动过期。"
---

## 2 分钟跑起来

### Maven 依赖（1.1.0）

```xml
<!-- 核心堆外数据结构 -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.0</version>
</dependency>

<!-- AI 记忆层（自动传递依赖 roguemap-embedding） -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.0</version>
</dependency>
```

### 数据结构 — 键值存储

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data/demo.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    map.put("alice", 100L);
    System.out.println(map.get("alice")); // 100
}
```

### AI 记忆层 — RogueMemory

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)          // 向量 + 关键词混合检索
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// 存入记忆
mem.add("用户偏好深色模式");

// 语义检索
List<MemoryResult> results = mem.search("用户界面偏好", 5);

mem.close();
```

## 模块说明

| 模块 | 说明 |
|---|---|
| `roguemap-core` | 核心堆外存储 — RogueMap、RogueList、RogueSet、RogueQueue |
| `roguemap-memory` | AI 记忆层，向量 + BM25 混合检索，基于 mmap 持久化 |

## 结构选型

| 结构 | 适合场景 | 核心操作 |
|---|---|---|
| `RogueMap<K, V>` | 键值缓存、状态存储 | `put/get/remove` |
| `RogueList<E>` | 顺序数据、时间序列 | `addLast/get/removeLast` |
| `RogueSet<E>` | 去重、标签、黑名单 | `add/contains/remove` |
| `RogueQueue<E>` | 任务与消息消费 | `offer/poll/peek` |
| `RogueMemory` | AI Agent 记忆、RAG、语义搜索 | `add/search/delete` |

## 推荐阅读路径

1. [上手路线（10 分钟）](/guide/quick-start-path)
2. [快速开始](/guide/getting-started)
3. [RogueMemory 介绍](/rogue-memory/introduction)
4. [配置选项](/guide/configuration)
5. [常见问题与排障](/guide/troubleshooting)
