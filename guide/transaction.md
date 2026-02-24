# 事务支持

RogueMap 提供事务支持，允许对多个 key 的操作保证原子性——要么全部成功，要么全部回滚。

## 基本概念

### 事务特性

| 特性 | 说明 |
|-----|------|
| **原子性** | commit() 时所有写入原子生效 |
| **隔离级别** | Read Committed — 事务内读取的是已提交数据 |
| **死锁预防** | 始终按 segment index 升序加锁，杜绝死锁 |
| **同 key 多次写入** | 支持，以最后一次 put 为准 |
| **崩溃语义** | 无 WAL，`commit()` 后建议配合 `checkpoint()` 降低崩溃丢失窗口 |

### 支持条件

::: warning 索引要求
事务**仅支持** `SegmentedHashIndex`（RogueMap 的默认索引）。

使用 `basicIndex()` 或 `primitiveIndex()` 构建的 RogueMap **不支持**事务，调用 `beginTransaction()` 会抛出异常。
:::

```java
// 支持 ✅ - 默认使用 SegmentedHashIndex
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();  // 默认 segmentedIndex

// 支持 ✅ - 显式指定 segmentedIndex
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .segmentedIndex(64)
    .build();

// 不支持 ❌ - basicIndex
RogueMap<String, Long> map3 = RogueMap.<String, Long>mmap()
    .basicIndex()
    .build();

// 不支持 ❌ - primitiveIndex
RogueMap<Long, Long> map4 = RogueMap.<Long, Long>mmap()
    .primitiveIndex()
    .build();
```

## 基本用法

```java
import com.yomahub.roguemap.RogueMapTransaction;
```

### 正常提交

```java
RogueMap<String, Long> map = RogueMap.<String, Long>mmap()
    .persistent("data/scores.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 开启事务
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);
    txn.remove("charlie");

    txn.commit();  // 原子提交：三个操作同时生效
}
```

### 自动回滚

如果未调用 `commit()`，在 `close()` 时会自动回滚：

```java
// 自动回滚示例
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 999L);
    txn.put("bob", 888L);

    // 未调用 commit()，close() 时自动回滚
    // "alice" 和 "bob" 的值不会被修改
}
```

### 条件回滚

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("alice", 100L);
    txn.put("bob", 200L);

    if (someCondition) {
        // 不调用 commit()，直接返回
        // close() 时自动回滚
        return;
    }

    txn.commit();  // 只有 someCondition 为 false 时才提交
}
```

### 显式回滚

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key1", 1L);
    txn.put("key2", 2L);

    if (shouldAbort) {
        txn.rollback();  // 显式回滚
        return;
    }

    txn.commit();
}
```

## 事务操作

### 支持的操作

| 操作 | 说明 |
|-----|------|
| `put(key, value)` | 写入键值对 |
| `remove(key)` | 删除键值对 |

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    // 写入
    txn.put("key1", 100L);
    txn.put("key2", 200L);

    // 删除
    txn.remove("key3");

    txn.commit();
}
```

### 同 Key 多次写入

事务内对同一个 key 多次 `put()`，以最后一次为准：

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 1L);
    txn.put("key", 2L);
    txn.put("key", 3L);  // 最终值

    txn.commit();
    // "key" 的值为 3L
}
```

### 写入后删除

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.remove("key");  // 删除刚写入的值

    txn.commit();
    // "key" 不存在（被删除）
}
```

## 隔离级别

RogueMap 事务采用 **Read Committed** 隔离级别：

### 特点

- 事务内读取的是**已提交**的数据
- 不支持"读自己的未提交写入"
- 事务内的写入只有在 `commit()` 后才对其他线程可见

### 示例

```java
// 初始状态：map 为空
RogueMap<String, Long> map = ...;

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);

    // 事务内读取
    Long value = map.get("key");  // null（读不到自己的未提交写入）

    txn.commit();
}

// commit 后
Long value = map.get("key");  // 100L（现在可以读到）
```

::: tip 注意
如果需要在事务内读取自己写入的值，请在应用层自行缓存：
:::

```java
Map<String, Long> localCache = new HashMap<>();

try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    localCache.put("key", 100L);  // 本地缓存

    // 从本地缓存读取
    Long value = localCache.get("key");  // 100L

    txn.commit();
}
```

## 死锁预防

RogueMap 通过**按顺序加锁**来预防死锁：

### 机制

- 所有 key 根据 hash 值分配到不同的 segment
- 事务 commit 时，按 segment index **升序**加锁
- 加锁顺序固定，不会产生循环等待，从而杜绝死锁

### 示例

```java
// 线程 1
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("a", 1L);  // segment 5
    txn.put("b", 2L);  // segment 3
    txn.put("c", 3L);  // segment 7
    txn.commit();
    // 实际加锁顺序：segment 3 → 5 → 7（升序）
}

// 线程 2（并发执行）
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("c", 3L);  // segment 7
    txn.put("a", 1L);  // segment 5
    txn.commit();
    // 实际加锁顺序：segment 5 → 7（升序）
}
// 不会死锁，因为两个线程的加锁顺序一致
```

## 完整示例

### 银行转账

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
     * 转账操作（原子性）
     * @param from 转出账户
     * @param to 转入账户
     * @param amount 金额
     * @return 是否成功
     */
    public boolean transfer(String from, String to, long amount) {
        try (RogueMapTransaction<String, Long> txn = accounts.beginTransaction()) {
            // 读取当前余额
            Long fromBalance = accounts.get(from);
            Long toBalance = accounts.get(to);

            // 检查余额是否充足
            if (fromBalance == null || fromBalance < amount) {
                return false;  // 余额不足，自动回滚
            }

            // 执行转账
            txn.put(from, fromBalance - amount);
            txn.put(to, (toBalance == null ? 0 : toBalance) + amount);

            txn.commit();  // 原子提交
            return true;
        }
        // 如果发生异常，自动回滚
    }
}
```

### 库存扣减

```java
public class InventoryService {
    private final RogueMap<String, Long> inventory;

    public boolean deductStock(String productId, long quantity) {
        try (RogueMapTransaction<String, Long> txn = inventory.beginTransaction()) {
            Long currentStock = inventory.get(productId);

            if (currentStock == null || currentStock < quantity) {
                return false;  // 库存不足
            }

            txn.put(productId, currentStock - quantity);
            txn.commit();
            return true;
        }
    }

    public boolean deductMultiple(Map<String, Long> items) {
        try (RogueMapTransaction<String, Long> txn = inventory.beginTransaction()) {
            // 检查所有商品库存
            for (Map.Entry<String, Long> entry : items.entrySet()) {
                Long stock = inventory.get(entry.getKey());
                if (stock == null || stock < entry.getValue()) {
                    return false;  // 任一商品库存不足
                }
            }

            // 批量扣减
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

### 订单创建

```java
public class OrderService {
    private final RogueMap<String, String> orders;
    private final RogueMap<String, Long> orderStatus;

    public String createOrder(String orderId, String userId, List<String> productIds) {
        try (RogueMapTransaction<String, String> orderTxn = orders.beginTransaction()) {
            // 创建订单
            String orderData = encodeOrder(userId, productIds);
            orderTxn.put(orderId, orderData);

            // 更新订单状态
            try (RogueMapTransaction<String, Long> statusTxn = orderStatus.beginTransaction()) {
                statusTxn.put(orderId, 0L);  // 状态 0：待支付

                // 两个事务分别提交
                statusTxn.commit();
            }

            orderTxn.commit();
        }

        return orderId;
    }
}
```

## 最佳实践

### 1. 使用 try-with-resources

```java
// 推荐 ✅
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}

// 不推荐 ❌
RogueMapTransaction<String, Long> txn = map.beginTransaction();
try {
    txn.put("key", 100L);
    txn.commit();
} finally {
    txn.close();
}
```

### 2. 事务内避免耗时操作

```java
// 不推荐 ❌
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);

    Thread.sleep(5000);  // 耗时操作，持有锁时间过长

    txn.commit();
}

// 推荐 ✅
// 先准备好数据，再开启事务
Thread.sleep(5000);
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}
```

### 3. 合理设置事务边界

```java
// 不推荐 ❌ - 事务范围过大
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    for (int i = 0; i < 100000; i++) {
        txn.put("key" + i, (long) i);
    }
    txn.commit();
}

// 推荐 ✅ - 分批提交
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

### 4. commit 后调用 checkpoint

如果需要确保崩溃后也能恢复，在 commit 后调用 checkpoint：

```java
try (RogueMapTransaction<String, Long> txn = map.beginTransaction()) {
    txn.put("key", 100L);
    txn.commit();
}
map.checkpoint();  // 强制持久化索引，确保崩溃恢复
```

## 注意事项

1. **索引限制** - 仅支持 SegmentedHashIndex（默认索引）
2. **隔离级别** - Read Committed，不支持读自己的未提交
3. **事务范围** - 单个 RogueMap 实例，不支持跨实例事务
4. **崩溃语义** - 事务原子性不等于崩溃后必然持久化，关键路径请在 `commit()` 后调用 `checkpoint()`
5. **死锁预防** - 内部已处理，无需担心
6. **资源管理** - 务必使用 try-with-resources

## 下一步

- [运维指南](./operations.md) - checkpoint 和监控
- [持久化](./persistence.md) - 数据持久化机制
- [最佳实践](./best-practices.md) - 更多使用建议
