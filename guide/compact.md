# 空间回收（compact）

随着数据的写入、更新和删除，存储文件中会产生碎片（已删除/旧数据占用的空间）。`compact()` 方法用于回收这些空间。

## 使用 compact

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 大量写入和删除操作后...
for (int i = 0; i < 1000000; i++) {
    map.put("key-" + i, (long) i);
}
for (int i = 0; i < 500000; i++) {
    map.remove("key-" + i);  // 删除一半数据，产生碎片
}

// 检查碎片率
StorageMetrics metrics = map.getMetrics();
System.out.println("碎片率: " + (metrics.getFragmentationRatio() * 100) + "%");

// 执行 compact
map = map.compact(256 * 1024 * 1024L);  // 压缩到新文件，256MB
```

## compact 原理

```
压缩前：
┌─────────────────────────────────────────────┐
│  数据1  │  碎片  │  数据2  │  碎片  │  数据3  │
└─────────────────────────────────────────────┘

压缩后：
┌─────────────────────────┐
│  数据1  │  数据2  │  数据3  │
└─────────────────────────┘
```

compact 会创建一个新文件，将所有活跃数据复制过去，消除碎片。

## 判断是否需要 compact

```java
StorageMetrics metrics = map.getMetrics();

// 方式1：使用内置判断方法
if (metrics.shouldCompact(0.5)) {  // 碎片率 > 50%
    map = map.compact(newAllocateSize);
}

// 方式2：自定义判断
double fragmentation = metrics.getFragmentationRatio();
if (fragmentation > 0.3) {  // 碎片率 > 30%
    map = map.compact(newAllocateSize);
}
```

## 各数据结构支持情况

| 数据结构 | compact 支持 | 说明 |
|---------|-------------|------|
| RogueMap | ✅ | 仅持久化模式 |
| RogueList | ✅ | 仅持久化模式 |
| RogueSet | ✅ | 仅持久化模式 |
| RogueQueue（链表模式） | ✅ | 仅持久化模式 |
| RogueQueue（环形模式） | ❌ | 固定槽位，无碎片 |

## 注意事项

::: warning 重要
- `compact()` 会返回**新的实例**，原实例已关闭
- 仅持久化模式支持 compact
- 临时文件不支持 compact
- 使用方式：`map = map.compact(newSize);`
:::

```java
// 正确用法 ✅
map = map.compact(512 * 1024 * 1024L);

// 错误用法 ❌
map.compact(512 * 1024 * 1024L);  // 原实例已关闭，但没有接收新实例
map.get("key");  // 抛出异常！
```

## 下一步

- [监控指标](./monitoring.md) — 监控碎片率和空间使用
- [自动扩容](./auto-expand.md) — 按需增长文件空间
- [配置选项](./configuration.md) — 完整配置参数速查
