# 数据操作

本文详细介绍 RogueMemory 的全部 CRUD 操作。

## 存入记忆（add）

### 简单存入

```java
String id = mem.add("用户偏好深色模式");
```

返回自动生成的 UUID 字符串，作为这条记忆的唯一标识。

### 带元数据和命名空间

```java
String id = mem.add("用户偏好深色模式",
    Map.of("source", "chat", "type", "preference"),   // 元数据
    "user-123"                                         // 命名空间
);
```

关于元数据和命名空间的详细说明，请参考 [元数据与命名空间](./metadata-namespace.md)。

---

## 读取记忆（get）

```java
MemoryEntry entry = mem.get(id);
if (entry != null) {
    System.out.println(entry.getContent());       // "用户偏好深色模式"
    System.out.println(entry.getNamespace());      // "user-123"
    System.out.println(entry.getMetadata());       // {source=chat, type=preference}
    System.out.println(entry.getCreatedAt());      // 创建时间（epoch 毫秒）
}
```

如果 ID 不存在或已被删除，返回 `null`。

`MemoryEntry` 字段一览：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `String` | UUID 唯一标识 |
| `content` | `String` | 记忆内容 |
| `metadata` | `Map<String, String>` | 元数据键值对，可能为 null |
| `namespace` | `String` | 命名空间 |
| `createdAt` | `long` | 创建时间（epoch 毫秒） |
| `expireTime` | `long` | 过期时间（epoch 毫秒），0 表示永不过期 |
| `vector` | `float[]` | 原始向量，KEYWORD_ONLY 模式下为 null |

---

## 更新记忆（update）

```java
mem.update(id, "用户强烈偏好深色模式");
```

更新内容时会自动重新计算向量（在向量模式下）。元数据、命名空间、创建时间等保持不变。

### 带命名空间守卫的更新

```java
mem.update(id, "user-123", "用户强烈偏好深色模式");
```

只有当记忆的命名空间与指定的 `"user-123"` 一致时才会更新，命名空间不匹配则静默跳过。适用于多租户场景下防止越权修改。

---

## 删除记忆（delete）

```java
mem.delete(id);
```

采用软删除（墓碑标记），空间在 [compact](./persistence.md) 时回收。删除后 `get(id)` 返回 `null`。

### 带命名空间守卫的删除

```java
mem.delete(id, "user-123");
```

只有当记忆的命名空间与指定的 `"user-123"` 一致时才会删除，命名空间不匹配则静默跳过。

---

## 按命名空间批量删除（deleteByNamespace）

```java
mem.deleteByNamespace("user-123");
```

删除指定命名空间下的**所有记忆**。适用于用户注销、数据清理等场景。内部遍历所有条目并逐个软删除，空间在 [compact](./persistence.md) 时回收。

---

## 判断记忆是否存在（exists）

```java
boolean exists = mem.exists(id);
```

比 `get(id) != null` 更高效——不需要读取完整记录，仅检查索引。

### 带命名空间的判断

```java
boolean exists = mem.exists(id, "user-123");
```

检查 ID 是否存在**且**属于指定命名空间。

---

## 检索记忆（search）

### 简单检索

```java
List<MemoryResult> results = mem.search("用户的开发偏好", 5);
```

参数：
- `query` — 查询文本
- `topK` — 返回最多多少条结果

### 带过滤条件的检索

```java
List<MemoryResult> results = mem.search("用户的偏好", 5,
    SearchOptions.builder()
        .namespace("user-123")           // 只搜指定命名空间
        .filter("type", "preference")    // 只返回 type=preference 的记忆
        .build());
```

`SearchOptions` 支持的选项：

| 选项 | 方法 | 说明 |
|---|---|---|
| 命名空间过滤 | `.namespace("xxx")` | 只搜指定命名空间，null 搜全部 |
| 元数据过滤 | `.filter("key", "value")` | 按元数据精确匹配过滤，可多次调用（AND 语义） |
| RRF 常数 | `.rrfConstant(30)` | HYBRID 模式下的融合常数，默认 60 |

### MemoryResult 字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `String` | 记忆唯一标识 |
| `content` | `String` | 记忆内容 |
| `score` | `float` | 相关度分数，越高越相关 |
| `metadata` | `Map<String, String>` | 元数据键值对 |
| `namespace` | `String` | 命名空间 |
| `createdAt` | `long` | 创建时间（epoch 毫秒） |
| `expireTime` | `long` | 过期时间，0 表示不过期 |

---

## API 速查

| 操作 | 方法 | 说明 |
|---|---|---|
| 存入 | `add(content)` | 简单存入 |
| 存入 | `add(content, metadata, namespace)` | 带元数据和命名空间 |
| 读取 | `get(id)` | 按 ID 获取，返回 `MemoryEntry` |
| 是否存在 | `exists(id)` | 检查记忆是否存在 |
| 是否存在 | `exists(id, namespace)` | 检查指定命名空间下的记忆是否存在 |
| 检索 | `search(query, topK)` | 简单检索 |
| 检索 | `search(query, topK, options)` | 带过滤的检索 |
| 更新 | `update(id, newContent)` | 更新内容，自动重算向量 |
| 更新 | `update(id, namespace, newContent)` | 带命名空间守卫的更新 |
| 删除 | `delete(id)` | 软删除 |
| 删除 | `delete(id, namespace)` | 带命名空间守卫的软删除 |
| 批量删除 | `deleteByNamespace(namespace)` | 删除指定命名空间下所有记忆 |

## 下一步

- [元数据与命名空间](./metadata-namespace.md) — 深入理解过滤与隔离机制
- [持久化与运维](./persistence.md) — 了解持久化恢复和空间回收
