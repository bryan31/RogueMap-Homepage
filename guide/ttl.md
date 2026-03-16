# TTL 数据过期

RogueMap 支持为数据设置过期时间（Time-To-Live），过期后自动失效。无需外部缓存组件即可实现数据自动淘汰。

## 基本用法

### 设置默认 TTL

通过 `defaultTTL()` 为所有写入的数据设置统一的过期时间：

```java
import java.util.concurrent.TimeUnit;

RogueMap<String, String> cache = RogueMap.<String, String>mmap()
    .persistent("data/cache.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .defaultTTL(30, TimeUnit.MINUTES)  // 默认 30 分钟过期
    .build();

cache.put("session:abc", "user-data");  // 使用默认 TTL
```

### 单条数据覆盖 TTL（仅 RogueMap）

RogueMap 支持在 `put` 时为单条数据指定独立的过期时间，覆盖默认值：

```java
cache.put("session:abc", "user-data");                        // 使用默认 TTL（30 分钟）
cache.put("token:xyz", "jwt-data", 1, TimeUnit.HOURS);       // 自定义 TTL（1 小时）
```

### 过期效果

```java
// 30 分钟后
cache.get("session:abc");  // 返回 null（已过期，惰性删除）

// 1 小时内
cache.get("token:xyz");    // 仍然有效
```

## 存储格式与惰性删除

### 存储格式

启用 TTL 后，每条数据在 mmap 文件中的实际存储格式为：

```
[expireTime: 8 字节 (long)][实际序列化数据]
```

- `expireTime` 为绝对时间戳（`System.currentTimeMillis() + ttlMillis`）
- `expireTime = 0` 表示永不过期

### 惰性删除机制

TTL 基于惰性删除：数据在被读取时才判断是否过期，不会主动后台清理。

```java
// 数据写入时记录过期时间戳
cache.put("key", "value");  // 写入 [expireTime][value]

// 读取时检查
cache.get("key");
// 1. 读取 expireTime
// 2. 如果 System.currentTimeMillis() > expireTime → 删除数据，返回 null
// 3. 如果未过期 → 返回实际数据
```

::: warning 注意
过期数据在被读取前仍占用存储空间。建议定期执行 [compact](./compact.md) 回收已过期数据占用的空间。
:::

## 各数据结构支持情况

| 能力 | RogueMap | RogueList | RogueSet | RogueQueue |
|---|---|---|---|---|
| `defaultTTL()` 构建参数 | ✅ | ✅ | ✅ | ✅ |
| `get()` 惰性删除 | ✅ | — | — | — |
| `put(key, value, ttl, unit)` 单条覆盖 | ✅ | ❌ | ❌ | ❌ |

- **RogueMap** 提供完整的运行时 TTL 支持：`get()` 自动惰性删除过期数据，`put(key, value, ttl, unit)` 可为单条数据指定独立的过期时间。
- 其他数据结构（RogueList、RogueSet、RogueQueue）支持 `defaultTTL()` 构建参数，TTL 时间戳会写入存储。

## 容量规划

启用 `defaultTTL()` 后，每条数据额外占用 **8 字节**存储过期时间戳（`long` 类型）。对于大量小值数据，这部分开销需要纳入容量规划。

```
例：100 万条数据
额外开销 = 1,000,000 × 8 字节 = 约 7.6 MB
```

## 配合 compact 回收空间

过期数据在被读取时惰性删除，但其存储空间标记为死字节。定期 [compact](./compact.md) 可回收这部分空间：

```java
StorageMetrics metrics = cache.getMetrics();
if (metrics.shouldCompact(0.5)) {  // 碎片率 > 50%
    cache = cache.compact(256 * 1024 * 1024L);
}
```

## 最佳实践

1. **合理设置过期时间** — TTL 太短会频繁触发惰性删除，太长会占用存储空间。
2. **单条覆盖默认值** — 对特殊数据使用 `put(key, value, ttl, unit)` 覆盖默认 TTL（仅 RogueMap 支持）。
3. **配合 compact 使用** — 定期 compact 回收过期数据占用的空间。
4. **容量规划** — 启用 TTL 后每条数据额外占用 8 字节，大数据量场景需纳入估算。

## 下一步

- [空间回收](./compact.md) — 回收过期数据占用的空间
- [自动检查点](./auto-checkpoint.md) — 自动持久化保障
- [配置选项](./configuration.md) — 完整配置参数速查
