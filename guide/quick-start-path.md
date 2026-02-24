# 上手路线（10 分钟）

这是一条面向新用户的最短路径。按顺序完成后，你就能把 RogueMap 用在真实业务里。

## 第 1 步：先选数据结构（1 分钟）

| 结构 | 适用场景 | 核心操作 |
|---|---|---|
| `RogueMap<K, V>` | 键值存储、缓存、状态表 | `put/get/remove` |
| `RogueList<E>` | 顺序数据、日志流、时间序列 | `addLast/get/removeLast` |
| `RogueSet<E>` | 去重、黑名单、标签集合 | `add/contains/remove` |
| `RogueQueue<E>` | 任务队列、消息消费 | `offer/poll/peek` |

## 第 2 步：再选存储模式（1 分钟）

- `temporary()`：临时文件模式，JVM 退出后自动清理，适合批处理和中间数据。
- `persistent(path)`：持久化模式，重启可恢复，适合需要落盘的数据。

## 第 3 步：复制可运行模板（3 分钟）

### Maven 依赖（1.0.1）

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap</artifactId>
    <version>1.0.1</version>
</dependency>
```

### 最小示例（RogueMap）

```java
import com.yomahub.roguemap.RogueMap;
import com.yomahub.roguemap.serialization.PrimitiveCodecs;
import com.yomahub.roguemap.serialization.StringCodec;

try (RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
        .persistent("data/demo.db")
        .keyCodec(StringCodec.INSTANCE)
        .valueCodec(PrimitiveCodecs.LONG)
        .build()) {
    map.put("u:1001", 98L);
    Long score = map.get("u:1001");
    System.out.println(score);
}
```

## 第 4 步：按场景微调（3 分钟）

- 并发写入多：用默认 `segmentedIndex(64)`。
- `Long` 或 `Integer` 键且内存敏感：用 `primitiveIndex()`。
- 数据量不确定：开启 `autoExpand(true)`。
- 关键写入链路：定期 `checkpoint()`。

## 第 5 步：上线前检查（2 分钟）

1. 持久化重启测试：关闭进程后重启，确认数据可恢复。
2. 编解码器一致性：同一文件重启后必须使用相同 `keyCodec/valueCodec`。
3. 资源释放：统一使用 `try-with-resources`。
4. 碎片监控：基于 `getMetrics().getFragmentationRatio()` 设置压缩阈值。

## 下一步

- [快速开始](./getting-started.md) ：完整示例与基础 API。
- [配置选项](./configuration.md) ：构建参数与默认值说明。
- [常见问题与排障](./troubleshooting.md) ：高频报错与修复方式。
