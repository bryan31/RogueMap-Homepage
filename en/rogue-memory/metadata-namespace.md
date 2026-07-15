# Metadata and namespace

RogueMemory provides two mechanisms to organize and filter memories: **metadata** and **namespace**.

---

## Metadata

### What is metadata?

Metadata is **key-value pair information** attached to each memory, which is used to describe the attributes of this memory. You can think of it as "label" or "note".

For example, for a memory about user preferences, you can attach metadata to record its source:

```java
mem.add("User preference dark mode", Map.of("source", "chat"), "user-123");
```

`source=chat` here is metadata, indicating that this memory comes from the conversation.

### When to use metadata?

When you need to filter search results by conditions. For example:

- Filter by source: only search memories from chat history, exclude memories from profiles
- Filter by type: only search "preference" category memories, exclude "context" category
- Filter by status: only search "confirmed" memories, exclude "pending confirmation"

### How to use

**Specify metadata when depositing:**

```java
mem.add("User preference dark mode",
    Map.of("source", "chat", "type", "preference"),
    "user-123");
```

**Filter by metadata when retrieving:**

```java
// Exact match: only memory of source=chat is returned
List<MemoryResult> results = mem.search("User preferences", 5,
    SearchOptions.builder()
        .filter("source", "chat")
        .build());

// Multiple filters (AND semantics): source=chat and type=preference
List<MemoryResult> results = mem.search("User preferences", 5,
    SearchOptions.builder()
        .filter("source", "chat")
        .filter("type", "preference")
        .build());
```

### Advanced filtering (Filter)

1.1.3 Added the `Filter` class, which supports richer filtering conditions and is no longer limited to exact matching.

**Available operators:**

| Method | Description | Example |
|---|---|---|
| `Filter.eq(value)` | equal to | `Filter.eq("chat")` |
| `Filter.gt(value)` | Greater than (numeric comparison) | `Filter.gt("3.5")` |
| `Filter.gte(value)` | Greater than or equal to | `Filter.gte("100")` |
| `Filter.lt(value)` | Less than | `Filter.lt("1000")` |
| `Filter.lte(value)` | Less than or equal to | `Filter.lte("500")` |
| `Filter.in(v1, v2, ...)` | In the list | `Filter.in("chat", "email")` |
| `Filter.between(min, max)` | Within range (including boundaries) | `Filter.between("1", "100")` |

**Usage example:**

```java
// Numerical filtering: score >= 80
List<MemoryResult> results = mem.search("high scoring users", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("80"))
        .build());

// Range filtering: 1 <= priority <= 5
List<MemoryResult> results = mem.search("Important matters", 10,
    SearchOptions.builder()
        .filter("priority", Filter.between("1", "5"))
        .build());

// Multi-value matching: type is chat or email
List<MemoryResult> results = mem.search("Communication records", 10,
    SearchOptions.builder()
        .filter("type", Filter.in("chat", "email"))
        .build());

// Multiple condition combinations for the same key (AND semantics): score >= 60 and score <= 100
List<MemoryResult> results = mem.search("Qualification record", 10,
    SearchOptions.builder()
        .filter("score", Filter.gte("60"))
        .filter("score", Filter.lte("100"))
        .build());
```

::: tip abbreviation for exact match
`.filter("key", "value")` is equivalent to `.filter("key", Filter.eq("value"))`. The old writing method is fully compatible and does not need to be changed.
:::

**Note:**
- When performing numerical comparisons on `gt`, `gte`, `lt`, `lte`, and `between`, the metadata value will be parsed as `double`. Failure in parsing will be regarded as a mismatch.
- Multiple Filters can be added to the same key, and there is AND semantics between them (a match is considered only if all are satisfied).

### Don’t need metadata?

If your scenario is simple, just use the no-parameter version:

```java
mem.add("a common memory");  // No metadata
```

---

## Namespace

### What is a namespace?

A namespace is a logical partition of memory. You can think of it as a "folder" - memories in different namespaces do not interfere with each other, and you can specify to search only a certain namespace during retrieval.

The most common usage is **isolation by user**: each user has a namespace, and only searches his own memory when searching.

### When to use namespaces?

- **Multi-user system** — One namespace for each user to avoid searching other people’s memories
- **Multi-Business Isolation** — Memories of different business lines are stored and retrieved separately
- **Multiple environment distinction** — Separate the memory of development environment and production environment

### How to use

**Specify namespace when saving:**

```java
mem.add("User A’s preferences", Map.of(), "user-A");
mem.add("User B’s preferences", Map.of(), "user-B");
```

**Filter namespaces when retrieving:**

```java
// Search only user A's memory
List<MemoryResult> results = mem.search("Preference", 5,
    SearchOptions.builder()
        .namespace("user-A")
        .build());
```

### No namespace specified

If no namespace is specified for `add`, `"default"` is used by default.

```java
mem.add("A memory of the default namespace");  // The namespace is "default"
```

If the `namespace` filter is not set when retrieving, **all** namespaces will be searched.

---

## Metadata vs Namespace

| Dimensions | Metadata | Namespace |
|---|---|---|
| Essence | Key-value pair label | Logical partition |
| A memory can have | multiple key-value pairs | only one |
| Filtering method | Exact match / Filter Advanced filtering (supports AND) | Exact match |
| Typical uses | Filter by type/source/status | Isolate by user/line of business |
| When not specified | No metadata | Default `"default"` |

**Recommended practice**: Use namespaces for coarse-grained isolation (such as by user), and use metadata for fine-grained filtering (such as by type or source).

---

## Namespace guard operations

1.1.2 Added a new namespace guard mechanism, adding namespace verification in update and delete operations to ensure that data in other namespaces will not be misoperated:

```java
// Only update the memory under the user-A namespace. If the id does not belong to the namespace, skip it.
mem.update(id, "user-A", "Updated content");

// Only delete memories under the user-A namespace
mem.delete(id, "user-A");

// Delete the entire namespace in batches (user logout scenario)
mem.deleteByNamespace("user-A");

// Check whether a certain memory exists in the specified namespace
boolean exists = mem.exists(id, "user-A");
```

**Typical scenario**: In a multi-tenant system, the business layer only holds the namespace identifier of the current user, and all write operations carry namespace guards to prevent unauthorized access from the data level.

## Next step

- [Embedding service configuration ](./embedding-config.md) — docking various Embedding services
- [Persistence and Operation ](./persistence.md) — Understand persistence recovery and space reclamation
