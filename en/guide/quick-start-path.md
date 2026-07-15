# Getting started (10 minutes)

This is the shortest path for new users. Once completed in order, you can use RogueMap in real business.

## Step 1: Select the data structure first (1 minute)

| Structure | Applicable scenarios | Core operations |
|---|---|---|
| `RogueMap<K, V>` | Key-value storage, cache, state table | `put/get/remove` |
| `RogueList<E>` | Sequential data, log stream, time series | `addLast/get/removeLast` |
| `RogueSet<E>` | Duplication removal, blacklist, tag collection | `add/contains/remove` |
| `RogueQueue<E>` | Task queue, message consumption | `offer/poll/peek` |

## Step 2: Select storage mode again (1 minute)

- `temporary()`: Temporary file mode, automatically cleaned after JVM exits, suitable for batch processing and intermediate data.
- `persistent(path)`: Persistence mode, recoverable after restart, suitable for data that needs to be written to disk.

## Step 3: Copy the runnable template (3 minutes)

### Maven dependencies (1.1.7)

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.7</version>
</dependency>
```

### Minimal example (RogueMap)

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

## Step 4: Fine-tune by scene (3 minutes)

- Multiple concurrent writes: use default `segmentedIndex(64)`.
- `Long` or `Integer` keys and memory sensitive: use `primitiveIndex()`.
- `String` key and heap memory is extremely sensitive: use `lowHeapIndex()` (RogueMap/RogueSet only).
- Uncertain amount of data: Turn on `autoExpand(true)`.
- Critical write link: regular `checkpoint()`, or turn on `autoCheckpoint()`.
- Data needs to expire automatically: set `defaultTTL(duration, unit)`.

## Step 5: Pre-go-live check (2 minutes)

1. Persistence restart test: close the process and restart it to confirm that the data can be recovered.
2. Codec consistency: The same file must use the same `keyCodec/valueCodec` after restart.
3. Resource release: use `try-with-resources` uniformly.
4. Fragmentation monitoring: Set compression threshold based on `getMetrics().getFragmentationRatio()`.

## Next step

- [Quick Start ](./getting-started.md): Complete examples and basic API.
- [Configuration option ](./configuration.md): Description of build parameters and default values.
- [Common problems and troubleshooting ](./troubleshooting.md): High-frequency error reporting and repair methods.
