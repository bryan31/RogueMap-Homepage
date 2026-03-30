# 给 Java 应用加上 AI 记忆：RogueMap 1.1.0 发布，内置向量检索，不依赖任何外部服务

> 还在纠结要不要引入一套向量数据库？RogueMap 1.1.0 直接把 AI 记忆层塞进来了

---

## RogueMap 是什么

先给没接触过的人简单说一下背景。

RogueMap 是一个 Java 嵌入式存储引擎，底层走 mmap（内存映射文件）。它解决的核心问题很具体：**Java 堆装不下的数据，怎么存？**

传统做法要么加堆内存，要么上 Redis、RocksDB，都有不小的成本。RogueMap 的思路是把数据放到堆外的 mmap 文件里，JVM 堆几乎不动，Full GC 没有压力，进程重启数据还在。提供四种数据结构：RogueMap（键值）、RogueList（双向链表）、RogueSet（集合）、RogueQueue（队列），API 风格和 Java 标准集合差不多，替换成本低。

1.0 出来之后，有不少人在问 AI 相关的需求，尤其是 Agent 记忆和 RAG 这两块。1.1.0 的更新就主要围绕这些展开了。

---

## 最大的变化：RogueMemory AI 记忆层

如果你在做 AI Agent 或者 RAG 应用，大概率遇到过这个问题：**记忆和知识库放哪儿？**

最常见的方案是引一套专门的向量数据库，比如 Chroma、Milvus、Weaviate、Qdrant……选哪个都行，但不管选哪个，都要多维护一个服务，部署更复杂，本地开发也要多启一个进程。对于很多中小型应用或者原型项目来说，这个代价有点高。

RogueMemory 是 1.1.0 新增的 AI 记忆模块，直接嵌在你的 Java 进程里，不需要任何外部服务。核心能力是**向量 ANN（HNSW 算法）+ BM25 关键词的混合检索**，两路结果通过 RRF（Reciprocal Rank Fusion）融合排序，所有数据基于 mmap 持久化，进程重启记忆还在。

用法很简洁：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// 存一条记忆
mem.add("用户喜欢简洁的 UI 风格，不喜欢弹窗");

// 语义检索
List<MemoryResult> results = mem.search("用户界面偏好", 5);

// 也可以带 namespace 和 metadata
mem.add("上次对话讨论了登录问题", Map.of("session", "abc123"), "chat_history");

mem.close();
```

三种检索模式可选：
- `HYBRID` — 向量 + BM25 双路召回，RRF 融合，默认推荐
- `VECTOR_ONLY` — 纯向量语义检索
- `KEYWORD_ONLY` — 纯 BM25 关键词，不需要 Embedding 服务

---

## Embedding 接入：只要兼容 OpenAI 协议就能用

这个设计是我觉得比较务实的地方。

RogueMemory 的向量化走的是 `UniversalEmbeddingProvider`，它对接的接口标准是 OpenAI 的 `/v1/embeddings`。**只要你的 Embedding 服务兼容这个协议，不管是哪家的，直接接上去就能用。**

国内外主流的服务基本都兼容：

| 服务 | 接入方式 |
|------|---------|
| OpenAI | `new UniversalEmbeddingProvider(apiKey)` |
| 阿里云百炼 | 改 baseUrl + apiKey + model 即可 |
| 智谱 GLM | 同上 |
| Moonshot / Kimi | 同上 |
| Mistral | 同上 |
| Jina AI | 同上 |
| Ollama（本地） | baseUrl 改成 `http://localhost:11434/v1` |
| vLLM / LocalAI | 改 baseUrl 即可 |
| 任意 OpenAI 兼容服务 | 都一样 |

切换不同服务只需要改三个参数：

```java
// OpenAI 默认
new UniversalEmbeddingProvider(apiKey)

// 阿里云百炼
new UniversalEmbeddingProvider(
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey,
    "text-embedding-v3"
)

// 本地 Ollama
new UniversalEmbeddingProvider(
    "http://localhost:11434/v1",
    "ollama",   // Ollama 不校验 key，随便填
    "nomic-embed-text"
)

// 向量维度可以不填，第一次调用时自动探测
new UniversalEmbeddingProvider(baseUrl, apiKey, model)
```

实现上没有引任何第三方库，纯 `HttpURLConnection`，零额外依赖。常见模型的维度也内置了，不需要手动指定。

---

## TTL 过期

这个比较容易理解，就是给数据加上"保质期"。

```java
RogueMap<String, String> cache = RogueMap.<String, String>mmap()
    .persistent("data/cache")
    .defaultTTL(30, TimeUnit.MINUTES)   // 默认 30 分钟过期
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// 也可以每条单独设置
cache.put("verify_code:13800138000", "9527", 5, TimeUnit.MINUTES);
cache.put("user_session:uid_001", token, 24, TimeUnit.HOURS);
```

读到过期数据时惰性清理，不需要专门的清理线程。RogueMap、RogueList、RogueSet、RogueQueue 都支持。

如果你之前因为 RogueMap 没有 TTL，只能用外部 Redis 来做缓存，现在可以少一个依赖了。

---

## 自动检查点

RogueMap 持久化的机制是：数据写到 mmap 文件，但索引在内存里，需要调 `checkpoint()` 才会把索引刷到磁盘。如果进程意外挂掉，上次 checkpoint 之后的索引变更就丢了。

之前版本需要自己在业务代码里定时调 checkpoint，现在可以交给框架来做：

```java
RogueMap<String, User> store = RogueMap.<String, User>mmap()
    .persistent("data/store")
    .autoCheckpoint(5, TimeUnit.MINUTES)       // 每 5 分钟一次
    .autoCheckpoint(10_000)                    // 或每 1 万次写操作一次
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
```

两个条件可以同时配，哪个先满足哪个触发。后台守护线程跑，不阻塞业务。

**四种数据结构（RogueMap、RogueList、RogueSet、RogueQueue）和 AI 记忆层（RogueMemory）都支持这个配置**，接口完全一致：

```java
// RogueMemory 同样支持自动检查点
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .autoCheckpoint(10, TimeUnit.MINUTES)
    .autoCheckpoint(5_000)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

---

## 自动扩容

mmap 文件在创建时需要预分配大小。之前如果数据写满了，会直接抛异常，只能重建实例并指定更大的文件。这对于数据量难以预估的场景来说比较麻烦。

1.1.0 加了自动扩容，空间不够时文件自动按倍数增长，业务代码完全感知不到：

```java
RogueMap<String, byte[]> store = RogueMap.<String, byte[]>mmap()
    .persistent("data/store")
    .allocateSize(64 * 1024 * 1024L)    // 初始 64MB
    .autoExpand(true)                    // 开启自动扩容
    .expandFactor(2.0)                   // 每次扩到当前的 2 倍，默认值
    .maxFileSize(4L * 1024 * 1024 * 1024) // 最大 4GB，不填则无上限
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(ByteArrayCodec.INSTANCE)
    .build();
```

扩容时只映射新增区域，已有数据的内存地址不变，不影响正在进行的读写。达到 `maxFileSize` 上限后会抛 `OutOfMemoryError`，不填上限则一直扩。

同样，四种数据结构和 RogueMemory 全部支持。AI 记忆层的记忆条数难以预估，这个特性对它来说尤其有用：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .autoExpand(true)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

---

## 超低堆内存索引

这个是存储引擎层面比较硬核的改动。

RogueMap 的数据本来就在堆外，但索引——也就是 key 到文件地址的映射——之前是放在 JVM 堆里的（基于 ConcurrentHashMap）。如果你有 100 万条 String 类型的 key，光索引就要占 100MB 左右的堆内存。

1.1.0 加了 `LowHeapStringIndex`，把索引的槽位表和 key 字节全部挪到 mmap 文件里，堆上只保留段元数据和锁，大概 17KB。

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/bigmap")
    .lowHeapIndex()     // 开启超低堆内存索引
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

100MB → 0.02MB，节省 99%+。目前只支持 String 类型的 key，RogueMap 和 RogueSet 都可以用。注意开了 lowHeapIndex 之后不支持事务操作。

---

## 复杂泛型支持

之前用 Kryo 序列化存 `List<User>` 这种带泛型参数的类型，反序列化时会因为类型擦除报错或者拿到错误的类型。现在加了 `TypeReference`，可以把泛型信息保留下来：

```java
// 之前只能这样，会有类型问题
KryoObjectCodec.create(List.class)

// 现在可以这样，泛型信息完整保留
KryoObjectCodec.create(new TypeReference<List<User>>() {})
KryoObjectCodec.create(new TypeReference<Map<String, List<Order>>>() {})
```

---

## 这次更新适合谁用

说实话，RogueMap 不是一个适合所有人的工具，它针对的是几个比较具体的场景：

**堆内存压力大**：业务数据量大，HashMap 放不下，又不想只为了扩容就去上 Redis 集群。

**Full GC 问题**：大量大对象在堆上，GC 停顿影响响应时间。数据挪到堆外，这个问题基本消失。

**需要持久化但不想上外部服务**：既不想用纯内存（重启丢数据），又觉得专门维护一套 Redis 太重。

**做 AI 应用**：Agent 需要长期记忆跨会话保持，或者做 RAG 但不想引入独立的向量数据库。1.1.0 的 RogueMemory 就是为这个场景设计的。

如果你的应用完全没有这些痛点，标准 JVM 集合完全够用，不需要折腾。

---

## 快速上手

核心依赖：

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.0</version>
</dependency>
```

如果要用 AI 记忆层，加上：

```xml
<!-- roguemap-memory 会自动依赖 roguemap-embedding -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.0</version>
</dependency>
```

详细文档：[RogueMemory 介绍](/rogue-memory/introduction)

---

- **GitHub**：https://github.com/bryan31/RogueMap
- **官网**：https://roguemap.yomahub.com/
- **Maven Central**：`com.yomahub:roguemap-core:1.1.0`

有问题欢迎提 Issue，觉得有用的话 Star 一下。
