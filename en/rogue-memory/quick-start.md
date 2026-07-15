# Quick start

This page will help you get through the storage and retrieval of RogueMemory in 5 minutes.

## 1. Add dependencies

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>

<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.7</version>
</dependency>
```

## 2. Create a RogueMemory instance

```java
import com.yomahub.roguemap.memory.RogueMemory;
import com.yomahub.roguemap.memory.SearchMode;
import com.yomahub.roguemap.embedding.UniversalEmbeddingProvider;

RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

::: tip Where does the apiKey come from?
`apiKey` is the API Key of the Embedding service you use. If you use OpenAI, it is the OpenAI API Key; if you use Ollama for local deployment, you can pass the empty string `""`.
:::

## 3. Store in memory

```java
mem.add("User preference dark mode");
mem.add("The current project uses Spring Boot 3.2");
mem.add("There are team meetings every Friday afternoon");
```

## 4. Semantic retrieval

```java
List<MemoryResult> results = mem.search("User development preferences", 5);

for (MemoryResult r : results) {
    System.out.println(r.getContent() + " (Relevance:" + r.getScore() + ")");
}
```

Output example:

```
The current project uses Spring Boot 3.2 (correlation: 0.85)
User preference for dark mode (correlation: 0.72)
```

Note: Although the search term was "Development Preferences", both memories "Spring Boot 3.2" and "Dark Mode" were recalled - this is the power of semantic retrieval, which understands "meaning" rather than exact keyword matching.

## 5. Close

```java
mem.close();
```

Indexes are automatically persisted to disk on shutdown. All memories and indexes are automatically restored the next time you open it with the same path.

## Complete code

```java
import com.yomahub.roguemap.memory.RogueMemory;
import com.yomahub.roguemap.memory.MemoryResult;
import com.yomahub.roguemap.embedding.UniversalEmbeddingProvider;

public class QuickStart {
    public static void main(String[] args) {
        String apiKey = "your-api-key";

        try (RogueMemory mem = RogueMemory.mmap()
                .persistent("data/mem")
                .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
                .build()) {

            // Deposit
            mem.add("User preference dark mode");
            mem.add("The current project uses Spring Boot 3.2");

            // Search
            List<MemoryResult> results = mem.search("Development preferences", 5);
            for (MemoryResult r : results) {
                System.out.println(r.getContent() + " (score=" + r.getScore() + ")");
            }
        }
        // try-with-resources automatically calls close()
    }
}
```

## Next step

- [Search mode ](./search-modes.md) — Learn about the three search modes and choose the one that suits you best
- [Data operation ](./data-operations.md) — Complete addition, deletion, modification and query API
- [Embedding service configuration ](./embedding-config.md) — docking with various services such as OpenAI and Ollama
