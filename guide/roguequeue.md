# RogueQueue - FIFO 队列

RogueQueue 是基于内存映射文件的 FIFO 队列，支持两种模式：**链表模式（无界）** 和 **环形缓冲区模式（有界）**。

## 两种模式对比

| 特性 | 链表模式（Linked） | 环形缓冲区（Circular） |
|-----|------------------|---------------------|
| 容量 | 无界，自动扩容 | 有界，固定槽位 |
| 内存 | 按需增长 | 预分配固定 |
| 碎片 | 可能有碎片 | 无碎片 |
| compact | 支持 | 不支持（本身无碎片） |
| 崩溃恢复 | 支持快照 | 支持快照 |
| 适用场景 | 任务队列、消息队列 | 高频入队出队、固定缓冲 |

## 链表模式（无界队列）

### 创建链表队列

```java
import com.yomahub.roguemap.RogueQueue;
import com.yomahub.roguemap.serialization.StringCodec;

// 临时文件模式
RogueQueue<String> linkedQueue = RogueQueue.<String>mmap()
    .temporary()
    .linked()  // 链表模式
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 持久化模式
RogueQueue<String> persistentQueue = RogueQueue.<String>mmap()
    .persistent("data/tasks.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .allocateSize(512 * 1024 * 1024L)  // 512MB
    .build();
```

### 基本操作

```java
// 入队（添加到尾部）
linkedQueue.offer("task1");
linkedQueue.offer("task2");
linkedQueue.offer("task3");

// 查看队首元素（不移除）
String peek = linkedQueue.peek();  // "task1"

// 出队（从头部移除）
String task = linkedQueue.poll();  // "task1"
String task2 = linkedQueue.poll(); // "task2"

// 获取队列大小
int size = linkedQueue.size();     // 1
```

### 链表队列特性

- ✅ **无界容量** - 按需自动扩容
- ✅ **空闲节点复用** - poll 的节点可供 offer 复用
- ✅ **支持 compact()** - 回收已删除数据占用的空间
- ✅ **崩溃恢复快照** - 每次 offer/poll 自动写入快照

## 环形缓冲区模式（有界队列）

### 创建环形队列

```java
import com.yomahub.roguemap.serialization.PrimitiveCodecs;

// 环形缓冲区模式：容量 1024，最大元素 64 字节
RogueQueue<Long> circularQueue = RogueQueue.<Long>mmap()
    .persistent("data/ringbuffer.db")
    .circular(1024, 64)  // (容量, 最大元素字节数)
    .elementCodec(PrimitiveCodecs.LONG)
    .build();
```

### 基本操作

```java
// 入队
circularQueue.offer(1L);
circularQueue.offer(2L);

// 检查队列状态
boolean full = circularQueue.isFull();   // 是否已满
boolean empty = circularQueue.isEmpty(); // 是否为空
int size = circularQueue.size();         // 当前元素数

// 出队
Long value = circularQueue.poll();  // 1L

// 查看队首
Long peek = circularQueue.peek();   // 2L
```

### 环形队列特性

- ✅ **有界容量** - 固定槽位，不会无限增长
- ✅ **无碎片** - 固定大小槽位，不会产生内存碎片
- ✅ **高性能** - 适合高频入队出队场景
- ⚠️ **不支持 compact()** - 本身无碎片，无需压缩

### 容量检查

```java
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/bounded.db")
    .circular(100, 256)  // 100 个槽位，每个最大 256 字节
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 安全入队
if (!queue.isFull()) {
    queue.offer("new-item");
} else {
    System.out.println("队列已满，无法添加");
}

// 或者检查返回值
boolean added = queue.offer("item");
if (!added) {
    System.out.println("队列已满");
}
```

## 完整示例

### 任务队列场景

```java
import com.yomahub.roguemap.RogueQueue;
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// 定义任务类
public class Task {
    private String id;
    private String type;
    private long timestamp;

    // getters and setters...
}

// 创建持久化任务队列
RogueQueue<Task> taskQueue = RogueQueue.<Task>mmap()
    .persistent("data/task_queue.db")
    .linked()  // 无界队列
    .elementCodec(KryoObjectCodec.create(Task.class))
    .allocateSize(1024 * 1024 * 1024L)  // 1GB
    .build();

// 生产者：添加任务
public void submitTask(Task task) {
    taskQueue.offer(task);
    taskQueue.flush();  // 确保持久化
}

// 消费者：处理任务
public void processTasks() {
    while (true) {
        Task task = taskQueue.poll();
        if (task == null) {
            // 队列为空，等待
            Thread.sleep(100);
            continue;
        }

        // 处理任务
        executeTask(task);
    }
}
```

### 日志缓冲区场景

```java
// 使用环形缓冲区作为日志缓冲
RogueQueue<String> logBuffer = RogueQueue.<String>mmap()
    .persistent("data/log_buffer.db")
    .circular(10000, 1024)  // 10000 条日志，每条最大 1KB
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 日志写入
public void writeLog(String message) {
    if (!logBuffer.isFull()) {
        logBuffer.offer(message);
    } else {
        // 缓冲区满，强制刷新
        flushLogs();
        logBuffer.offer(message);
    }
}

// 日志刷新
public void flushLogs() {
    while (!logBuffer.isEmpty()) {
        String log = logBuffer.poll();
        writeToDisk(log);
    }
}
```

### 消息传递场景

```java
// 进程间消息队列
RogueQueue<byte[]> messageQueue = RogueQueue.<byte[]>mmap()
    .persistent("/tmp/messages.db")
    .linked()
    .elementCodec(new BytesCodec())  // 自定义字节编解码器
    .allocateSize(256 * 1024 * 1024L)
    .build();

// 发送消息
public void sendMessage(byte[] data) {
    messageQueue.offer(data);
}

// 接收消息
public byte[] receiveMessage() {
    return messageQueue.poll();
}
```

## 资源管理

### try-with-resources

```java
// 推荐方式
try (RogueQueue<String> queue = RogueQueue.<String>mmap()
        .persistent("data/queue.db")
        .linked()
        .elementCodec(StringCodec.INSTANCE)
        .build()) {

    queue.offer("item1");
    queue.offer("item2");

    while (!queue.isEmpty()) {
        System.out.println(queue.poll());
    }

} // 自动关闭
```

### 手动关闭

```java
RogueQueue<String> queue = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

try {
    queue.offer("item1");
    queue.flush();  // 刷新到磁盘
} finally {
    queue.close();
}
```

## 崩溃恢复

RogueQueue 支持崩溃恢复，确保数据不丢失：

### 链表队列快照

每次 `offer()` 和 `poll()` 操作都会自动写入崩溃恢复快照：

```java
// 第一次运行：写入数据
RogueQueue<String> q1 = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

q1.offer("a");
q1.offer("b");
q1.offer("c");
String item = q1.poll();  // "a"，同时写入快照
q1.close();

// 第二次运行：恢复数据
RogueQueue<String> q2 = RogueQueue.<String>mmap()
    .persistent("data/queue.db")
    .linked()
    .elementCodec(StringCodec.INSTANCE)
    .build();

// 从快照恢复：队列包含 "b", "c"
System.out.println(q2.size());  // 2
System.out.println(q2.peek());  // "b"
```

### 环形队列恢复

环形队列同样支持崩溃恢复：

```java
// 环形队列会在每次操作时保存 head/tail 指针
// 崩溃后可以恢复到最近一次操作的状态
```

## 配置选项

### 链表模式

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `persistent(path)` | 持久化文件路径 | - |
| `temporary()` | 临时文件模式 | - |
| `linked()` | 使用链表模式 | - |
| `allocateSize(size)` | 预分配文件大小 | 256MB |
| `elementCodec(codec)` | 元素编解码器 | 必填 |

### 环形模式

| 选项 | 说明 | 默认值 |
|-----|------|--------|
| `persistent(path)` | 持久化文件路径 | - |
| `temporary()` | 临时文件模式 | - |
| `circular(capacity, maxSize)` | 容量和最大元素字节 | 必填 |
| `elementCodec(codec)` | 元素编解码器 | 必填 |

## 与 Java Queue 对比

| 特性 | LinkedList/ArrayDeque | RogueQueue |
|-----|----------------------|------------|
| 数据存储 | JVM 堆内存 | 内存映射文件 |
| 内存压力 | 高 | 低 |
| GC 影响 | 大数据量触发 Full GC | 几乎无影响 |
| 持久化 | 不支持 | 支持 |
| 容量限制 | 受 JVM 堆限制 | 可达 TB 级 |
| 崩溃恢复 | 不支持 | 支持 |

## 模式选择指南

```
开始
  ↓
需要固定容量？
  ├─ 是 → 高频入队出队？
  │        ├─ 是 → 环形缓冲区模式✅
  │        └─ 否 → 链表模式 ✅（也支持有界）
  └─ 否 → 需要自动扩容？
           ├─ 是 → 链表模式 ✅
           └─ 否 → 环形缓冲区模式 ✅
```

### 推荐场景

**链表模式适合：**
- 任务队列（任务大小不固定）
- 消息队列（消息量不确定）
- 事件流处理

**环形缓冲区适合：**
- 日志缓冲（固定大小缓冲）
- 高频数据采集
- 固定窗口数据处理

## 注意事项

1. **环形队列容量** - 创建后无法动态调整容量
2. **资源释放** - 使用完毕后务必关闭
3. **元素大小** - 环形队列需预估最大元素字节数
4. **持久化** - 关键数据记得调用 `flush()`

## 下一步

- [事务](./transaction.md) - 多操作原子提交
- [运维指南](./operations.md) - 监控和 compact
- [最佳实践](./best-practices.md) - 使用建议
