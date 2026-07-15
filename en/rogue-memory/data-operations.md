# Data operations

This article details all CRUD operations of RogueMemory.

## Store in memory (add)

### Simple deposit

```java
String id = mem.add("User preference dark mode");
```

Returns an automatically generated UUID string as the unique identifier of this memory.

### With metadata and namespace

```java
String id = mem.add("User preference dark mode",
    Map.of("source", "chat", "type", "preference"),   // Metadata
    "user-123"                                         // namespace
);
```

For a detailed description of metadata and namespaces, please refer to [Metadata and Namespaces ](./metadata-namespace.md).

---

## Read memory (get)

```java
MemoryEntry entry = mem.get(id);
if (entry != null) {
    System.out.println(entry.getContent());       // "User prefers dark mode"
    System.out.println(entry.getNamespace());      // "user-123"
    System.out.println(entry.getMetadata());       // {source=chat, type=preference}
    System.out.println(entry.getCreatedAt());      // Creation time (epoch milliseconds)
}
```

If the ID does not exist or has been deleted, `null` is returned.

`MemoryEntry` Field Overview:

| Field | Type | Description |
|---|---|---|
| `id` | `String` | UUID unique identifier |
| `content` | `String` | Memory contents |
| `metadata` | `Map<String, String>` | Metadata key-value pair, may be null |
| `namespace` | `String` | Namespace |
| `createdAt` | `long` | Creation time (epoch milliseconds) |
| `expireTime` | `long` | Expiration time (epoch milliseconds), 0 means never expires |
| `vector` | `float[]` | Original vector, null in KEYWORD_ONLY mode |

---

## Update memory (update)

```java
mem.update(id, "Users strongly prefer dark mode");
```

Vectors are automatically recalculated when content is updated (in vector mode). Metadata, namespace, creation time, etc. remain unchanged.

### Updates with namespace guards

```java
mem.update(id, "user-123", "Users strongly prefer dark mode");
```

It will be updated only when the remembered namespace is consistent with the specified `"user-123"`. If the namespace does not match, it will be silently skipped. Suitable for preventing unauthorized modifications in multi-tenant scenarios.

---

## Delete memory (delete)

```java
mem.delete(id);
```

With soft deletion (tombstone marking), space is reclaimed at [compact](./persistence.md). After deletion `get(id)` returns `null`.

### Delete with namespace guard

```java
mem.delete(id, "user-123");
```

It will be deleted only when the remembered namespace is consistent with the specified `"user-123"`. If the namespace does not match, it will be silently skipped.

---

## Batch deletion by namespace (deleteByNamespace)

```java
mem.deleteByNamespace("user-123");
```

Delete **all memories** under the specified namespace. Suitable for user logout, data cleaning and other scenarios. All entries are internally traversed and soft deleted one by one, space is reclaimed at [compact](./persistence.md).

---

## Determine whether the memory exists (exists)

```java
boolean exists = mem.exists(id);
```

More efficient than `get(id) != null` - no need to read the full record, just check the index.

### Judgment with namespace

```java
boolean exists = mem.exists(id, "user-123");
```

Checks whether the ID exists** and** belongs to the specified namespace.

---

## Retrieve memory (search)

### Simple search

```java
List<MemoryResult> results = mem.search("User development preferences", 5);
```

Parameters:
- `query` — query text
- `topK` — The maximum number of results returned

### Search with filter conditions

```java
List<MemoryResult> results = mem.search("User preferences", 5,
    SearchOptions.builder()
        .namespace("user-123")           // Search only specified namespace
        .filter("type", "preference")    // Only memories with type=preference are returned
        .build());
```

`SearchOptions` supported options:

| Options | Method | Description |
|---|---|---|
| Namespace filtering | `.namespace("xxx")` | Search only the specified namespace, null searches all |
| Metadata exact filtering | `.filter("key", "value")` | Filter by metadata exact match, can be called multiple times (AND semantics) |
| Metadata advanced filtering | `.filter("key", Filter.xxx)` | Use Filter operator to filter, support eq/gt/gte/lt/lte/in/between |
| RRF constant | `.rrfConstant(30)` | Fusion constant in HYBRID mode, default 60 |

### MemoryResult field

| Field | Type | Description |
|---|---|---|
| `id` | `String` | Memory unique identifier |
| `content` | `String` | Memory contents |
| `score` | `float` | Relevance score, the higher the more relevant |
| `metadata` | `Map<String, String>` | Metadata key-value pairs |
| `namespace` | `String` | Namespace |
| `createdAt` | `long` | Creation time (epoch milliseconds) |
| `expireTime` | `long` | Expiration time, 0 means no expiration |

---

## API Quick Check

| Operation | Method | Description |
|---|---|---|
| Deposit | `add(content)` | Simple Deposit |
| Deposit | `add(content, metadata, namespace)` | With metadata and namespace |
| Read | `get(id)` | Get by ID, return `MemoryEntry` |
| Whether it exists | `exists(id)` | Check whether the memory exists |
| Whether it exists | `exists(id, namespace)` | Check whether the memory under the specified namespace exists |
| Search | `search(query, topK)` | Simple search |
| Search | `search(query, topK, options)` | Filtered search |
| Update | `update(id, newContent)` | Update content, automatically recalculate vector |
| UPDATE | `update(id, namespace, newContent)` | UPDATE WITH NAMESPACE GUARD |
| Delete | `delete(id)` | Soft delete |
| Delete | `delete(id, namespace)` | Soft delete with namespace guard |
| Batch deletion | `deleteByNamespace(namespace)` | Delete all memories in the specified namespace |

## Next step

- [Metadata and Namespace ](./metadata-namespace.md) — In-depth understanding of filtering and isolation mechanisms
- [Persistence and Operation ](./persistence.md) — Understand persistence recovery and space reclamation
