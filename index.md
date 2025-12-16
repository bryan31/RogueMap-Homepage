---
layout: home

hero:
  name: "RogueMap"
  text: "高性能键值存储引擎"
  tagline: "突破内存限制，提供持久化能力，并保持百万级吞吐的性能"
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
      text: 性能白皮书
      link: /performance/benchmark

features:
  - icon: 🚀
    title: 高效写入
    details: 写入性能超越 HashMap 1.45 倍。基于堆外内存和内存映射文件，只写索引不写数据，写入速度显著提升。

  - icon: 💾
    title: 灵活存储
    details: 支持堆外内存（OffHeap）、内存映射文件（Mmap Persist）和临时文件（Mmap Temp）三种模式，满足不同场景需求。

  - icon: 🔒
    title: 高并发支持
    details: 64 段分段锁设计，StampedLock 乐观锁优化，支持高并发读写操作，线程安全可靠。

  - icon: 📊
    title: 低 GC 压力
    details: 堆外内存模式让数据存储在 JVM 堆外(堆外包括堆外内存以及磁盘)，大幅降低 GC 压力。相比 HashMap 减少 84.7% 堆内存占用，让你的应用运行更流畅。

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
    <version>1.0.0-BETA2</version>
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

### RogueMap 多模式对比

基于 Linux 2C4G 服务器，100 万条数据测试（对象包含 10 个属性）

| 模式 | 写入 | 读取 | 写吞吐量 | 读吞吐量 | 堆内存占用 |
|------|------|------|----------|----------|-----------|
| HashMap | 1,535ms | 158ms | 651,465 ops/s | 6,329,113 ops/s | 311.31 MB |
| **RogueMap Mmap 持久化** | **1,057ms** | **642ms** | **946,073 ops/s** | **1,557,632 ops/s** | **47.63 MB** |
| **RogueMap Mmap 临时文件** | **1,113ms** | **704ms** | **898,472 ops/s** | **1,420,454 ops/s** | **47.66 MB** |
| **RogueMap OffHeap** | **1,924ms** | **854ms** | **519,750 ops/s** | **1,170,960 ops/s** | **47.81 MB** |

**核心优势：**
- 💾 **堆内存占用减少 84.7%**：HashMap 需要 311.31 MB，RogueMap 降至 47.63 MB，大幅降低 GC 压力
- 🚀 **写入性能提升显著**：Mmap 持久化模式比 HashMap 快 1.45 倍（1,535ms → 1,057ms）
- ⚡ **百万级读取吞吐**：在 2C4G 机器上达到 155 万 ops/s，满足绝大多数业务场景
- 💿 **支持数据持久化**：进程重启数据不丢失，HashMap 做不到

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
| ❌ 大数据量导致频繁 Full GC | ✅ 堆外内存，GC 压力降低 84.7% |
| ❌ 重启数据全部丢失 | ✅ Mmap 持久化模式，数据永久保存 |
| ❌ 内存占用巨大（311.31 MB） | ✅ 堆内存占用仅 47.63 MB |
| ❌ 写入性能瓶颈 | ✅ 写入性能提升 1.45 倍（只写索引，不写数据） |
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
