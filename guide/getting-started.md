# 快速开始

本指南将帮助你在 5 分钟内快速上手 RogueMap。

## 推荐阅读顺序

1. 先看 [上手路线（10 分钟）](./quick-start-path.md) ，拿到最短落地路径。
2. 再按本页示例跑通第一次写入与恢复。
3. 最后进入 [配置选项](./configuration.md) 按业务调优。

## 安装

### Maven

在你的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

### Gradle

在你的 `build.gradle` 中添加依赖：

```gradle
implementation 'com.yomahub:roguemap:1.0.1'
```

## 结构选型速查

| 结构 | 适合什么场景 |
|---|---|
| `RogueMap<K, V>` | 键值存储、缓存、状态表 |
| `RogueList<E>` | 顺序写入、日志流、时间序列 |
| `RogueSet<E>` | 去重、标签、黑名单 |
| `RogueQueue<E>` | 任务队列、消息消费 |

## 第一个示例

### Mmap 临时文件模式

```java
import com.yomahub.roguemap.RogueMap;
import com.yomahub.roguemap.serialization.PrimitiveCodecs;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建一个 String -> Long 的临时文件 Map
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {

    // 存储数据
    map.put("user1", 1000L);
    map.put("user2", 2000L);

    // 读取数据
    Long score = map.get("user1");
    System.out.println("Score: " + score); // 1000

    // 更新数据
    map.put("user1", 1500L);

    // 删除数据
    map.remove("user2");

    // 检查存在
    boolean exists = map.containsKey("user1"); // true

    // 获取大小
    int size = map.size(); // 1
}
```

::: tip 资源管理
RogueMap 实现了 `AutoCloseable` 接口，建议使用 `try-with-resources` 语句自动释放资源。
:::

## 支持的数据类型

### 原始类型

RogueMap 提供了零拷贝的原始类型编解码器：

```java
// Long 类型（高性能）
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Integer 类型
RogueMap<Integer, Integer> intMap = RogueMap.<Integer, Integer>mmap()
    .temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .build();

// String 类型
RogueMap<String, String> stringMap = RogueMap.<String, String>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

**支持的原始类型**：`Long`, `Integer`, `Double`, `Float`, `Short`, `Byte`, `Boolean`

### 对象类型

对于复杂对象，可以使用 Kryo 序列化：

```java
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// 对象类型
RogueMap<String, YourObject> objectMap = RogueMap.<String, YourObject>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(YourObject.class))
    .build();
```

::: warning 对象序列化
使用对象序列化会带来额外的性能开销，建议优先使用原始类型。
:::

## 两种存储模式

### 1. Mmap 临时文件模式

自动创建临时文件，JVM 关闭后自动删除：

```java
RogueMap<Long, Long> tempMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(500 * 1024 * 1024L) // 500MB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 2. Mmap 持久化模式

支持数据持久化到磁盘：

```java
// 第一次：创建并写入数据
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .allocateSize(1024 * 1024 * 1024L) // 1GB
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

map1.put("alice", 100L);
map1.put("bob", 200L);
map1.flush(); // 刷新到磁盘
map1.close();

// 第二次：重新打开并恢复数据
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

long score = map2.get("alice"); // 100L（从磁盘恢复）
map2.close();
```

::: tip 选择建议
- **Mmap 临时文件**: 大数据量临时处理
- **Mmap 持久化**: 需要数据持久化
:::

## 基本操作

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .temporary()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {

    // 写入
    map.put("key1", 100L);

    // 读取
    Long value = map.get("key1");

    // 判断是否存在
    boolean exists = map.containsKey("key1");

    // 删除
    map.remove("key1");

    // 获取大小
    int size = map.size();

    // 清空
    map.clear();
}
```

## 下一步

- [功能矩阵](./feature-matrix.md) - 四种结构能力与边界一页看懂
- [存储模式](./storage-modes.md) - 深入了解两种存储模式
- [索引策略](./index-strategies.md) - 选择合适的索引
- [编解码器](./codecs.md) - 自定义数据序列化
- [配置选项](./configuration.md) - 详细配置说明
- [常见问题与排障](./troubleshooting.md) - 快速定位使用问题
