# RogueMap 1.1.3 发布：元数据检索新增 Filter 高级过滤

> 之前元数据过滤只能精确匹配？1.1.3 引入 Filter 抽象，支持 eq、gt、gte、lt、lte、in、between 七种运算符，同一 key 可叠加多个条件。

---

## 更新概览

1.1.3 是 RogueMemory 的检索增强版本，核心变化是引入 `Filter` 类，将元数据过滤从单一精确匹配升级为可组合的条件表达式。

| 变更 | 说明 |
|------|------|
| 新增 `Filter` 类 | 七种运算符：eq、gt、gte、lt、lte、in、between |
| `SearchOptions.filter(key, Filter)` | 支持 Filter 条件的过滤方法 |
| 同 key 多条件 | 同一个 metadata key 可叠加多个 Filter（AND 语义） |
| 向后兼容 | `.filter("key", "value")` 精确匹配写法不变 |

---

## 问题背景

1.1.2 的元数据过滤只支持精确匹配：

```java
// 只能做 source == "chat" 的精确匹配
SearchOptions.builder()
    .filter("source", "chat")
    .build();
```

无法表达"score >= 80"、"priority 在 1 到 5 之间"、"type 是 chat 或 email"这类常见过滤需求，业务层只能先全量取回再在内存中二次过滤。

---

## Filter 运算符

1.1.3 新增 `com.yomahub.roguemap.memory.Filter` 抽象类，提供七种静态工厂方法：

| 方法 | 语义 | 示例 | 说明 |
|------|------|------|------|
| `Filter.eq(value)` | 等于 | `Filter.eq("chat")` | 精确匹配，与旧写法等价 |
| `Filter.gt(value)` | 大于 | `Filter.gt("3.5")` | 数值比较（double） |
| `Filter.gte(value)` | 大于等于 | `Filter.gte("80")` | 数值比较 |
| `Filter.lt(value)` | 小于 | `Filter.lt("1000")` | 数值比较 |
| `Filter.lte(value)` | 小于等于 | `Filter.lte("500")` | 数值比较 |
| `Filter.in(v1, v2, ...)` | 在列表中 | `Filter.in("chat", "email")` | 离散值匹配 |
| `Filter.between(min, max)` | 范围内（含边界） | `Filter.between("1", "100")` | 数值范围 |

---

## 使用示例

### 数值过滤

```java
// 检索 score >= 80 的记忆
List<MemoryResult> results = mem.search("高分记录", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("80"))
        .build());
```

### 范围过滤

```java
// priority 在 1 到 5 之间
List<MemoryResult> results = mem.search("重要事项", 10,
    SearchOptions.builder()
        .filter("priority", Filter.between("1", "5"))
        .build());
```

### 多值匹配

```java
// type 为 chat 或 email
List<MemoryResult> results = mem.search("沟通记录", 10,
    SearchOptions.builder()
        .filter("type", Filter.in("chat", "email"))
        .build());
```

### 同 key 多条件

```java
// score >= 60 且 score <= 100（AND 语义）
List<MemoryResult> results = mem.search("合格记录", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("60"))
        .filter("score", Filter.lte("100"))
        .build());
```

### 混合使用

```java
// namespace + 精确匹配 + 高级过滤
List<MemoryResult> results = mem.search("偏好", 10,
    SearchOptions.builder()
        .namespace("user-A")
        .filter("type", "preference")           // 精确匹配，旧写法兼容
        .filter("score", Filter.gte("80"))      // 高级过滤
        .build());
```

---

## 向后兼容

旧版精确匹配写法完全兼容，无需改动：

```java
// 这两种写法完全等价
.filter("source", "chat")
.filter("source", Filter.eq("chat"))
```

---

## 升级方式

Maven 依赖版本号改为 `1.1.3` 即可，API 完全向后兼容：

```xml
<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-core</artifactId>
    <version>1.1.3</version>
</dependency>

<dependency>
    <groupId>com.yomahub</groupId>
    <artifactId>roguemap-memory</artifactId>
    <version>1.1.3</version>
</dependency>
```

---

- **GitHub**：https://github.com/bryan31/RogueMap
- **官网**：https://roguemap.yomahub.com/
- **Maven Central**：`com.yomahub:roguemap-core:1.1.3`
