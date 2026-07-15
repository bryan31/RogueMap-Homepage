# TTL data expiration

RogueMap supports setting an expiration time (Time-To-Live) for data, which will automatically expire after expiration. Automatic data eviction is achieved without the need for external caching components.

:::info Scope of application
TTL functionality **only works with RogueMap**. The `defaultTTL()` construction parameters of RogueList, RogueSet, and RogueQueue are reserved interfaces and have not yet taken effect.
:::

## Basic usage

### Set default TTL

Set a unified expiration time for all written data through `defaultTTL()`:

```java
import java.util.concurrent.TimeUnit;

RogueMap<String, String> cache = RogueMap.<String, String>mmap()
    .persistent("data/cache.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .defaultTTL(30, TimeUnit.MINUTES)  // Default 30 minutes expiration
    .build();

cache.put("session:abc", "user-data");  // Use default TTL
```

### Single data coverage TTL (RogueMap only)

RogueMap supports specifying an independent expiration time for a single piece of data when `put` is used, overriding the default value:

```java
cache.put("session:abc", "user-data");                        // Use default TTL (30 minutes)
cache.put("token:xyz", "jwt-data", 1, TimeUnit.HOURS);       // Custom TTL (1 hour)
```

### Expiration effect

```java
// 30 minutes later
cache.get("session:abc");  // Returns null (expired, lazy deletion)

// within 1 hour
cache.get("token:xyz");    // still valid
```

## Storage format and lazy deletion

### Storage format

After enabling TTL, the actual storage format of each piece of data in the mmap file is:

```
[expireTime: 8 bytes (long)][actual serialized data]
```

- `expireTime` is the absolute timestamp (`System.currentTimeMillis() + ttlMillis`)
- `expireTime = 0` means never expires

### Lazy deletion mechanism

TTL is based on lazy deletion: the data is not expired until it is read, and will not be actively cleaned in the background.

```java
// Record expiration timestamp when data is written
cache.put("key", "value");  // Write [expireTime][value]

// Check while reading
cache.get("key");
// 1. Read expireTime
// 2. If System.currentTimeMillis() > expireTime → delete data, return null
// 3. If not expired → return actual data
```

::: warning note
Expired data still takes up storage space until it is read. It is recommended to execute [compact](./compact.md) regularly to reclaim the space occupied by expired data.
:::

## Support of each data structure

::: warning Only RogueMap fully supports TTL
TTL functionality is currently only fully implemented in RogueMap. The `defaultTTL()` construction parameters of RogueList, RogueSet, and RogueQueue are reserved interfaces and will not actually take effect after being set.
:::

| Capabilities | RogueMap | RogueList | RogueSet | RogueQueue |
|---|---|---|---|---|
| `defaultTTL()` build parameters | ✅ Available | ⚠️ Reserved interface | ⚠️ Reserved interface | ⚠️ Reserved interface |
| `get()` / `containsKey()` Lazy deletion | ✅ | — | — | — |
| `put(key, value, ttl, unit)` Single Coverage | ✅ | ❌ | ❌ | ❌ |
| `forEach()` Skip expired data | ✅ | — | — | — |

- **RogueMap**: Full support. `get()` automatically deletes expired data lazily, `put(key, value, ttl, unit)` can specify an independent expiration time for a single piece of data, `containsKey()` returns `false` for expired data, and `forEach()` automatically skips expired entries.
- **RogueList / RogueSet / RogueQueue**: `defaultTTL()` The build parameters are reserved interfaces (the Builder method has been defined but the TTL logic is not connected internally). It will not actually take effect after being set, so please do not rely on it.

## Capacity Planning

After `defaultTTL()` is enabled, each piece of data occupies an additional **8 bytes** to store the expiration timestamp (`long` type). For large amounts of small value data, this overhead needs to be factored into capacity planning.

```
Example: 1 million pieces of data
Overhead = 1,000,000 × 8 bytes = ~7.6 MB
```

## Cooperate with compact to reclaim space

Expired data is lazily deleted when it is read, but its storage space is marked as dead bytes. Periodically [compact](./compact.md) can reclaim this space:

```java
StorageMetrics metrics = cache.getMetrics();
if (metrics.shouldCompact(0.5)) {  // Fragmentation rate > 50%
    cache = cache.compact(256 * 1024 * 1024L);
}
```

## Best Practices

1. **Set the expiration time reasonably** — A TTL that is too short will frequently trigger lazy deletion, and a TTL that is too long will occupy storage space.
2. **Single Override Default** — Use `put(key, value, ttl, unit)` to override the default TTL for special data.
3. **Used with compact** — Regular compact reclaims the space occupied by expired data.
4. **Capacity Planning** — After enabling TTL, each piece of data will occupy an additional 8 bytes. Large data volume scenarios need to be included in the estimate.

## Next step

- [Space Reclamation ](./compact.md) — Reclaim the space occupied by expired data
- [Automatic checkpoint ](./auto-checkpoint.md) — Automatic persistence guarantee
- [Configuration option ](./configuration.md) — Quick check of complete configuration parameters
