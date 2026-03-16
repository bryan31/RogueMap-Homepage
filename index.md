---
layout: home

hero:
  name: "RogueMap"
  text: "为 JVM 打造的嵌入式持久化数据结构"
  tagline: "四种数据结构，低 GC 压力，支持持久化、事务、TTL 过期、自动扩容、自动检查点与崩溃恢复。"
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
    title: 四种结构，一套风格
    details: "RogueMap、RogueList、RogueSet、RogueQueue 全部采用统一 Builder 与运维能力。"

  - icon: 💽
    title: 数据可落盘可恢复
    details: "`persistent(path)` 支持重启恢复，`checkpoint()` 与 `autoCheckpoint()` 可缩小崩溃丢失窗口。"

  - icon: ⚙️
    title: 高并发与大容量
    details: "分段索引、乐观读、自动扩容、超低堆 LowHeap 索引，适合大数据量与多线程场景。"

  - icon: 📈
    title: 运行可观测
    details: "内置 `StorageMetrics`，可监控使用量、碎片率、条目数并按阈值触发 compact。支持 TTL 数据自动过期。"
---

## 2 分钟跑起来

### Maven 依赖（1.1.0）

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.1.0</version>
</dependency>
```

### 最小可运行示例

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data/demo.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    map.put("alice", 100L);
    System.out.println(map.get("alice"));
}
```

## 结构选型

| 结构 | 适合场景 | 核心操作 |
|---|---|---|
| `RogueMap<K, V>` | 键值缓存、状态存储 | `put/get/remove` |
| `RogueList<E>` | 顺序数据、时间序列 | `addLast/get/removeLast` |
| `RogueSet<E>` | 去重、标签、黑名单 | `add/contains/remove` |
| `RogueQueue<E>` | 任务与消息消费 | `offer/poll/peek` |

## 推荐阅读路径

1. [上手路线（10 分钟）](/guide/quick-start-path)
2. [快速开始](/guide/getting-started)
3. [配置选项](/guide/configuration)
4. [常见问题与排障](/guide/troubleshooting)
