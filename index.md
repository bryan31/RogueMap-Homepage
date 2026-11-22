---
layout: home
markdownStyles: false
title: RogueMap
titleTemplate: Java 嵌入式存储引擎 + AI 记忆层
---

<!--
  首页由 .vitepress/theme/home/ 下的分区组件组成，文案与数据在 home/content.ts。
  代码示例写在下方 <HomeQuickstart> 中，沿用 VitePress 的代码高亮。
-->

<HomeHero />

<HomeHeap />

<HomeFeatures />

<HomeQuickstart>

::: code-group

```xml [Maven]
<!-- 核心堆外数据结构 -->
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>

<!-- AI 记忆层（自动传递依赖 roguemap-embedding） -->
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
    .searchMode(SearchMode.HYBRID)          // 向量 + 关键词混合检索
    .embeddingProvider(new UniversalEmbeddingProvider(apiKey))
    .build();

// 存入记忆
mem.add("用户偏好深色模式");

// 语义检索
List<MemoryResult> results = mem.search("用户界面偏好", 5);

mem.close();
```

:::

</HomeQuickstart>

<HomeStructures />

<HomeSkill />

<HomePath />
