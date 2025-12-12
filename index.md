---
layout: home

hero:
  name: "RogueMap"
  text: "高性能键值存储引擎"
  tagline: "堆外存储，零 GC 压力，读写性能提升数倍"
  image:
    light: /logo-in-light.svg
    dark: /logo-in-dark.svg
    alt: RogueMap
  theme: brand
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/bryan31/RogueMap
    - theme: alt
      text: 性能测试
      link: /performance/benchmark

features:
  - icon: 🚀
    title: 极致性能
    details: Mmap 持久化模式读取比 HashMap 快 2.4 倍。基于堆外内存和内存映射文件，零拷贝序列化，性能极致优化。

  - icon: 💾
    title: 灵活存储
    details: 支持堆外内存（OffHeap）、内存映射文件（Mmap Persist）和临时文件（Mmap Temp）三种模式，满足不同场景需求。

  - icon: 🔒
    title: 高并发支持
    details: 64 段分段锁设计，StampedLock 乐观锁优化，支持高并发读写操作，线程安全可靠。

  - icon: 📊
    title: 零 GC 压力
    details: 堆外内存模式让数据存储在 JVM 堆外，彻底告别频繁 GC。相比 HashMap 减少 87% 堆内存占用，让你的应用运行更流畅。

  - icon: 💿
    title: 数据持久化
    details: HashMap 重启即失，RogueMap Mmap 模式支持数据持久化到磁盘，进程重启自动恢复，让数据永不丢失。

  - icon: 🎯
    title: 简单易用
    details: 简洁的 Builder API，类型安全，零依赖（核心库），自动资源管理，5 分钟即可上手。

  - icon: 🔧
    title: 智能内存管理
    details: Slab Allocator 智能分配，7 个 size class，空闲列表重用，负载因子自适应扩容。

  - icon: 📈
    title: 多种索引策略
    details: 支持 HashIndex、SegmentedHashIndex、LongPrimitiveIndex、IntPrimitiveIndex 等多种索引，灵活选择。

  - icon: 🛠️
    title: 零依赖设计
    details: 核心库无任何第三方依赖，仅依赖JDK，轻量级集成，减少依赖冲突。
---

## 快速体验

### Maven 依赖

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.0-BETA1</version>
</dependency>
```

### 5 分钟上手

```java
// 创建堆外内存 Map (Long -> Object)
try (RogueMap<Long, User> map = RogueMap.<Long, User>offHeap()
        .keyCodec(PrimitiveCodecs.LONG)
        .valueCodec(KryoObjectCodec.create(User.class))
        .maxMemory(100 * 1024 * 1024) // 100MB
        .build()) {

    // 存储数据
    map.put(1001L, new User("Alice", 25));
    map.put(1002L, new User("Bob", 30));

    // 读取数据
    User user = map.get(1001L);
    System.out.println("User: " + user.getName()); // Alice
}
```

## 性能表现

在 MacBook Pro (M3, 18GB) 上测试 100 万条数据，数据为拥有10个属性的PO值对象

### RogueMap 多模式对比

| 模式 | 写入 | 读取 | 写吞吐量 | 读吞吐量 | 堆内存占用 |
|------|------|------|----------|----------|-----------|
| JDK HashMap/ConcurrentHashMap | 611ms | 463ms | 1,636,661 ops/s | 2,159,827 ops/s | 304.04 MB |
| OffHeap模式 | 658ms | 251ms | 1,519,756 ops/s | 3,984,063 ops/s | 40.46 MB |
| Mmap临时文件 | 629ms | 212ms | 1,589,825 ops/s | 4,716,981 ops/s | 40.13 MB |
| **Mmap持久化** | **547ms** | **195ms** | **1,828,153 ops/s** | **5,128,205 ops/s** | **40.01 MB** |

**核心优势：**
- 🚀 **Mmap 持久化**最快：读取 195ms，写入 547ms
- 📊 **堆内存占用减少 87%**：从 304 MB 降至 40 MB
- ⚡ **读取速度提升 2.4 倍**：比 HashMap 模式快 2.4 倍
- 💿 **支持数据持久化**：进程重启数据不丢失

## 适用场景

- ✅ 高性能键值缓存
- ✅ 大数据量临时处理
- ✅ 实时数据分析
- ✅ 嵌入式键值存储
- ✅ 持久化配置管理
- ✅ 会话状态存储

## 为什么选择 RogueMap？

### HashMap 的痛点，RogueMap 的解决方案

| HashMap 的问题 | RogueMap 的优势 |
|---------------|----------------|
| ❌ 大数据量导致频繁 Full GC | ✅ 堆外内存，GC 压力降低 87% |
| ❌ 重启数据全部丢失 | ✅ Mmap 持久化模式，数据永久保存 |
| ❌ 内存占用巨大（304 MB） | ✅ 堆内存占用仅 40 MB |
| ❌ 读取性能受限 | ✅ 读取性能提升 2.4 倍 |
| ❌ 只能存储在堆内 | ✅ 三种存储模式灵活切换 |

**简单易用的 API：**
```java
// 堆外内存模式 - 降低 GC 压力
RogueMap<Long, User> map = RogueMap.<Long, User>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(User.class))
    .maxMemory(100 * 1024 * 1024) // 100MB
    .build();

// Mmap 持久化模式 - 数据永久保存
RogueMap<Long, User> map = RogueMap.<Long, User>mmap()
    .persistent("data.db")
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
```

## 开源协议

[Apache License 2.0](https://github.com/bryan31/RogueMap/blob/master/LICENSE)
