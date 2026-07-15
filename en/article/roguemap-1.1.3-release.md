# RogueMap 1.1.3 released: New Filter advanced filtering for metadata retrieval

> Previously, metadata filtering could only perform exact matches? 1.1.3 Introduces the Filter abstraction, which supports seven operators: eq, gt, gte, lt, lte, in, and between. The same key can superimpose multiple conditions.

---

## Update overview

1.1.3 is an enhanced retrieval version of RogueMemory. The core change is the introduction of the `Filter` class, which upgrades metadata filtering from a single exact match to a combinable conditional expression.

| Changes | Description |
|------|------|
| Added `Filter` class | Seven operators: eq, gt, gte, lt, lte, in, between |
| `SearchOptions.filter(key, Filter)` | Filtering method that supports Filter conditions |
| Multiple conditions with the same key | Multiple filters can be superimposed on the same metadata key (AND semantics) |
| Backward compatibility | `.filter("key", "value")` exact matching writing method remains unchanged |

---

## Problem background

Metadata filtering in 1.1.2 only supports exact matches:

```java
// Only exact matching of source == "chat" can be done
SearchOptions.builder()
    .filter("source", "chat")
    .build();
```

It is impossible to express common filtering requirements such as "score >= 80", "priority between 1 and 5", and "type is chat or email". The business layer can only retrieve the full amount first and then filter it twice in memory.

---

## Filter operator

1.1.3 Added `com.yomahub.roguemap.memory.Filter` abstract class, providing seven static factory methods:

| Methods | Semantics | Examples | Description |
|------|------|------|------|
| `Filter.eq(value)` | Equal to | `Filter.eq("chat")` | Exact match, equivalent to the old way of writing |
| `Filter.gt(value)` | Greater than | `Filter.gt("3.5")` | Numeric comparison (double) |
| `Filter.gte(value)` | Greater than or equal to | `Filter.gte("80")` | Numeric comparison |
| `Filter.lt(value)` | Less than | `Filter.lt("1000")` | Numeric comparison |
| `Filter.lte(value)` | Less than or equal to | `Filter.lte("500")` | Numeric comparison |
| `Filter.in(v1, v2, ...)` | In list | `Filter.in("chat", "email")` | Discrete value matching |
| `Filter.between(min, max)` | Within range (including boundaries) | `Filter.between("1", "100")` | Numeric range |

---

## Usage example

### Numeric filtering

```java
// Retrieve memory for score >= 80
List<MemoryResult> results = mem.search("high score record", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("80"))
        .build());
```

### Range filtering

```java
// priority is between 1 and 5
List<MemoryResult> results = mem.search("Important matters", 10,
    SearchOptions.builder()
        .filter("priority", Filter.between("1", "5"))
        .build());
```

### Multiple value matching

```java
// type is chat or email
List<MemoryResult> results = mem.search("Communication records", 10,
    SearchOptions.builder()
        .filter("type", Filter.in("chat", "email"))
        .build());
```

### Same key, multiple conditions

```java
// score >= 60 and score <= 100 (AND semantics)
List<MemoryResult> results = mem.search("Qualification record", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("60"))
        .filter("score", Filter.lte("100"))
        .build());
```

### Mixed use

```java
// namespace + exact match + advanced filtering
List<MemoryResult> results = mem.search("Preference", 10,
    SearchOptions.builder()
        .namespace("user-A")
        .filter("type", "preference")           // Exact match, compatible with old writing
        .filter("score", Filter.gte("80"))      // Advanced filtering
        .build());
```

---

## Backwards Compatibility

The old version of exact matching writing method is fully compatible and does not need to be changed:

```java
// These two ways of writing are completely equivalent
.filter("source", "chat")
.filter("source", Filter.eq("chat"))
```

---

## Upgrade method

Just change the Maven dependency version number to `1.1.3`. The API is fully backwards compatible:

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
- **Official website**: https://roguemap.yomahub.com/
- **Maven Central**：`com.yomahub:roguemap-core:1.1.3`
