---
layout: home
markdownStyles: false
title: RogueMap
titleTemplate: Embedded storage and AI memory for Java
---

<!--
  The homepage is composed from section components in .vitepress/theme/home/; copy and data live in home/content.ts.
  Code samples stay in <HomeQuickstart> below so they keep VitePress syntax highlighting.
-->

<HomeHero />

<HomeHeap />

<HomeFeatures />

<HomeQuickstart>

::: code-group

```xml [Maven]
<!-- Core off-heap data structures -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>

<!-- AI memory layer (includes roguemap-embedding transitively) -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.7</version>
</dependency>
```

```java [RogueMap]
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data/demo.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    map.put("alice", 100L);
    System.out.println(map.get("alice")); // 100
}
```

```java [RogueMemory]
RogueMemory mem = RogueMemory.mmap()
    .persistent("data/mem")
    .searchMode(SearchMode.HYBRID)          // Vector + keyword hybrid search
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// Store a memory
mem.add("User prefers dark mode");

// Semantic retrieval
List<MemoryResult> results = mem.search("UI preferences", 5);

mem.close();
```

:::

</HomeQuickstart>

<HomeStructures />

<HomeSkill />

<HomePath />
