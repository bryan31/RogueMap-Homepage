# RogueList - 双向链表

RogueList 是基于内存映射文件的高性能双向链表，支持 O(1) 随机访问和双向遍历。

## 快速开始

### 临时文件模式

```java
import com.yomahub.roguemap.RogueList;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建临时文件模式的双向链表
RogueList<String> list = RogueList.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();
```

### 持久化模式

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// 创建持久化模式的双向链表
RogueList<Long> persistentList = RogueList.<Long>mmap()
    .persistent("data/mylist.db")
    .elementCodec(PrimitiveCodecs.LONG)
    .allocateSize(256 * 1024 * 1024L)  // 256MB
    .build();
```

## 基本操作

### 添加元素

```java
RogueList<String> list = RogueList.<String>mmap()
    .temporary()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 添加到末尾（推荐，O(1) 复杂度）
list.addLast("hello");
list.addLast("world");

// 添加到头部（注意：O(n) 复杂度）
list.addFirst("first");
```

### 读取元素

```java
// 获取第一个元素
String first = list.getFirst();     // "first"

// 获取最后一个元素
String last = list.getLast();       // "world"

// O(1) 随机访问
String element = list.get(1);       // "hello"

// 获取链表大小
int size = list.size();             // 3
```

### 删除元素

```java
// 删除最后一个元素（推荐，O(1) 复杂度）
String removed = list.removeLast(); // "world"

// 删除第一个元素（注意：O(n) 复杂度）
String removed2 = list.removeFirst(); // "first"
```

### 检查操作

```java
// 检查是否为空
boolean empty = list.isEmpty();

// 检查是否包含元素
boolean contains = list.contains("hello");
```

## 性能提示

::: warning 时间复杂度注意
- `addLast()` 和 `removeLast()` 是 **O(1)** 复杂度，**推荐使用**
- `addFirst()` 和 `removeFirst()` 是 **O(n)** 复杂度，大列表场景需谨慎使用
:::

| 操作 | 时间复杂度 | 说明 |
|-----|-----------|------|
| `addLast()` | O(1) | 添加到末尾，推荐 |
| `removeLast()` | O(1) | 从末尾删除，推荐 |
| `get(index)` | O(1) | 随机访问 |
| `getFirst()` | O(1) | 获取首元素 |
| `getLast()` | O(1) | 获取尾元素 |
| `addFirst()` | O(n) | 需要移动位置索引数组 |
| `removeFirst()` | O(n) | 需要移动位置索引数组 |

## 迭代器支持

### 普通 for 循环

```java
for (int i = 0; i < list.size(); i++) {
    String element = list.get(i);
    System.out.println(element);
}
```

### 增强for 循环

```java
for (String s : list) {
    System.out.println(s);
}
```

### ListIterator 双向遍历

```java
import java.util.ListIterator;

ListIterator<String> it = list.listIterator();

// 正向遍历
while (it.hasNext()) {
    System.out.println("索引 " + it.nextIndex() + ": " + it.next());
}

// 反向遍历
while (it.hasPrevious()) {
    System.out.println("索引 " + it.previousIndex() + ": " + it.previous());
}
```

### ListIterator 指定起始位置

```java
// 从索引 2 开始
ListIterator<String> it = list.listIterator(2);

while (it.hasNext()) {
    System.out.println(it.next());
}
```

## 完整示例

### 日志收集场景

```java
import com.yomahub.roguemap.RogueList;
import com.yomahub.roguemap.serialization.StringCodec;

// 创建日志链表
RogueList<String> logs = RogueList.<String>mmap()
    .persistent("data/logs.db")
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(1024 * 1024 * 1024L)  // 1GB
    .build();

// 添加日志（追加到末尾，O(1)）
logs.addLast("[2024-01-01 10:00:00] User login: alice");
logs.addLast("[2024-01-01 10:01:00] User action: purchase");
logs.addLast("[2024-01-01 10:02:00] User logout: alice");

// 获取最近的日志
String lastLog = logs.getLast();
System.out.println("最新日志: " + lastLog);

// 遍历所有日志
for (String log : logs) {
    System.out.println(log);
}

// 处理完的日志移除（从末尾或头部）
logs.removeLast();

// 刷新并关闭
logs.flush();
logs.close();
```

### 时间序列数据

```java
// 存储时间序列数据点
RogueList<Long> timeSeries = RogueList.<Long>mmap()
    .temporary()
    .elementCodec(PrimitiveCodecs.LONG)
    .allocateSize(100 * 1024 * 1024L)  // 100MB
    .build();

// 添加时间戳
for (long timestamp = System.currentTimeMillis(); true; ) {
    timeSeries.addLast(timestamp);
    Thread.sleep(1000);
}

// 获取指定时间点的数据
long historicalData = timeSeries.get(100);
```

## 资源管理

### try-with-resources

```java
// 推荐方式：自动资源管理
try (RogueList<String> list = RogueList.<String>mmap()
        .persistent("data/mylist.db")
        .elementCodec(StringCodec.INSTANCE)
        .build()) {

    list.addLast("item1");
    list.addLast("item2");

} // 自动关闭，持久化模式会保存索引
```

### 手动关闭

```java
RogueList<String> list = RogueList.<String>mmap()
    .persistent("data/mylist.db")
    .elementCodec(StringCodec.INSTANCE)
    .build();

try {
    list.addLast("item1");
    list.flush();  // 持久化模式：刷新到磁盘
} finally {
    list.close();  // 确保关闭
}
```

## 配置选项

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `persistent(path)` | 持久化文件路径 | - |
| `temporary()` | 临时文件模式 | - |
| `allocateSize(size)` | 预分配文件大小 | 256MB |
| `initialCapacity(cap)` | 位置索引初始容量 | 1024 |
| `elementCodec(codec)` | 元素编解码器 | 必填 |

## 与 Java ArrayList 对比

| 特性 | ArrayList | RogueList |
|-----|-----------|-----------|
| 数据存储 | JVM 堆内存 | 内存映射文件 |
| 内存压力 | 高（占用堆内存） | 低（文件映射存储） |
| GC 影响 | 大数据量触发 Full GC | 几乎无影响 |
| 持久化 | 不支持 | 支持 |
| 随机访问 | O(1) | O(1) |
| 容量限制 | 受 JVM 堆限制 | 可达 TB 级 |

## 注意事项

1. **资源释放** - 使用完毕后务必调用 `close()` 或使用 try-with-resources
2. **性能选择** - 优先使用 `addLast()`/`removeLast()`
3. **迭代器并发** - 迭代过程中不要修改链表，可能抛出 `ConcurrentModificationException`
4. **持久化一致性** - 关闭前调用 `flush()` 确保数据落盘

## 下一步

- [RogueSet](./rogueset.md) - 并发集合
- [RogueQueue](./roguequeue.md) - FIFO 队列
- [运维指南](./operations.md) - 监控和维护
