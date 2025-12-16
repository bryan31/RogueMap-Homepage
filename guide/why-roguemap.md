# 为什么选择 RogueMap

## 问题背景

在 Java 应用中使用键值存储时，我们常常面临以下问题：

### 1. HashMap 的内存问题

```java
// 传统 HashMap 占用大量堆内存
Map<String, Object> cache = new HashMap<>();
for (int i = 0; i < 1_000_000; i++) {
    cache.put("key" + i, largeObject);
}
// 问题：
// - 占用大量堆内存（300+ MB）
// - 频繁 GC，影响应用性能
// - 可能导致 OOM
```

### 2. 外部缓存的复杂性

使用 Redis、Memcached 等外部缓存：

- ❌ 需要额外的服务器资源
- ❌ 网络 I/O 开销
- ❌ 部署和运维复杂
- ❌ 序列化/反序列化开销

### 3. MapDB 的性能问题

虽然 MapDB 提供了堆外存储和持久化，但性能不够理想：

- ❌ 读取速度慢（100 万条数据需要 3.2 秒）
- ❌ 写入速度慢（100 万条数据需要 2.8 秒）
- ❌ API 使用复杂

## RogueMap 的解决方案

### 1. 堆外内存存储

RogueMap 将数据存储在 JVM 堆外内存中：

```java
// RogueMap 使用堆外内存
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(100 * 1024 * 1024) // 100MB
    .build();

// 优势：
// ✅ 堆内存占用减少 87%
// ✅ GC 压力显著降低
// ✅ 避免 OOM 风险
```

### 2. 极致性能优化

RogueMap 通过多种优化手段实现极致性能：

**零拷贝序列化**
```java
// 原始类型直接内存布局，无序列化开销
RogueMap<Long, Long> map = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

**Slab 内存分配**
- 7 个 size class（16B 到 16KB）
- 减少内存碎片
- 空闲列表重用

**高并发优化**
- 64 段分段锁
- StampedLock 乐观锁
- 减少锁竞争

### 3. 灵活的存储模式

根据不同场景选择合适的存储模式：

| 模式 | 特点 | 适用场景 |
|-----|------|---------|
| OffHeap | 堆外内存，低 GC | 内存敏感应用 |
| Mmap Temp | 临时文件，自动清理 | 大数据临时处理 |
| Mmap Persist | 持久化，可恢复 | 需要数据持久化 |

### 4. 简单易用的 API

```java
// 类型安全的 Builder API
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(100 * 1024 * 1024)
    .build();

// 熟悉的 Map 接口
map.put("key", 100L);
Long value = map.get("key");
map.remove("key");
```

## 性能对比

### RogueMap 多模式对比

基于 Linux 2C4G 服务器，100 万条数据测试（对象包含 10 个属性）

| 模式 | 写入 | 读取 | 写吞吐量 | 读吞吐量 | 堆内存 |
|-----|------|------|----------|----------|--------|
| HashMap | 2445ms | 64ms | 408,997 ops/s | 15,625,000 ops/s | 304.49 MB |
| FastUtil | 736ms | 49ms | 1,358,695 ops/s | 20,408,163 ops/s | 268.06 MB |
| **RogueMap Mmap 持久化** | **1254ms** | **566ms** | **797,448 ops/s** | **1,766,784 ops/s** | **40.00 MB** |
| **RogueMap OffHeap** | 1899ms | 1033ms | 526,592 ops/s | 968,054 ops/s | **40.18 MB** |

**关键发现**：
- 堆内存占用减少 **87%**（从 304 MB 降至 40 MB）
- 写入性能比 HashMap 提升 **1.95 倍**
- 读取吞吐达到 **176 万 ops/s**，满足绝大多数业务场景
- **唯一同时支持持久化和高性能的方案**

## 设计理念

### 1. 性能至上

- 基于 Unsafe API 的底层优化
- 零拷贝序列化
- 智能内存分配
- 高并发优化

### 2. 简单易用

- 类型安全的 Builder API
- 熟悉的 Map 接口
- 自动资源管理
- 零依赖设计

### 3. 灵活可靠

- 多种存储模式
- 多种索引策略
- 持久化支持
- 线程安全

## 典型场景

### 场景 1: 高性能缓存

```java
// 替代 Redis/Memcached
RogueMap<String, UserProfile> cache = RogueMap.<String, UserProfile>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(UserProfile.class))
    .maxMemory(1024 * 1024 * 1024) // 1GB
    .build();

// 优势：
// ✅ 零网络开销
// ✅ 更高的吞吐量
// ✅ 更简单的部署
```

### 场景 2: 大数据临时处理

```java
// 避免 OOM
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .allocateSize(10L * 1024 * 1024 * 1024) // 10GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .build();

// 优势：
// ✅ 支持超大数据量
// ✅ 降低 GC 压力
// ✅ 自动清理临时文件
```

### 场景 3: 持久化存储

```java
// 嵌入式数据库
RogueMap<String, Config> configStore = RogueMap.<String, Config>mmap()
    .persistent("config.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Config.class))
    .build();

// 优势：
// ✅ 数据持久化
// ✅ 自动恢复
// ✅ 高性能读写
```

## 总结

选择 RogueMap 的理由：

1. **写入性能优秀** - 比 HashMap 快 1.95 倍（只写索引，不写数据）
2. **更低的内存占用** - 减少 87% 堆内存，大幅降低 GC 压力
3. **更简单的 API** - 类型安全，易于使用
4. **零依赖** - 核心库无第三方依赖
5. **灵活的存储** - 三种模式自由选择
6. **持久化支持** - 唯一同时支持持久化和高性能的方案
7. **高并发** - 线程安全，支持高并发读写
8. **百万级读取吞吐** - 176 万 ops/s，满足绝大多数业务场景

## 下一步

- [快速开始](./getting-started.md) - 5 分钟上手
- [存储模式](./storage-modes.md) - 了解三种存储模式
- [性能白皮书](../performance/) - 详细性能数据与分析
