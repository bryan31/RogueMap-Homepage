# Embedding service configuration

RogueMemory converts text into vectors through the `EmbeddingProvider` interface. It is recommended to use the built-in `UniversalEmbeddingProvider`, which is compatible with all Embedding services that implement the OpenAI `/v1/embeddings` protocol - it is not limited to specific service providers, and can be accessed as long as the interface is compatible.

---

## Configuration example

### The simplest usage (OpenAI official)

```java
// Default model (text-embedding-3-small)
new UniversalEmbeddingProvider(apiKey)

// Specify model
new UniversalEmbeddingProvider(apiKey, "text-embedding-3-large")
```

### Any service compatible with the OpenAI protocol

Just pass in the three parameters `baseUrl`, `apiKey` and `modelName`:

::: warning baseUrl do not add /embeddings suffix
The framework will automatically splice the `/embeddings` path. `baseUrl` Just write `/v1`, for example `https://api.openai.com/v1`, do not write `https://api.openai.com/v1/embeddings`.
:::

```java
// Common constructor — applicable to all services that are compatible with the /v1/embeddings protocol
new UniversalEmbeddingProvider(baseUrl, apiKey, modelName)
```

Typical example:

```java
// OpenAI compatible third-party services
new UniversalEmbeddingProvider("https://api.example.com/v1", apiKey, "your-model")

// Alibaba Cloud Bailian
new UniversalEmbeddingProvider(
    "https://dashscope.aliyuncs.com/compatible-mode/v1", apiKey, "text-embedding-v3")

// Local Ollama (no API Key required, pass empty string)
new UniversalEmbeddingProvider(
    "http://localhost:11434/v1", "", "nomic-embed-text")
```

### Force specified dimensions

```java
// Some services support truncated vectors, which can force specified dimensions
new UniversalEmbeddingProvider(
    "https://api.openai.com/v1", apiKey, "text-embedding-3-small", 512)
```

---

## Dimension automatic inference

No need to manually check dimensions. `UniversalEmbeddingProvider` is automatically resolved in two stages:

1. **Built-in table** — For common models (`text-embedding-3-small`, `mistral-embed`, `nomic-embed-text`, etc.), dimensions are directly read from the built-in table during construction, **zero network requests**
2. **Automatic detection** - For models that are not in the built-in table, `build()` will automatically initiate a minimization request to infer dimensions without manual intervention.

You can view the inference results at any time:

```java
EmbeddingProvider provider = new UniversalEmbeddingProvider(apiKey);
System.out.println(provider.getDimension());  // Such as 1536
```

---

## Use local model (Ollama)

If you want to use RogueMemory completely offline, you can deploy local Ollama:

```bash
# Install and start Ollama
ollama pull nomic-embed-text
ollama serve
```

Then configure it in the code:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(new UniversalEmbeddingProvider(
        "http://localhost:11434/v1", "", "nomic-embed-text"))
    .build();
```

Or use `KEYWORD_ONLY` mode, which does not require the Embedding service at all:

```java
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.KEYWORD_ONLY)
    .build();
```

## Next step

- [Persistence and Operations ](./persistence.md) — Learn about persistence recovery, checkpoints, and space reclamation
