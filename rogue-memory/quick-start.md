# 快速开始

本页将帮助你在 5 分钟内跑通 RogueMemory 的存入与检索。

## 1. 添加依赖

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.1</version>
</dependency>

<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.1</version>
</dependency>
```

## 2. 创建 RogueMemory 实例

```java
import com.yomahub.roguemap.memory.RogueMemory;
import com.yomahub.roguemap.memory.SearchMode;
import com.yomahub.roguemap.embedding.UniversalEmbeddingProvider;

RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();
```

::: tip apiKey 从哪来？
`apiKey` 是你使用的 Embedding 服务的 API Key。如果你用 OpenAI，就是 OpenAI API Key；如果用 Ollama 本地部署，可以传空字符串 `""`。
:::

## 3. 存入记忆

```java
mem.add("用户偏好深色模式");
mem.add("当前项目使用 Spring Boot 3.2");
mem.add("每周五下午有团队会议");
```

## 4. 语义检索

```java
List<MemoryResult> results = mem.search("用户的开发偏好", 5);

for (MemoryResult r : results) {
    System.out.println(r.getContent() + " (相关度: " + r.getScore() + ")");
}
```

输出示例：

```
当前项目使用 Spring Boot 3.2 (相关度: 0.85)
用户偏好深色模式 (相关度: 0.72)
```

注意：虽然搜索词是"开发偏好"，但"Spring Boot 3.2"和"深色模式"这两条记忆都被召回——这就是语义检索的力量，它理解的是"意思"，而不是精确匹配关键词。

## 5. 关闭

```java
mem.close();
```

关闭时会自动将索引持久化到磁盘。下次用相同路径打开时，所有记忆和索引自动恢复。

## 完整代码

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

            // 存入
            mem.add("用户偏好深色模式");
            mem.add("当前项目使用 Spring Boot 3.2");

            // 检索
            List<MemoryResult> results = mem.search("开发偏好", 5);
            for (MemoryResult r : results) {
                System.out.println(r.getContent() + " (score=" + r.getScore() + ")");
            }
        }
        // try-with-resources 自动调用 close()
    }
}
```

## 下一步

- [检索模式](./search-modes.md) — 了解三种检索模式，选择最适合你的
- [数据操作](./data-operations.md) — 完整的增删改查 API
- [Embedding 服务配置](./embedding-config.md) — 对接 OpenAI、Ollama 等各种服务
