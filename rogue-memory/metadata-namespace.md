# 元数据与命名空间

RogueMemory 提供两种机制来组织和过滤记忆：**元数据** 和 **命名空间**。

---

## 元数据

### 什么是元数据？

元数据是附加在每条记忆上的**键值对信息**，用于描述这条记忆的属性。你可以把它理解为"标签"或"备注"。

比如一条关于用户偏好的记忆，你可以附带元数据记录它的来源：

```java
mem.add("用户偏好深色模式", Map.of("source", "chat"), "user-123");
```

这里 `source=chat` 就是元数据，说明这条记忆来自对话。

### 什么时候用元数据？

当你需要**按条件过滤检索结果**时。比如：

- 按来源过滤：只搜来自聊天记录的记忆，排除来自配置文件的
- 按类型过滤：只搜"偏好"类记忆，排除"上下文"类
- 按状态过滤：只搜"已确认"的记忆，排除"待确认"的

### 如何使用

**存入时指定元数据：**

```java
mem.add("用户偏好深色模式",
    Map.of("source", "chat", "type", "preference"),
    "user-123");
```

**检索时按元数据过滤：**

```java
// 只返回 source=chat 的记忆
List<MemoryResult> results = mem.search("用户偏好", 5,
    SearchOptions.builder()
        .filter("source", "chat")
        .build());

// 多个过滤条件（AND 语义）：source=chat 且 type=preference
List<MemoryResult> results = mem.search("用户偏好", 5,
    SearchOptions.builder()
        .filter("source", "chat")
        .filter("type", "preference")
        .build());
```

过滤是**精确匹配**：key 和 value 都必须完全一致。

### 不需要元数据？

如果你的场景简单，用无参版本即可：

```java
mem.add("一条普通记忆");  // 无元数据
```

---

## 命名空间

### 什么是命名空间？

命名空间是记忆的**逻辑分区**。你可以把它理解为一个"文件夹"——不同命名空间下的记忆互不干扰，检索时可以指定只搜某个命名空间。

最常见的用法是**按用户隔离**：每个用户一个命名空间，搜索时只搜自己的记忆。

### 什么时候用命名空间？

- **多用户系统** — 每个用户一个命名空间，避免搜索到别人的记忆
- **多业务隔离** — 不同业务线的记忆分开存储和检索
- **多环境区分** — 开发环境和生产环境的记忆分开

### 如何使用

**存入时指定命名空间：**

```java
mem.add("用户 A 的偏好", Map.of(), "user-A");
mem.add("用户 B 的偏好", Map.of(), "user-B");
```

**检索时过滤命名空间：**

```java
// 只搜用户 A 的记忆
List<MemoryResult> results = mem.search("偏好", 5,
    SearchOptions.builder()
        .namespace("user-A")
        .build());
```

### 不指定命名空间

如果 `add` 时没有指定命名空间，默认使用 `"default"`。

```java
mem.add("一条默认命名空间的记忆");  // 命名空间为 "default"
```

检索时不设置 `namespace` 过滤，会搜索**所有**命名空间。

---

## 元数据 vs 命名空间

| 维度 | 元数据 | 命名空间 |
|---|---|---|
| 本质 | 键值对标签 | 逻辑分区 |
| 一条记忆可以有 | 多个键值对 | 只有一个 |
| 过滤方式 | 精确匹配（支持 AND） | 精确匹配 |
| 典型用途 | 按类型/来源/状态过滤 | 按用户/业务线隔离 |
| 不指定时 | 无元数据 | 默认 `"default"` |

**推荐做法**：用命名空间做粗粒度隔离（如按用户），用元数据做细粒度过滤（如按类型或来源）。

## 下一步

- [Embedding 服务配置](./embedding-config.md) — 对接各种 Embedding 服务
- [持久化与运维](./persistence.md) — 了解持久化恢复和空间回收
