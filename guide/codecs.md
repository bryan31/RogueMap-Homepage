# 编解码器

编解码器（Codec）负责将 Java 对象序列化为字节数组，以及从字节数组反序列化为 Java 对象。RogueMap 提供了多种内置编解码器，并支持自定义编解码器。

## 内置编解码器

### PrimitiveCodecs（原始类型）

RogueMap 为所有 Java 原始类型提供了零拷贝的高性能编解码器。

#### 支持的类型

```java
// Long 类型
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Integer 类型
RogueMap<Integer, Integer> intMap = RogueMap.<Integer, Integer>mmap().temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .build();

// Double 类型
RogueMap<Double, Double> doubleMap = RogueMap.<Double, Double>mmap().temporary()
    .keyCodec(PrimitiveCodecs.DOUBLE)
    .valueCodec(PrimitiveCodecs.DOUBLE)
    .build();

// Float 类型
RogueMap<Float, Float> floatMap = RogueMap.<Float, Float>mmap().temporary()
    .keyCodec(PrimitiveCodecs.FLOAT)
    .valueCodec(PrimitiveCodecs.FLOAT)
    .build();

// Short 类型
RogueMap<Short, Short> shortMap = RogueMap.<Short, Short>mmap().temporary()
    .keyCodec(PrimitiveCodecs.SHORT)
    .valueCodec(PrimitiveCodecs.SHORT)
    .build();

// Byte 类型
RogueMap<Byte, Byte> byteMap = RogueMap.<Byte, Byte>mmap().temporary()
    .keyCodec(PrimitiveCodecs.BYTE)
    .valueCodec(PrimitiveCodecs.BYTE)
    .build();

// Boolean 类型
RogueMap<Boolean, Boolean> boolMap = RogueMap.<Boolean, Boolean>mmap().temporary()
    .keyCodec(PrimitiveCodecs.BOOLEAN)
    .valueCodec(PrimitiveCodecs.BOOLEAN)
    .build();
```

#### 性能特点

- ✅ **零拷贝** - 直接内存布局，无序列化开销
- ✅ **固定长度** - 序列化长度固定，性能可预测
- ✅ **极致性能** - 最快的编解码器

#### 内存占用

| 类型 | 字节数 |
|-----|--------|
| Long | 8 |
| Integer | 4 |
| Double | 8 |
| Float | 4 |
| Short | 2 |
| Byte | 1 |
| Boolean | 1 |

### StringCodec（字符串）

StringCodec 用于序列化和反序列化字符串，使用 UTF-8 编码。

```java
RogueMap<String, String> stringMap = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

#### 特点

- ✅ UTF-8 编码
- ✅ 变长序列化
- ✅ null 安全

#### 性能

- 序列化：约 100 万 ops/s
- 反序列化：约 80 万 ops/s

### KryoObjectCodec（对象）

KryoObjectCodec 使用 Kryo 库序列化复杂对象。

```java
import com.yomahub.roguemap.serialization.KryoObjectCodec;

public class User {
    private String name;
    private int age;
    // getters and setters
}

RogueMap<String, User> userMap = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
```

::: warning 依赖要求
需要添加 Kryo 依赖：
```xml
<dependency>
    <groupId>com.esotericsoftware</groupId>
    <artifactId>kryo</artifactId>
    <version>5.6.2</version>
</dependency>
```
:::

#### 特点

- ✅ 支持复杂对象
- ✅ 高性能序列化
- ⚠️ 需要额外依赖
- ⚠️ 性能不如原始类型

## 混合使用

键和值可以使用不同的编解码器：

```java
// String -> Long
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Long -> String
RogueMap<Long, String> map2 = RogueMap.<Long, String>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(StringCodec.INSTANCE)
    .build();

// String -> User
RogueMap<String, User> map3 = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();
```

## 自定义编解码器

你可以实现 `Codec` 接口来创建自定义编解码器。

### Codec 接口

```java
public interface Codec<T> {
    /**
     * 序列化对象为字节数组
     */
    byte[] encode(T value);

    /**
     * 从字节数组反序列化对象
     */
    T decode(byte[] bytes);
}
```

### 示例：JSON 编解码器

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yomahub.roguemap.serialization.Codec;

public class JsonCodec<T> implements Codec<T> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Class<T> type;

    public JsonCodec(Class<T> type) {
        this.type = type;
    }

    @Override
    public byte[] encode(T value) {
        try {
            return mapper.writeValueAsBytes(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encode", e);
        }
    }

    @Override
    public T decode(byte[] bytes) {
        try {
            return mapper.readValue(bytes, type);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decode", e);
        }
    }

    public static <T> JsonCodec<T> create(Class<T> type) {
        return new JsonCodec<>(type);
    }
}
```

### 使用自定义编解码器

```java
RogueMap<String, User> map = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(JsonCodec.create(User.class))
    .build();

map.put("user1", new User("Alice", 25));
User user = map.get("user1");
```

## 编解码器选择指南

### 决策树

```
需要序列化什么类型？
  ├─ 原始类型（Long, Integer, etc.）
  │   └─ 使用 PrimitiveCodecs ✅（最快）
  ├─ String
  │   └─ 使用 StringCodec ✅
  ├─ 复杂对象
  │   ├─ 需要跨语言？
  │   │   └─ 使用 JsonCodec ✅
  │   └─ 仅 Java 内部使用？
  │       └─ 使用 KryoObjectCodec ✅（更快）
  └─ 特殊需求
      └─ 自定义 Codec ✅
```

### 性能对比

| 编解码器 | 序列化速度 | 反序列化速度 | 体积 |
|---------|-----------|------------|------|
| PrimitiveCodecs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| StringCodec | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| KryoObjectCodec | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| JsonCodec | ⭐⭐ | ⭐⭐ | ⭐⭐ |

## 最佳实践

### 1. 优先使用原始类型

```java
// 好的做法 ✅
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// 避免 ❌
RogueMap<String, String> idMap = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
// Long -> String 转换会有性能损失
```

### 2. 对象序列化优先使用 Kryo

```java
// 好的做法 ✅（更快）
RogueMap<String, User> userMap = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();

// 可选方案（跨语言场景）
RogueMap<String, User> userMap = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(JsonCodec.create(User.class))
    .build();
```

### 3. 持久化时保持编解码器一致

```java
// 写入数据
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.put("key", 100L);
map1.close();

// 读取数据 - 必须使用相同的编解码器 ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // 相同
    .valueCodec(PrimitiveCodecs.LONG) // 相同
    .build();
Long value = map2.get("key"); // 正确
```

### 4. 注意 null 值处理

```java
// StringCodec 支持 null
RogueMap<String, String> map = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

map.put("key", null); // OK
String value = map.get("key"); // null

// PrimitiveCodecs 不支持 null（原始类型）
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

longMap.put(1L, null); // NullPointerException
```

## 注意事项

### 1. 编解码器必须线程安全

自定义编解码器必须是线程安全的：

```java
// 好的做法 ✅
public class SafeCodec<T> implements Codec<T> {
    // 使用线程安全的 ObjectMapper
    private final ObjectMapper mapper = new ObjectMapper();
    // ...
}

// 不好的做法 ❌
public class UnsafeCodec<T> implements Codec<T> {
    // 非线程安全的状态
    private byte[] buffer;
    // ...
}
```

### 2. 性能考虑

- 原始类型编解码器性能最优
- 对象序列化有较大开销
- 避免不必要的对象创建

### 3. 版本兼容性

- 确保序列化格式的向后兼容性
- 升级编解码器时注意数据迁移

## 下一步

- [内存管理](./memory-management.md) - 了解内存分配机制
- [配置选项](./configuration.md) - 详细配置说明
- [最佳实践](./best-practices.md) - 使用建议
