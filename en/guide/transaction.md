# Transaction support

RogueMap provides transaction support, allowing operations on multiple keys to be atomic - either all succeed or all are rolled back.

## Basic concepts

### Transaction characteristics

| Features | Description |
|-----|------|
| **Atomic** | All writes are atomic during commit() |
| **Isolation Level** | Read Committed — Committed data is read within the transaction |
| **Deadlock Prevention** | Always lock according to segment index in ascending order to prevent deadlock |
| **Multiple writes with the same key** | Supported, subject to the last put |
| **Crash Semantics** | Without WAL, it is recommended to cooperate with `checkpoint()` to reduce the crash loss window after `commit()` |

### Support conditions

::: warning index requirements
Transactions **only support** `SegmentedHashIndex` (the default index for RogueMap).

RogueMap built with `basicIndex()` or `primitiveIndex()` does not support transactions and calling `beginTransaction()` will throw an exception.
:::

```java
// Support ✅ - Use SegmentedHashIndex by default
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();  // Default segmentedIndex

// Support ✅ - Explicitly specify segmentedIndex
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64)
    .build();

// Not supported ❌ - basicIndex
RogueMap<String, Long> map3 = RogueMap.<String, Long>mmap()
    .basicIndex()
    .build();

// Not supported ❌ - primitiveIndex
RogueMap<Long, Long> map4 = RogueMap.<Long, Long>mmap()
    .primitiveIndex()
    .build();
```

## Basic usage

```java
import com.yomahub.roguemap.RogueMapTransaction;
```

### Normal submission

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Open transaction
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);
    txn.remove("charlie");

    txn.commit();  // Atomic commit: three operations take effect at the same time
}
```

### Automatic rollback

If `commit()` is not called, it will automatically roll back on `close()`:

```java
// Automatic rollback example
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 999L);
    txn.put("bob", 888L);

    // Automatic rollback when commit() or close() is not called
    // The values of "alice" and "bob" will not be modified
}
```

### Conditional rollback

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);

    if (someCondition) {
        // Do not call commit(), return directly
        // Automatic rollback when close()
        return;
    }

    txn.commit();  // Submit only if someCondition is false
}
```

### Explicit rollback

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key1", 1L);
    txn.put("key2", 2L);

    if (shouldAbort) {
        txn.rollback();  // explicit rollback
        return;
    }

    txn.commit();
}
```

## Transaction operations

### Supported operations

| Operation | Description |
|-----|------|
| `put(key, value)` | Write key-value pairs |
| `remove(key)` | Delete key-value pair |

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    // write
    txn.put("key1", 100L);
    txn.put("key2", 200L);

    // Delete
    txn.remove("key3");

    txn.commit();
}
```

### Write multiple times with the same Key

If `put()` is used for the same key multiple times within a transaction, the last time shall prevail:

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 1L);
    txn.put("key", 2L);
    txn.put("key", 3L);  // final value

    txn.commit();
    // The value of "key" is 3L
}
```

### Delete after writing

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.remove("key");  // Delete the value just written

    txn.commit();
    // "key" does not exist (deleted)
}
```

## Isolation level

RogueMap transactions use the **Read Committed** isolation level:

### Features

- What is read in the transaction is **committed** data
- "Read own uncommitted writes" is not supported
- Writes within a transaction are only visible to other threads after `commit()`

### Example

```java
// Initial state: map is empty
RogueMap<String, Long> map = ...;

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);

    // Read within transaction
    Long value = map.get("key");  // null (cannot read own uncommitted writes)

    txn.commit();
}

// After commit
Long value = map.get("key");  // 100L (can be read now)
```

::: tip note
If you need to read the value you wrote within the transaction, please cache it yourself at the application layer:
:::

```java
Map<String, Long> localCache = new HashMap<>();

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    localCache.put("key", 100L);  // local cache

    // Read from local cache
    Long value = localCache.get("key");  // 100L

    txn.commit();
}
```

## Deadlock prevention

RogueMap prevents deadlocks by locking in order:

### Mechanism

- All keys are assigned to different segments based on hash values
- When transaction commit, lock according to segment index **ascending order**
- The locking sequence is fixed, and no loop waiting will occur, thereby eliminating deadlock.

### Example

```java
// Thread 1
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("a", 1L);  // segment 5
    txn.put("b", 2L);  // segment 3
    txn.put("c", 3L);  // segment 7
    txn.commit();
    // Actual locking sequence: segment 3 → 5 → 7 (ascending order)
}

// Thread 2 (concurrent execution)
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("c", 3L);  // segment 7
    txn.put("a", 1L);  // segment 5
    txn.commit();
    // Actual locking order: segment 5 → 7 (ascending order)
}
// There will be no deadlock because the locking order of the two threads is the same.
```

## Complete example

### Bank transfer

```java
public class BankService {
    private final RogueMap<String, Long> accounts;

    public BankService() {
        this.accounts = RogueMap.<String, Long>mmap()
            .persistent("data/accounts.db")
            .keyCodec(StringCodec.INSTANCE)
            .valueCodec(PrimitiveCodecs.LONG)
            .build();
    }

    /**
     * Transfer operation (atomicity)
     * @param from transfer account
     * @param to transfer account
     * @param amount amount
     * @return whether successful
     */
    public boolean transfer(String from, String to, long amount) {
        try (RogueMapTransaction<String, Long> txn = accounts.beginTransaction()) {
            // Read current balance
            Long fromBalance = accounts.get(from);
            Long toBalance = accounts.get(to);

            // Check if balance is sufficient
            if (fromBalance == null || fromBalance < amount) {
                return false;  // Insufficient balance, automatic rollback
            }

            // Execute transfer
            txn.put(from, fromBalance - amount);
            txn.put(to, (toBalance == null ? 0 : toBalance) + amount);

            txn.commit();  // Atomic commit
            return true;
        }
        // If an exception occurs, automatically roll back
    }
}
```

### Inventory deductions

```java
public class InventoryService {
    private final RogueMap<String, Long> inventory;

    public boolean deductStock(String productId, long quantity) {
        try (RogueMapTransaction<String, Long> txn = inventory.beginTransaction()) {
            Long currentStock = inventory.get(productId);

            if (currentStock == null || currentStock < quantity) {
                return false;  // Insufficient stock
            }

            txn.put(productId, currentStock - quantity);
            txn.commit();
            return true;
        }
    }

    public boolean deductMultiple(Map<String, Long> items) {
        try (RogueMapTransaction<String, Long> txn = inventory.beginTransaction()) {
            // Check all items in stock
            for (Map.Entry<String, Long> entry : items.entrySet()) {
                Long stock = inventory.get(entry.getKey());
                if (stock == null || stock < entry.getValue()) {
                    return false;  // Any item is out of stock
                }
            }

            // Bulk deductions
            for (Map.Entry<String, Long> entry : items.entrySet()) {
                Long stock = inventory.get(entry.getKey());
                txn.put(entry.getKey(), stock - entry.getValue());
            }

            txn.commit();
            return true;
        }
    }
}
```

### Order creation

```java
public class OrderService {
    private final RogueMap<String, String> orders;
    private final RogueMap<String, Long> orderStatus;

    public String createOrder(String orderId, String userId, List<String> productIds) {
        try (RogueMapTransaction<String, String> orderTxn = orders.beginTransaction()) {
            // Create order
            String orderData = encodeOrder(userId, productIds);
            orderTxn.put(orderId, orderData);

            // Update order status
            try (RogueMapTransaction<String, Long> statusTxn = orderStatus.beginTransaction()) {
                statusTxn.put(orderId, 0L);  // Status 0: Pending payment

                // Two transactions are submitted separately
                statusTxn.commit();
            }

            orderTxn.commit();
        }

        return orderId;
    }
}
```

## Best Practices

### 1. Use try-with-resources

```java
// Recommended ✅
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}

// Not recommended ❌
RogueMapTransaction<String, Long> txn = map.beginTransaction();
try {
    txn.put("key", 100L);
    txn.commit();
} finally {
    txn.close();
}
```

### 2. Avoid time-consuming operations within transactions

```java
// Not recommended ❌
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);

    Thread.sleep(5000);  // Time-consuming operation, holding the lock for too long

    txn.commit();
}

// Recommended ✅
// Prepare the data first, then start the transaction
Thread.sleep(5000);
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}
```

### 3. Set transaction boundaries reasonably

```java
// Not recommended ❌ - Transaction scope is too large
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    for (int i = 0; i < 100000; i++) {
        txn.put("key" + i, (long) i);
    }
    txn.commit();
}

// Recommended ✅ - Submit in batches
for (int batch = 0; batch < 100; batch++) {
    try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
        for (int i = 0; i < 1000; i++) {
            int key = batch * 1000 + i;
            txn.put("key" + key, (long) key);
        }
        txn.commit();
    }
}
```

### 4. Call checkpoint after commit

If you need to ensure recovery after a crash, call checkpoint after commit:

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}
map.checkpoint();  // Force persistent indexes to ensure crash recovery
```

## Notes

1. **Index limitation** - only supports SegmentedHashIndex (default index)
2. **Isolation Level** - Read Committed, does not support reading your own uncommitted
3. **Transaction Scope** - Single RogueMap instance, cross-instance transactions are not supported
4. **Crash Semantics** - Transaction atomicity does not mean that it will be persistent after a crash. Please call `checkpoint()` after `commit()` on the critical path.
5. **Deadlock Prevention** - Handled internally, no need to worry
6. **Resource Management** - Be sure to use try-with-resources

## Next step

- [Automatic checkpoint ](./auto-checkpoint.md) — checkpoint detailed explanation
- [Monitoring indicator ](./monitoring.md) — Monitoring and maintenance
- [Persistence ](./persistence.md) — Data persistence mechanism
- [BEST PRACTICE](./best-practices.md) — More usage suggestions
