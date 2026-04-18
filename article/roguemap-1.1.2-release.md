# RogueMap 1.1.2 发布：RogueMemory 新增命名空间守卫操作，多租户更安全

> 多用户场景下，一条 `delete(id)` 可能删错别人的记忆？1.1.2 用命名空间守卫从 API 层面杜绝越权操作。

---

## 更新概览

1.1.2 是 RogueMemory 的 API 增强版本，核心变化是为多租户场景补齐了命名空间级别的操作能力。如果你在做 AI Agent 多用户系统，这次更新直接解决的是**数据安全**问题。

| 新增 API | 说明 |
|----------|------|
| `exists(id)` | 高效判断记忆是否存在，无需读取完整记录 |
| `exists(id, namespace)` | 判断指定命名空间下的记忆是否存在 |
| `delete(id, namespace)` | 带命名空间守卫的删除，命名空间不匹配则静默跳过 |
| `update(id, namespace, newContent)` | 带命名空间守卫的更新，命名空间不匹配则静默跳过 |
| `deleteByNamespace(namespace)` | 按命名空间批量删除所有记忆 |

此外修复了 `OrdinalRegistry` 反序列化的向后兼容问题，升级后可无缝读取 1.1.1 产生的数据文件。

---

## 问题背景

在多用户 AI Agent 系统中，每条记忆通过命名空间（namespace）按用户隔离。之前的版本提供了基本的命名空间检索能力，但写入侧的操作（delete、update）缺少命名空间校验：

```java
// 1.1.1 — 只能按 id 操作，没有命名空间校验
mem.delete(id);          // 如果 id 被猜到或传错，可能删掉其他用户的数据
mem.update(id, content); // 同上
```

这在业务层需要额外维护权限校验逻辑，一旦遗漏就有越权风险。

---

## 命名空间守卫

1.1.2 为 delete 和 update 操作增加了命名空间守卫参数，**从 API 层面保证操作不会跨命名空间**：

```java
// 只删除 user-A 命名空间下的记忆，id 不属于该命名空间则静默跳过
mem.delete(id, "user-A");

// 只更新 user-A 命名空间下的记忆
mem.update(id, "user-A", "更新后的内容");
```

内部实现是先读取记录校验命名空间，匹配才执行操作，不匹配直接返回。业务层不需要再做额外的权限判断。

**典型用法**：业务层从会话上下文中拿到当前用户标识（如 `userId`），所有写操作都带上这个标识：

```java
String userId = getCurrentUserId();

// 存入时指定命名空间
mem.add("用户偏好深色模式", Map.of(), userId);

// 后续操作全部带命名空间守卫
mem.update(memoryId, userId, "用户强烈偏好深色模式");
mem.delete(memoryId, userId);

// 用户注销时一键清理
mem.deleteByNamespace(userId);
```

---

## 批量删除：deleteByNamespace

新增 `deleteByNamespace(namespace)` 方法，删除指定命名空间下的所有记忆。典型场景：

- **用户注销 / GDPR 合规** — 用户要求删除所有个人数据，一条命令搞定
- **业务线清理** — 某个业务线下线，清空其所有记忆
- **测试环境重置** — 清空测试命名空间的数据

```java
mem.deleteByNamespace("user-123");
```

内部遍历所有条目并逐个软删除，空间在 compact 时回收。

---

## 存在性检查：exists

新增 `exists(id)` 和 `exists(id, namespace)` 方法，比 `get(id) != null` 更高效——不需要读取完整记录，仅检查索引：

```java
// 简单存在性检查
if (mem.exists(memoryId)) {
    // 记忆存在
}

// 带命名空间的存在性检查
if (mem.exists(memoryId, userId)) {
    // 该记忆存在且属于当前用户
}
```

---

## 升级方式

Maven 依赖版本号改为 `1.1.2` 即可，数据文件向后兼容，无需迁移：

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.2</version>
</dependency>

<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.2</version>
</dependency>
```

---

- **GitHub**：https://github.com/bryan31/RogueMap
- **官网**：https://roguemap.yomahub.com/
- **Maven Central**：`com.yomahub:roguemap-core:1.1.2`
