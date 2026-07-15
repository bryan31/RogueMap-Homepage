# Add AI memory to Java applications: RogueMap 1.1.0 is released, with built-in vector retrieval and does not rely on any external services

> Still wondering whether to introduce a vector database? RogueMap 1.1.0 directly plugs in the AI memory layer

---

## What is RogueMap?

First, let me give you a brief background for those who have never been exposed to it.

RogueMap is a Java embedded storage engine that uses mmap (memory mapped files) at the bottom. The core problem it solves is very specific: **How ​​to store data that cannot be loaded in Java? **

The traditional approach is to either add heap memory or use Redis or RocksDB, which all cost a lot. The idea of ​​RogueMap is to put the data into mmap files outside the heap. The JVM heap is almost motionless, there is no pressure on the Full GC, and the data is still there when the process is restarted. Four data structures are provided: RogueMap (key value), RogueList (double linked list), RogueSet (collection), and RogueQueue (queue). The API style is similar to Java standard collections, and the replacement cost is low.

After 1.0 came out, many people were asking about AI-related needs, especially Agent memory and RAG. The 1.1.0 update mainly focuses on these.

---

## The biggest change: RogueMemory AI memory layer

If you are working on an AI Agent or RAG application, you have most likely encountered this problem: Where to put the memory and knowledge base? **

The most common solution is to introduce a specialized vector database, such as Chroma, Milvus, Weaviate, Qdrant... You can choose any one, but no matter which one you choose, you need to maintain one more service, the deployment is more complicated, and one more process needs to be started for local development. For many small and medium-sized applications or prototype projects, this price is a bit high.

RogueMemory is a new AI memory module added in 1.1.0. It is directly embedded in your Java process and does not require any external services. The core capability is **Mixed retrieval of vector ANN (HNSW algorithm) + BM25 keywords**. The results of the two paths are fused and sorted through RRF (Reciprocal Rank Fusion). All data is persisted based on mmap, and the memory remains after process restart.

Usage is very simple:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// save a memory
mem.add("Users like simple UI style and don’t like pop-ups");

// Semantic retrieval
List<MemoryResult> results = mem.search("User interface preferences", 5);

// You can also bring namespace and metadata
mem.add("Last conversation discussed login issues", Map.of("session", "abc123"), "chat_history");

mem.close();
```

Three search modes are available:
- `HYBRID` — Vector + BM25 dual-way recall, RRF fusion, recommended by default
- `VECTOR_ONLY` — Pure vector semantic retrieval
- `KEYWORD_ONLY` — Pure BM25 keyword, no Embedding service required

---

## Embedding access: It can be used as long as it is compatible with the OpenAI protocol

I think this design is more pragmatic.

RogueMemory's vectorization uses `UniversalEmbeddingProvider`, and its interface standard is OpenAI's `/v1/embeddings`. **As long as your Embedding service is compatible with this protocol, no matter which company it is from, you can just connect it and use it. **

Mainstream services at home and abroad are basically compatible with:

| Services | Access methods |
|------|---------|
| OpenAI | `new UniversalEmbeddingProvider(apiKey)` |
| Alibaba Cloud Bailian | Just change baseUrl + apiKey + model |
| GLM | Same as above |
| Moonshot / Kimi | Same as above |
| Mistral | Same as above |
| Jina AI | Same as above |
| Ollama (local) | baseUrl changed to `http://localhost:11434/v1` |
| vLLM / LocalAI | Just change baseUrl |
| Any OpenAI compatible service | The same |

Switching between different services only requires changing three parameters:

```java
// OpenAI default
new UniversalEmbeddingProvider(apiKey)

// Alibaba Cloud Bailian
new UniversalEmbeddingProvider(
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey,
    "text-embedding-v3"
)

// Local Ollama
new UniversalEmbeddingProvider(
    "http://localhost:11434/v1",
    "ollama",   // Ollama does not verify the key, fill it in casually
    "nomic-embed-text"
)

// The vector dimension does not need to be filled in. It will be automatically detected when calling for the first time.
new UniversalEmbeddingProvider(baseUrl, apiKey, model)
```

The implementation does not include any third-party libraries, pure `HttpURLConnection`, with zero additional dependencies. The dimensions of common models are also built-in, so there is no need to specify them manually.

---

## TTL expired

This is easier to understand, it is to add a "shelf life" to the data.

```java
RogueMap<String, String> cache = RogueMap.<String, String>mmap()
    .persistent("data/cache")
    .defaultTTL(30, TimeUnit.MINUTES)   // Default 30 minutes expiration
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// You can also set each item individually
cache.put("verify_code:13800138000", "9527", 5, TimeUnit.MINUTES);
cache.put("user_session:uid_001", token, 24, TimeUnit.HOURS);
```

Lazy cleaning is done when expired data is read, and no special cleaning thread is required. RogueMap, RogueList, RogueSet, and RogueQueue are all supported.

If you had to use external Redis for caching because RogueMap did not have TTL, now you have one less dependency.

---

## Automatic checkpoint

The persistence mechanism of RogueMap is: data is written to mmap files, but the index is in memory, and `checkpoint()` needs to be adjusted to flush the index to disk. If the process dies unexpectedly, the index changes since the last checkpoint will be lost.

In previous versions, you needed to regularly adjust checkpoints in your business code. Now you can leave it to the framework:

```java
RogueMap<String, User> store = RogueMap.<String, User>mmap()
    .persistent("data/store")
    .autoCheckpoint(5, TimeUnit.MINUTES)       // every 5 minutes
    .autoCheckpoint(10_000)                    // or once every 10,000 writes
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
```

Two conditions can be configured at the same time, whichever is met first triggers. The background daemon thread runs without blocking the business.

**Four data structures (RogueMap, RogueList, RogueSet, RogueQueue) and AI memory layer (RogueMemory) all support this configuration**, and the interfaces are exactly the same:

```java
// RogueMemory also supports automatic checkpoints
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .autoCheckpoint(10, TimeUnit.MINUTES)
    .autoCheckpoint(5_000)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

---

## Automatic expansion

mmap files require pre-allocated size when created. Previously, if the data was full, an exception would be thrown directly, and the only way was to rebuild the instance and specify a larger file. This is troublesome for scenarios where the amount of data is difficult to estimate.

1.1.0 adds automatic expansion. When the space is insufficient, the file will automatically grow by multiples, and the business code will not be aware of it at all:

```java
RogueMap<String, byte[]> store = RogueMap.<String, byte[]>mmap()
    .persistent("data/store")
    .allocateSize(64 * 1024 * 1024L)    // Initial 64MB
    .autoExpand(true)                    // Enable automatic expansion
    .expandFactor(2.0)                   // Expand to 2 times the current size each time, default value
    .maxFileSize(4L * 1024 * 1024 * 1024) // Maximum 4GB, no upper limit if left blank
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(ByteArrayCodec.INSTANCE)
    .build();
```

When expanding, only the new area is mapped, and the memory address of the existing data remains unchanged, which does not affect ongoing reading and writing. After reaching the upper limit of `maxFileSize`, `OutOfMemoryError` will be thrown. If the upper limit is not filled, it will continue to expand.

Likewise, all four data structures and RogueMemory are supported. The number of memories in the AI memory layer is difficult to predict, and this feature is especially useful for it:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .autoExpand(true)
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

---

## Ultra low heap memory index

This is a relatively hard-core change at the storage engine level.

RogueMap's data is originally outside the heap, but the index - that is, the mapping of key to file address - was previously placed in the JVM heap (based on ConcurrentHashMap). If you have 1 million String type keys, the index alone will occupy about 100MB of heap memory.

1.1.0 adds `LowHeapStringIndex`, which moves all the index slot table and key bytes to mmap files. Only segment metadata and locks are retained on the heap, which is about 17KB.

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/bigmap")
    .lowHeapIndex()     // Enable ultra-low heap memory indexing
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

100MB → 0.02MB, save 99%+. Currently, only String type keys are supported, both RogueMap and RogueSet can be used. Note that transaction operations are not supported after lowHeapIndex is turned on.

---

## Complex generic support

Previously, Kryo was used to serialize and store `List<User>`, a type with generic parameters. When deserializing, an error would be reported due to type erasure or the wrong type would be obtained. Now with the addition of `TypeReference`, the generic information can be retained:

```java
// This was the only way before, there would be type issues
KryoObjectCodec.create(List.class)

// Now you can do this, the generic information is completely retained
KryoObjectCodec.create(new TypeReference<List<User>>() {})
KryoObjectCodec.create(new TypeReference<Map<String, List<Order>>>() {})
```

---

## Who is this update suitable for?

To be honest, RogueMap is not a tool suitable for everyone. It targets several more specific scenarios:

**Heap memory pressure is high**: The amount of business data is large, HashMap cannot fit it, and we don’t want to add a Redis cluster just for capacity expansion.

**Full GC problem**: A large number of large objects are on the heap, and GC pauses affect response time. When the data is moved outside the heap, this problem basically disappears.

**Need persistence but don’t want to use external services**: I don’t want to use pure memory (data will be lost after restarting), but I also feel that maintaining a dedicated set of Redis is too heavy.

**Doing AI applications**: Agent needs long-term memory to be maintained across sessions, or does RAG but does not want to introduce an independent vector database. RogueMemory 1.1.0 is designed for this scenario.

If your application does not have these pain points at all, the standard JVM collection is completely sufficient and there is no need to bother.

---

## Get started quickly

Core dependencies:

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.0</version>
</dependency>
```

If you want to use the AI memory layer, add:

```xml
<!-- roguemap-memory will automatically depend on roguemap-embedding-->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.0</version>
</dependency>
```

Detailed documentation: [RogueMemory Introduction ](/en/rogue-memory/introduction)

---

- **GitHub**：https://github.com/bryan31/RogueMap
- **Official website**: https://roguemap.yomahub.com/
- **Maven Central**：`com.yomahub:roguemap-core:1.1.0`

If you have any questions, please feel free to submit an issue. If you find it useful, please give it a star.
