# Embedding 服务配置

RogueMemory 通过 `EmbeddingProvider` 接口将文本转为向量。推荐使用内置的 `UniversalEmbeddingProvider`，它兼容所有实现了 OpenAI `/v1/embeddings` 协议的 Embedding 服务——不限于特定服务商，只要接口兼容即可接入。

---

## 配置示例

### 最简用法（OpenAI 官方）

```java
// 默认模型（text-embedding-3-small）
new UniversalEmbeddingProvider(apiKey)

// 指定模型
new UniversalEmbeddingProvider(apiKey, "text-embedding-3-large")
```

### 任意兼容 OpenAI 协议的服务

只需传入 `baseUrl`、`apiKey` 和 `modelName` 三个参数：

::: warning baseUrl 不要加 /embeddings 后缀
框架会自动拼接 `/embeddings` 路径。`baseUrl` 只需写到 `/v1`，例如 `https://api.openai.com/v1`，不要写成 `https://api.openai.com/v1/embeddings`。
:::

```java
// 通用构造方式 — 适用于所有兼容 /v1/embeddings 协议的服务
new UniversalEmbeddingProvider(baseUrl, apiKey, modelName)
```

典型示例：

```java
// OpenAI 兼容的第三方服务
new UniversalEmbeddingProvider("https://api.example.com/v1", apiKey, "your-model")

// 阿里云百炼
new UniversalEmbeddingProvider(
    "https://dashscope.aliyuncs.com/compatible-mode/v1", apiKey, "text-embedding-v3")

// 本地 Ollama（无需 API Key，传空字符串）
new UniversalEmbeddingProvider(
    "http://localhost:11434/v1", "", "nomic-embed-text")
```

### 强制指定维度

```java
// 某些服务支持截断向量，可以强制指定维度
new UniversalEmbeddingProvider(
    "https://api.openai.com/v1", apiKey, "text-embedding-3-small", 512)
```

---

## 维度自动推断

不需要手动查维度。`UniversalEmbeddingProvider` 通过两个阶段自动解决：

1. **内置表** — 对常见模型（`text-embedding-3-small`、`mistral-embed`、`nomic-embed-text` 等），构造时直接从内置表读取维度，**零网络请求**
2. **自动探测** — 对不在内置表中的模型，`build()` 时会自动发起一次最小化请求来推断维度，无需手动干预

你可以随时查看推断结果：

```java
EmbeddingProvider provider = new UniversalEmbeddingProvider(apiKey);
System.out.println(provider.getDimension());  // 如 1536
```

---

## 使用本地模型（Ollama）

如果你想完全离线使用 RogueMemory，可以部署本地 Ollama：

```bash
# 安装并启动 Ollama
ollama pull nomic-embed-text
ollama serve
```

然后在代码中配置：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(new UniversalEmbeddingProvider(
        "http://localhost:11434/v1", "", "nomic-embed-text"))
    .build();
```

或者使用 `KEYWORD_ONLY` 模式，完全不需要 Embedding 服务：

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)
    .build();
```

## 下一步

- [持久化与运维](./persistence.md) — 了解持久化恢复、检查点和空间回收
