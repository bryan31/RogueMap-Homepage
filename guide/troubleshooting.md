# 常见问题与排障

本文档聚焦 RogueMap 使用中的高频问题，优先给出可直接落地的排查步骤。

## 1. 事务示例编译失败

### 现象

编译器提示找不到 `RogueMap.Transaction`。

### 原因

当前版本 `beginTransaction()` 返回的是 `RogueMapTransaction<K, V>`。

### 正确写法

```java
import com.yomahub.roguemap.RogueMapTransaction;

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("k1", 1L);
    txn.put("k2", 2L);
    txn.commit();
}
```

## 2. 事务调用抛出 UnsupportedOperationException

### 现象

调用 `beginTransaction()` 抛异常，提示仅支持 `SegmentedHashIndex`。

### 原因

你可能使用了 `basicIndex()` 或 `primitiveIndex()`。

### 处理方式

使用默认索引或显式设置：

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64)
    .build();
```

## 3. 重启后读取异常或数据不对

### 现象

重启后读取失败、数据乱码或抛异常。

### 原因

同一持久化文件在重启时使用了不同的编解码器。

### 处理方式

- 确保前后使用相同的 `keyCodec` 与 `valueCodec`
- 如果要更换编解码器，先迁移到新文件（老文件按原编解码器读取再写入新文件）

## 4. 文件类型不匹配

### 现象

打开文件时提示数据类型不匹配（例如期望 MAP，实际 LIST/SET/QUEUE）。

### 原因

同一个文件路径被不同数据结构复用。

### 处理方式

- 保证一个文件只给一种结构使用
- 推荐按结构拆分路径，例如：
  - `data/users.map.db`
  - `data/events.list.db`
  - `data/ids.set.db`
  - `data/tasks.queue.db`

## 5. 为什么无法使用 keySet()/entrySet() 或 getAllEntries()

### 说明

RogueMap 当前不提供 `keySet()` / `entrySet()` / `getAllEntries()`。

### 可用替代

使用 `forEach` 遍历：

```java
map.forEach((key, value) -> {
    // your logic
});
```

## 6. compact() 后旧实例报错

### 现象

调用 `compact()` 后继续使用旧对象，出现异常。

### 原因

`compact()` 返回新实例，旧实例会关闭。

### 正确写法

```java
map = map.compact(512L * 1024 * 1024);
```

## 7. 为什么突然 OutOfMemoryError（分配失败）

### 常见原因

- 文件空间不足
- `autoExpand(false)` 且预分配空间过小
- 设置了 `maxFileSize` 上限并触顶

### 排查建议

1. 查看 `map.getMetrics().getAvailableBytes()`
2. 开启自动扩容并设置合理上限
3. 检查磁盘可用空间

## 8. 默认容量到底是多少

不同结构默认 `allocateSize` 不同：

- `RogueMap` 默认 `2GB`
- `RogueList` 默认 `256MB`
- `RogueSet` 默认 `256MB`
- `RogueQueue` 默认 `256MB`

建议在生产环境显式配置 `allocateSize` 与 `autoExpand`，避免隐式默认值带来的误判。

