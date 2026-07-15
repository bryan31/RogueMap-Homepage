# codec

Codecs are responsible for serializing Java objects into byte arrays and deserializing byte arrays into Java objects. RogueMap provides a variety of built-in codecs and supports custom codecs.

## Built-in codec

### PrimitiveCodecs (primitive types)

RogueMap provides zero-copy, high-performance codecs for all Java primitive types.

#### Supported types

```java
// Long type
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Integer type
RogueMap<Integer, Integer> intMap = RogueMap.<Integer, Integer>mmap().temporary()
    .keyCodec(PrimitiveCodecs.INTEGER)
    .valueCodec(PrimitiveCodecs.INTEGER)
    .build();

// Double type
RogueMap<Double, Double> doubleMap = RogueMap.<Double, Double>mmap().temporary()
    .keyCodec(PrimitiveCodecs.DOUBLE)
    .valueCodec(PrimitiveCodecs.DOUBLE)
    .build();

// Float type
RogueMap<Float, Float> floatMap = RogueMap.<Float, Float>mmap().temporary()
    .keyCodec(PrimitiveCodecs.FLOAT)
    .valueCodec(PrimitiveCodecs.FLOAT)
    .build();

// Short type
RogueMap<Short, Short> shortMap = RogueMap.<Short, Short>mmap().temporary()
    .keyCodec(PrimitiveCodecs.SHORT)
    .valueCodec(PrimitiveCodecs.SHORT)
    .build();

// Byte type
RogueMap<Byte, Byte> byteMap = RogueMap.<Byte, Byte>mmap().temporary()
    .keyCodec(PrimitiveCodecs.BYTE)
    .valueCodec(PrimitiveCodecs.BYTE)
    .build();

// Boolean type
RogueMap<Boolean, Boolean> boolMap = RogueMap.<Boolean, Boolean>mmap().temporary()
    .keyCodec(PrimitiveCodecs.BOOLEAN)
    .valueCodec(PrimitiveCodecs.BOOLEAN)
    .build();
```

#### Performance features

- ✅ **Zero Copy** - Direct memory layout, no serialization overhead
- ✅ **Fixed Length** - Fixed serialization length, predictable performance
- ✅ **EXTREME PERFORMANCE** - FASTEST CODEC

#### Memory usage

| type | number of bytes |
|-----|--------|
| Long | 8 |
| Integer | 4 |
| Double | 8 |
| Float | 4 |
| Short | 2 |
| Byte | 1 |
| Boolean | 1 |

### StringCodec (string)

StringCodec is used to serialize and deserialize strings, using UTF-8 encoding.

```java
RogueMap<String, String> stringMap = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
```

#### Features

- ✅ UTF-8 encoding
- ✅Variable length serialization
- ✅ null safe

#### Performance

- Serialization: ~1 million ops/s
- Deserialization: about 800,000 ops/s

### KryoObjectCodec(object)

KryoObjectCodec uses the Kryo library to serialize complex objects.

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

::: warning dependency requirements
Need to add Kryo dependency:
```xml
<dependency>
    <groupId>com.esotericsoftware</groupId>
    <artifactId>kryo</artifactId>
    <version>5.6.2</version>
</dependency>
```
:::

#### Features

- ✅Support complex objects
- ✅ High performance serialization
- ⚠️ Requires additional dependencies
- ⚠️ Not as good as original type

### TypeReference (generic type reserved)

Java's type erasure causes Kryo to fail to deserialize correctly when the value type contains complex generics (such as `List<User>`, `Map<String, List<Data>>`). `TypeReference` Preserve full generic information at runtime via anonymous subclassing.

#### Basic usage

```java
import com.yomahub.roguemap.serialization.TypeReference;
import com.yomahub.roguemap.serialization.KryoObjectCodec;

// Preserve generic information for List<User>
TypeReference<List<User>> typeRef = new TypeReference<List<User>>() {};

RogueMap<String, List<User>> map = RogueMap.<String, List<User>>mmap()
    .temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(new KryoObjectCodec<>(typeRef))
    .build();
```

#### Nested generics

```java
// Nested generics also work
TypeReference<Map<String, List<Integer>>> typeRef =
    new TypeReference<Map<String, List<Integer>>>() {};
Codec<Map<String, List<Integer>>> codec = new KryoObjectCodec<>(typeRef);
```

::: tip When to Need TypeReference
If the value type does not contain generics (such as a separate `User` class), just use `KryoObjectCodec.create(User.class)` directly, without TypeReference. TypeReference is only required when the value type itself contains generic parameters.
:::

## Mixed use

Keys and values can use different codecs:

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

## Custom codec

You can implement the `Codec` interface to create custom codecs.

### Codec interface

```java
public interface Codec<T> {
    /**
     * Serialize object as byte array
     */
    byte[] encode(T value);

    /**
     * Deserialize object from byte array
     */
    T decode(byte[] bytes);
}
```

### Example: JSON codec

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

### Use custom codecs

```java
RogueMap<String, User> map = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(JsonCodec.create(User.class))
    .build();

map.put("user1", new User("Alice", 25));
User user = map.get("user1");
```

## Codec Selection Guide

### Decision tree

```
What type needs to be serialized?
  ├─ Primitive types (Long, Integer, etc.)
  │   └─ Use PrimitiveCodecs ✅ (fastest)
  ├─ String
  │ └─ Using StringCodec ✅
  ├─ Complex objects
  │ ├─ Need cross-language?
  │ │ └─ Using JsonCodec ✅
  │ └─ Only for Java internal use?
  │       ├─ Has generic parameters (such as List<User>)?
  │       │   └─ Use KryoObjectCodec + TypeReference ✅
  │ └─ No generics?
  │           └─ Use KryoObjectCodec.create(Class) ✅ (faster)
  └─ Special needs
      └─ Custom Codec ✅
```

### Performance comparison

| Codec | Serialization speed | Deserialization speed | Volume |
|---------|-----------|------------|------|
| PrimitiveCodecs | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| StringCodec | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| KryoObjectCodec | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| JsonCodec | ⭐⭐ | ⭐⭐ | ⭐⭐ |

## Best Practices

### 1. Use primitive types first

```java
// Good practice ✅
RogueMap<Long, Long> idMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

// Avoid ❌
RogueMap<String, String> idMap = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();
// Long -> String conversion will have a performance penalty
```

### 2. Kryo is preferred for object serialization.

```java
// Good Practice ✅ (Faster)
RogueMap<String, User> userMap = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(KryoObjectCodec.create(User.class))
    .build();

// Optional solutions (cross-language scenarios)
RogueMap<String, User> userMap = RogueMap.<String, User>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(JsonCodec.create(User.class))
    .build();
```

### 3. Keep codecs consistent during persistence

```java
// Write data
RogueMap<String, Long> map1 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();
map1.put("key", 100L);
map1.close();

// Read data - the same codecs are required ✅
RogueMap<String, Long> map2 = RogueMap.<String, Long>mmap()
    .persistent("data.db")
    .keyCodec(StringCodec.INSTANCE) // Same
    .valueCodec(PrimitiveCodecs.LONG) // Same
    .build();
Long value = map2.get("key"); // Correct
```

### 4. Pay attention to null value handling

```java
// StringCodec supports null
RogueMap<String, String> map = RogueMap.<String, String>mmap().temporary()
    .keyCodec(StringCodec.INSTANCE)
    .valueCodec(StringCodec.INSTANCE)
    .build();

map.put("key", null); // OK
String value = map.get("key"); // null

// PrimitiveCodecs do not support null (primitive types)
RogueMap<Long, Long> longMap = RogueMap.<Long, Long>mmap().temporary()
    .keyCodec(PrimitiveCodecs.LONG)
    .valueCodec(PrimitiveCodecs.LONG)
    .build();

longMap.put(1L, null); // NullPointerException
```

## Notes

### 1. Codecs must be thread-safe

Custom codecs must be thread-safe:

```java
// Good practice ✅
public class SafeCodec<T> implements Codec<T> {
    // Use thread-safe ObjectMapper
    private final ObjectMapper mapper = new ObjectMapper();
    // ...
}

// Bad practice ❌
public class UnsafeCodec<T> implements Codec<T> {
    // Non-thread-safe state
    private byte[] buffer;
    // ...
}
```

### 2. Performance considerations

- Raw type codecs for optimal performance
- Object serialization has a large overhead
- Avoid unnecessary object creation

### 3. Version compatibility

- Ensure backward compatibility of serialization formats
- Pay attention to data migration when upgrading codecs

## Next step

- [Memory Management ](./memory-management.md) — Understand the memory allocation mechanism
- [Configuration option ](./configuration.md) — Detailed configuration instructions
- [BEST PRACTICE ](./best-practices.md) — Usage Recommendations
