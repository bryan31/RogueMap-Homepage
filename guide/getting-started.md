# 快速开始

本指南将帮助你在 5 分钟内快速上手 RogueMap。

## 安装

### Maven

在你的 `pom.xml` 中添加依赖：

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.0-BETA1</version>
</dependency>
```

### Gradle

在你的 `build.gradle` 中添加依赖：

```gradle
implementation 'com.yomahub:roguemap:1.0.0-BETA1'
```

## 第一个示例

### OffHeap 模式（堆外内存）

```java
import com.yomahub.roguemap.RogueMap;
import com.yomahub.roguemap.serialization.PrimitiveCodecs;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建一个 String -> Long 的堆外内存 Map
try (RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .maxMemory(100 * 1024 * 1024) // 100MB
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
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>offHeap()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Integer 类型
RogueMap<Integer, Integer> intMap = RogueMap.<Integer, Integer>offHeap()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .build();

// String 类型
RogueMap<String, String> stringMap = RogueMap.<String, String>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// 混合类型
RogueMap<String, Double> mixedMap = RogueMap.<String, Double>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.DOUBLE)
    .build();
```

**支持的原始类型**：`Long`, `Integer`, `Double`, `Float`, `Short`, `Byte`, `Boolean`

### 对象类型

对于复杂对象，可以使用 Kryo 序列化：

```java
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// 对象类型
RogueMap<String, YourObject> objectMap = RogueMap.<String, YourObject>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(YourObject.class))
    .build();
```

::: warning 对象序列化
使用对象序列化会带来额外的性能开销，建议优先使用原始类型。
:::

## 三种存储模式

### 1. OffHeap 模式（堆外内存）

适合需要降低 GC 压力的场景：

```java
RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .maxMemory(100 * 1024 * 1024) // 100MB
    .build();
```

### 2. Mmap 临时文件模式

自动创建临时文件，JVM 关闭后自动删除：

```java
RogueMap<Long, Long> tempMap = RogueMap.<Long, Long>mmap()
    .temporary()
    .allocateSize(500 * 1024 * 1024L) // 500MB
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
```

### 3. Mmap 持久化模式

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
- **OffHeap 模式**: 内存敏感，需要降低 GC 压力
- **Mmap 临时文件**: 大数据量临时处理
- **Mmap 持久化**: 需要数据持久化
:::

## 基本操作

```java
try (RogueMap<String, Long> map = RogueMap.<String, Long>offHeap()
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

- [存储模式](./storage-modes.md) - 深入了解三种存储模式
- [索引策略](./index-strategies.md) - 选择合适的索引
- [编解码器](./codecs.md) - 自定义数据序列化
- [配置选项](./configuration.md) - 详细配置说明
