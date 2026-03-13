# RogueMap 1.0.1 正式版发布：突破 JVM 内存墙的高性能嵌入式存储引擎

> 让你的 Java 应用轻松处理海量数据，堆内存占用降低 84.7%，支持持久化与事务

## 前言

今天，我们非常高兴地宣布：**RogueMap 1.0.1 正式版**已经发布！

RogueMap 是一个基于内存映射文件（mmap）的高性能嵌入式存储引擎，专为解决 Java 应用中**堆内存受限**和**数据持久化**的痛点而生。经过持续的迭代优化，1.0.1 版本已经具备了完整的数据结构支持、企业级的事务能力和生产级的稳定性。

---

## 一、与早期版本相比的改动

从最初的单一键值存储，到如今功能完备的存储引擎，RogueMap 经历了重大升级：

### 1. 新增三种数据结构

早期版本仅提供 RogueMap（键值存储），1.0.1 版本新增了：

- **RogueList**：双向链表，支持 O(1) 随机访问，适合顺序数据和时间序列场景
- **RogueSet**：并发集合，64 段分段锁设计，适合去重、标签、黑名单等场景
- **RogueQueue**：FIFO 队列，支持链表模式（无界）和环形缓冲区模式（有界），适合任务与消息消费场景

四种数据结构采用统一的 Builder API 风格，学习成本低，切换自如。

### 2. 事务支持

新增原子多键操作能力：

- **原子性**：`commit()` 时所有写入原子生效
- **隔离级别**：Read Committed，读取已提交数据
- **死锁预防**：按 segment index 升序加锁，从根源杜绝死锁
- **自动回滚**：未调用 `commit()` 时自动回滚

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);
    txn.commit();  // 原子提交
}
```

### 3. 运维能力增强

- **自动扩容**：文件空间不足时自动按倍数扩容，透明无感知
- **空间回收**：`compact()` 方法回收碎片空间，提升存储效率
- **检查点**：`checkpoint()` 强制持久化索引，缩小崩溃丢失窗口
- **运行监控**：`StorageMetrics` 提供文件大小、碎片率、条目数等指标

### 4. 性能优化

- **forEach 遍历**：支持遍历所有键值对
- **空闲链表复用**：LinkedQueueStorage 新增空闲链表，复用已 poll 节点
- **Fail-fast 迭代器**：RogueSet 和 RogueList 迭代器支持并发修改检测
- **崩溃恢复增强**：CRC32 校验 + 写入代数 + 脏标志三重保障

---

## 二、核心特性与功能

### 四种数据结构，一套风格

| 结构 | 核心操作 | 典型场景 |
|------|---------|---------|
| `RogueMap<K,V>` | `put/get/remove` | 键值缓存、状态存储 |
| `RogueList<E>` | `addLast/get/removeLast` | 顺序数据、时间序列 |
| `RogueSet<E>` | `add/contains/remove` | 去重、标签、黑名单 |
| `RogueQueue<E>` | `offer/poll/peek` | 任务队列、消息消费 |

### 两种存储模式

- **临时模式** `temporary()`：JVM 退出后自动清理，适合大数据临时处理
- **持久化模式** `persistent(path)`：数据落盘，进程重启后自动恢复

### 技术亮点

- **零拷贝序列化**：原始类型（Long、Integer、Double 等）直接内存布局，无序列化开销
- **64 段分段锁**：StampedLock 乐观读，高并发下锁竞争极低
- **零依赖**：核心库无第三方依赖，Kryo 为可选依赖
- **Java 8+**：兼容 Java 8 及以上版本

### 快速上手

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

```java
// 创建持久化 RogueMap
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map.put("alice", 100L);
System.out.println(map.get("alice"));  // 100L
```

---

## 三、为什么选择 RogueMap？

### 传统方案的痛点

**HashMap 的问题**：
- 数据量大时占用大量堆内存，容易 OOM
- 频繁 Full GC 导致应用卡顿
- 进程重启数据全部丢失

**外部缓存（Redis）的问题**：
- 需要额外的服务器资源
- 网络 I/O 开销大
- 部署和运维复杂

**MapDB 的问题**：
- 性能不够理想（100 万条读取需要 7.7 秒）
- API 使用复杂

### RogueMap 的解决方案

| 特性 | 传统集合 | RogueMap |
|------|---------|----------|
| **数据容量** | 受限于堆大小 | **无限制，可达 TB 级** |
| **堆内存占用** | 100% | **仅 15.3%** |
| **GC 影响** | 严重（Full GC 停顿） | **几乎无影响** |
| **持久化** | 不支持 | **支持** |
| **事务** | 不支持 | **原子多键操作** |

### 实际收益

1. **突破内存墙**：不再受 JVM 堆内存限制，轻松处理 TB 级数据
2. **降低 GC 压力**：堆内存占用减少 84.7%，Full GC 频率大幅降低
3. **数据持久化**：进程重启数据不丢失，支持崩溃恢复
4. **简化架构**：嵌入式设计，无需额外服务，零运维成本
5. **高性能**：同类持久化方案中性能最优

---

## 四、性能表现

基于 Linux 2C4G 服务器，100 万条数据测试结果：

### 综合性能对比

| 方案 | 写入时间 | 读取时间 | 堆内存占用 | 持久化 |
|------|---------|---------|-----------|--------|
| HashMap | 1,535ms | **158ms** | 311.31 MB | ❌ |
| FastUtil | **600ms** | **32ms** | 275.69 MB | ❌ |
| **RogueMap 持久化** | **1,057ms** | **642ms** | **47.63 MB** | ✅ |
| MapDB 持久化 | 8,117ms | 7,709ms | 7.71 MB | ✅ |
| Redis（网络） | ~15,000ms | ~10,000ms | 外部服务 | ✅ |

### 关键数据

- **写入性能**：比 HashMap 快 **1.45 倍**，比 MapDB 快 **7.7 倍**
- **读取吞吐**：**155 万 ops/s**，比 MapDB 快 **12 倍**，比 Redis（网络）快 **15.6 倍**
- **内存优化**：比 HashMap 节省 **84.7%** 堆内存

### 设计权衡

RogueMap 在"不可能三角"中选择了**存储突破 + 并发安全**，在速度上做出了一定权衡：

- 读取性能约为 HashMap 的 1/4（因为涉及反序列化）
- 但 **155 万 ops/s** 的读取吞吐已经满足绝大多数业务场景
- 在所有支持持久化的方案中，RogueMap 性能最优

---

## 五、稳定性与生产就绪

### 崩溃恢复机制

RogueMap 采用三重保障确保数据安全：

1. **CRC32 校验**：检测数据损坏
2. **写入代数**：区分写入中和写入完成状态
3. **脏标志**：标识非正常关闭，启动时进行恢复检查

### 生产级特性

| 特性 | 说明 |
|------|------|
| **线程安全** | 所有操作线程安全，64 段分段锁 |
| **崩溃恢复** | 支持，通过 `checkpoint()` 缩小丢失窗口 |
| **空间管理** | 自动扩容 + 手动 compact |
| **监控指标** | 文件大小、碎片率、条目数等 |
| **优雅关闭** | 支持 Shutdown Hook 自动刷盘 |

### 测试覆盖

- 功能测试：MmapFunctionalTest、ListFunctionalTest、SetFunctionalTest、QueueFunctionalTest
- 并发安全测试：ConcurrentSafetyTest、ListConcurrentTest、SetConcurrentTest
- 崩溃恢复测试：CheckpointRecoveryTest、QueueCrashRecoveryTest
- 事务测试：TransactionTest
- 性能对比测试：*ComparisonTest

### 生产环境建议

1. **定期 checkpoint**：重要数据定期刷盘，确保崩溃恢复
2. **监控碎片率**：碎片率 > 50% 时执行 `compact()`
3. **预估容量**：数据量可控时预估容量，避免扩容开销
4. **使用 try-with-resources**：确保资源正确释放
5. **编解码器一致**：恢复时必须使用与写入时相同的编解码器

---

## 六、典型应用场景

### 场景一：高性能本地缓存

替代 Redis/Memcached，零网络开销，更高吞吐量：

```java
RogueMap<String, UserProfile> cache = RogueMap.<String, UserProfile>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(UserProfile.class))
    .allocateSize(1024 * 1024 * 1024)  // 1GB
    .build();
```

### 场景二：大数据临时处理

避免 OOM，支持超大数据量：

```java
RogueMap<Long, Record> tempData = RogueMap.<Long, Record>mmap()
    .temporary()
    .allocateSize(10L * 1024 * 1024 * 1024)  // 10GB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(KryoObjectCodec.create(Record.class))
    .build();
```

### 场景三：持久化状态存储

嵌入式数据库，自动恢复：

```java
RogueMap<String, Config> configStore = RogueMap.<String, Config>mmap()
    .persistent("config.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(Config.class))
    .build();
```

---

## 七、快速开始

### 1. 添加 Maven 依赖

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

### 2. 5 分钟上手

```java
// 创建 RogueMap
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/demo.db")
    .autoExpand(true)  // 自动扩容
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 基本操作
map.put("key1", 100L);
map.get("key1");  // 100L
map.remove("key1");

// 事务操作
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key2", 200L);
    txn.put("key3", 300L);
    txn.commit();  // 原子提交
}

// 遍历
map.forEach((k, v) -> System.out.println(k + " = " + v));

// 关闭（自动刷盘）
map.close();
```

---

## 八、更多资源

- **GitHub**：https://github.com/bryan31/RogueMap
- **官方文档**：详细文档、性能白皮书和最佳实践
- **Maven Central**：`com.yomahub:roguemap:1.0.1`

---

## 总结

RogueMap 1.0.1 正式版是一个功能完备、性能优异、生产就绪的嵌入式存储引擎。如果你正在寻找：

- 突破 JVM 堆内存限制的方案
- 支持持久化的高性能键值存储
- 可靠的嵌入式数据库
- 降低 GC 压力的数据结构

那么 RogueMap 将是你的不二之选！

欢迎 Star、Fork 和提交 Issue，让我们一起打造更好的 Java 嵌入式存储引擎！
