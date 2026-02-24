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

虽然 MapDB 提供了持久化，但性能不够理想：

- ❌ 读取速度慢（100 万条数据需要 3.2 秒）
- ❌ 写入速度慢（100 万条数据需要 2.8 秒）
- ❌ API 使用复杂

## RogueMap 的解决方案

### 1. 内存映射文件存储

RogueMap 将数据存储在内存映射文件中：

```java
// RogueMap 使用内存映射文件
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 优势：
// ✅ 堆内存占用大幅减少
// ✅ GC 压力显著降低
// ✅ 避免 OOM 风险
```

### 2. 极致性能优化

RogueMap 通过多种优化手段实现极致性能：

**零拷贝序列化**
```java
// 原始类型直接内存布局，无序列化开销
RogueMap<Long, Long> map = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

**智能内存分配**
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
| Mmap Temp | 临时文件，自动清理 | 大数据临时处理 |
| Mmap Persist | 持久化，可恢复 | 需要数据持久化 |

### 4. 简单易用的 API

```java
// 类型安全的 Builder API
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 熟悉的 Map 接口
map.put("key", 100L);
Long value = map.get("key");
map.remove("key");
```

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
RogueMap<String, UserProfile> cache = RogueMap.<String, UserProfile>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(UserProfile.class))
    .allocateSize(1024 * 1024 * 1024) // 1GB
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

1. **写入性能优秀** - 比 HashMap 更快
2. **更低的内存占用** - 大幅降低 GC 压力
3. **更简单的 API** - 类型安全，易于使用
4. **零依赖** - 核心库无第三方依赖
5. **灵活的存储** - 两种模式自由选择
6. **持久化支持** - 唯一同时支持持久化和高性能的方案
7. **高并发** - 线程安全，支持高并发读写

## 下一步

- [快速开始](./getting-started.md) - 5 分钟上手
- [存储模式](./storage-modes.md) - 了解两种存储模式
- [性能白皮书](../performance/benchmark) - 详细性能数据与分析
