# RogueSet - 并发集合

RogueSet 是基于内存映射文件的高性能并发集合，采用 64 段分段锁设计，支持高并发场景下的线程安全操作。

## 快速开始

### 临时文件模式

```java
import com.yomahub.roguemap.RogueSet;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建临时文件模式的并发集合
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### 持久化模式

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// 创建持久化模式的并发集合
RogueSet<Long> persistentSet = RogueSet.<Long>mmap()
    .persistent("data/myset.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .segmentCount(64)  // 64 段分段锁
    .allocateSize(128 * 1024 * 1024L)  // 128MB
    .build();
```

## 基本操作

### 添加元素

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 添加元素，返回是否添加成功
boolean added1 = set.add("apple");   // true（首次添加）
boolean added2 = set.add("apple");   // false（已存在）
boolean added3 = set.add("banana");  // true
```

### 检查元素

```java
// 检查元素是否存在
boolean hasApple = set.contains("apple");   // true
boolean hasOrange = set.contains("orange"); // false

// 获取集合大小
int size = set.size();  // 2
```

### 删除元素

```java
// 删除元素，返回是否删除成功
boolean removed = set.remove("apple");  // true
boolean removed2 = set.remove("apple"); // false（已不存在）
```

### 清空集合

```java
// 清空所有元素
set.clear();

// 检查是否为空
boolean empty = set.isEmpty();  // true
```

## 并发机制

### 64 段分段锁设计

RogueSet 采用 64 个独立段，每个段有独立的 StampedLock：

```
Segment 分布：
┌──────────┬──────────┬──────────┬──────────┐
│ Segment  │ Segment  │ Segment  │   ...    │
│    0     │    1     │    2     │   63     │
└──────────┴──────────┴──────────┴──────────┘
     ↓           ↓           ↓          ↓
StampedLock StampedLock StampedLock StampedLock
（乐观读）  （乐观读）  （乐观读）  （乐观读）

哈希分布：
hash(element) % segmentCount → Segment Index
```

### 并发优势

- ✅ **减少锁竞争** - 64 个段独立加锁，不同元素的 操作互不阻塞
- ✅ **乐观读优化** - `contains()` 使用乐观读，大部分情况下无锁
- ✅ **高写入性能** - 写操作仅锁定单个段
- ✅ **线程安全** - 所有操作都是线程安全的

### 并发示例

```java
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

RogueSet<Long> set = RogueSet.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .segmentCount(64)
    .build();

ExecutorService executor = Executors.newFixedThreadPool(16);

// 多线程并发写入
for (int i = 0; i < 1000; i++) {
    final long id = i;
    executor.submit(() -> {
        set.add(id);        // 线程安全
        set.contains(id);   // 线程安全
    });
}

executor.shutdown();
```

## 迭代器支持

RogueSet 支持迭代遍历，但需要注意 Fail-fast 机制：

### 安全遍历

```java
RogueSet<String> set = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

set.add("a");
set.add("b");
set.add("c");

// 遍历所有元素
for (String element : set) {
    System.out.println(element);
}
```

### Fail-fast 机制

::: warning 并发修改检测
迭代过程中修改集合会抛出 `ConcurrentModificationException`：
:::

```java
try {
    for (String s : set) {
        // 危险！迭代过程中修改集合
        set.add("new-element");  // 抛出 ConcurrentModificationException
    }
} catch (ConcurrentModificationException e) {
    System.out.println("检测到并发修改");
}
```

### 安全的遍历修改

```java
// 方案1：先收集要添加的元素，遍历后再添加
List<String> toAdd = new ArrayList<>();
for (String s : set) {
    if (s.startsWith("prefix-")) {
        toAdd.add(s + "-processed");
    }
}
for (String s : toAdd) {
    set.add(s);
}

// 方案2：使用快照遍历
List<String> snapshot = new ArrayList<>();
for (String s : set) {
    snapshot.add(s);
}
// 在快照上进行操作，不影响原集合
```

## 完整示例

### 去重场景

```java
import com.yomahub.roguemap.RogueSet;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建用于去重的集合
RogueSet<String> uniqueIds = RogueSet.<String>mmap()
    .persistent("data/unique_ids.db")
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(512 * 1024 * 1024L)  // 512MB
    .build();

// 处理数据流，自动去重
public void processRecord(String recordId) {
    if (uniqueIds.add(recordId)) {
        // 首次出现，处理数据
        processNewRecord(recordId);
    } else {
        // 重复数据，跳过
        System.out.println("跳过重复记录: " + recordId);
    }
}

private void processNewRecord(String id) {
    // 处理新记录的逻辑
}
```

### 标签系统

```java
// 用户标签集合
RogueSet<String> userTags = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 添加标签
userTags.add("premium");
userTags.add("active");
userTags.add("newsletter-subscriber");

// 检查标签
if (userTags.contains("premium")) {
    System.out.println("用户是高级会员");
}

// 获取标签数量
int tagCount = userTags.size();
System.out.println("用户共有 " + tagCount + " 个标签");
```

### ID 黑名单

```java
// 黑名单集合
RogueSet<Long> blacklist = RogueSet.<Long>mmap()
    .persistent("data/blacklist.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .build();

// 添加黑名单
blacklist.add(1001L);
blacklist.add(1002L);

// 检查是否在黑名单
public boolean isBlocked(Long userId) {
    return blacklist.contains(userId);
}

// 移除黑名单
public void unblock(Long userId) {
    blacklist.remove(userId);
}
```

## 配置选项

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `persistent(path)` | 持久化文件路径 | - |
| `temporary()` | 临时文件模式 | - |
| `allocateSize(size)` | 预分配文件大小 | 256MB |
| `elementCodec(codec)` | 元素编解码器 | 必填 |
| `segmentCount(count)` | 分段锁数量 | 64 |
| `initialCapacity(cap)` | 每段初始容量 | 16 |

::: tip 参数约束
`segmentCount(count)` 必须是 2 的幂次方，例如 32、64、128。
:::

## 与 Java HashSet 对比

| 特性 | HashSet | RogueSet |
|-----|---------|----------|
| 数据存储 | JVM 堆内存 | 内存映射文件 |
| 内存压力 | 高（占用堆内存） | 低（文件映射存储） |
| GC 影响 | 大数据量触发 Full GC | 几乎无影响 |
| 持久化 | 不支持 | 支持 |
| 并发安全 | 非线程安全 | 线程安全（64 段锁） |
| 容量限制 | 受 JVM 堆限制 | 可达 TB 级 |

## 性能建议

### 1. 选择合适的分段数

```java
// 高并发场景：增加分段数
RogueSet<String> highConcurrency = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .segmentCount(128)  // 128 段
    .build();

// 低并发场景：减少分段数
RogueSet<String> lowConcurrency = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .segmentCount(32)   // 32 段
    .build();
```

### 2. 使用原始类型

```java
// 推荐：使用原始类型（性能更好）
RogueSet<Long> idSet = RogueSet.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .build();

// 避免：字符串类型（有序列化开销）
RogueSet<String> strSet = RogueSet.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### 3. 避免迭代中修改

```java
// 不好的做法 ❌
for (String s : set) {
    if (condition) {
        set.remove(s);  // 可能抛出异常
    }
}

// 好的做法 ✅
List<String> toRemove = new ArrayList<>();
for (String s : set) {
    if (condition) {
        toRemove.add(s);
    }
}
for (String s : toRemove) {
    set.remove(s);
}
```

## 注意事项

1. **资源释放** - 使用完毕后务必调用 `close()` 或使用 try-with-resources
2. **迭代器安全** - 迭代过程中不要修改集合
3. **分段数选择** - 根据并发程度调整 `segmentCount`
4. **持久化一致性** - 关闭前调用 `flush()` 确保数据落盘

## 下一步

- [RogueQueue](./roguequeue.md) - FIFO 队列
- [并发控制](./concurrency.md) - 深入了解并发机制
- [运维指南](./operations.md) - 监控和维护
