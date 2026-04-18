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
// 精确匹配：只返回 source=chat 的记忆
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

### 高级过滤（Filter）

1.1.3 新增 `Filter` 类，支持更丰富的过滤条件，不再局限于精确匹配。

**可用运算符：**

| 方法 | 说明 | 示例 |
|---|---|---|
| `Filter.eq(value)` | 等于 | `Filter.eq("chat")` |
| `Filter.gt(value)` | 大于（数值比较） | `Filter.gt("3.5")` |
| `Filter.gte(value)` | 大于等于 | `Filter.gte("100")` |
| `Filter.lt(value)` | 小于 | `Filter.lt("1000")` |
| `Filter.lte(value)` | 小于等于 | `Filter.lte("500")` |
| `Filter.in(v1, v2, ...)` | 在列表中 | `Filter.in("chat", "email")` |
| `Filter.between(min, max)` | 范围内（含边界） | `Filter.between("1", "100")` |

**使用示例：**

```java
// 数值过滤：score >= 80
List<MemoryResult> results = mem.search("高分用户", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("80"))
        .build());

// 范围过滤：1 <= priority <= 5
List<MemoryResult> results = mem.search("重要事项", 10,
    SearchOptions.builder()
        .filter("priority", Filter.between("1", "5"))
        .build());

// 多值匹配：type 为 chat 或 email
List<MemoryResult> results = mem.search("沟通记录", 10,
    SearchOptions.builder()
        .filter("type", Filter.in("chat", "email"))
        .build());

// 同一 key 多条件组合（AND 语义）：score >= 60 且 score <= 100
List<MemoryResult> results = mem.search("合格记录", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("60"))
        .filter("score", Filter.lte("100"))
        .build());
```

::: tip 精确匹配简写
`.filter("key", "value")` 等价于 `.filter("key", Filter.eq("value"))`，旧写法完全兼容，无需改动。
:::

**注意事项：**
- `gt`、`gte`、`lt`、`lte`、`between` 做数值比较时，会将 metadata 值当作 `double` 解析，解析失败视为不匹配。
- 同一个 key 可以添加多个 Filter，它们之间是 AND 语义（全部满足才算匹配）。

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
| 过滤方式 | 精确匹配 / Filter 高级过滤（支持 AND） | 精确匹配 |
| 典型用途 | 按类型/来源/状态过滤 | 按用户/业务线隔离 |
| 不指定时 | 无元数据 | 默认 `"default"` |

**推荐做法**：用命名空间做粗粒度隔离（如按用户），用元数据做细粒度过滤（如按类型或来源）。

---

## 命名空间守卫操作

1.1.2 新增了命名空间守卫机制，在更新和删除操作中增加命名空间校验，确保不会误操作其他命名空间的数据：

```java
// 只更新 user-A 命名空间下的记忆，如果 id 不属于该命名空间则跳过
mem.update(id, "user-A", "更新后的内容");

// 只删除 user-A 命名空间下的记忆
mem.delete(id, "user-A");

// 批量删除整个命名空间（用户注销场景）
mem.deleteByNamespace("user-A");

// 检查指定命名空间下是否存在某条记忆
boolean exists = mem.exists(id, "user-A");
```

**典型场景**：多租户系统中，业务层只持有当前用户的命名空间标识，所有写操作都带上命名空间守卫，从数据层面杜绝越权访问。

## 下一步

- [Embedding 服务配置](./embedding-config.md) — 对接各种 Embedding 服务
- [持久化与运维](./persistence.md) — 了解持久化恢复和空间回收
