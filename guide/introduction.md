# 介绍

## RogueMap 是什么

`RogueMap` 是一个面向 Java 的嵌入式存储引擎。  
它基于内存映射文件（mmap）提供四种数据结构，目标是让你在保持 Java API 易用性的同时，获得更低 GC 压力与可持久化能力。

## 你会得到什么

- 更低堆内存占用，减少 Full GC 风险。
- 可选持久化，进程重启后可恢复数据。
- 高并发读写能力（分段索引 + 乐观读）。
- 统一的 Builder 风格，四种结构学习成本低。

## 四种数据结构

| 结构 | 主要用途 | 常用操作 |
|---|---|---|
| `RogueMap<K, V>` | 键值存储、缓存、状态表 | `put/get/remove` |
| `RogueList<E>` | 顺序数据、日志流 | `addLast/get/removeLast` |
| `RogueSet<E>` | 去重、标签、黑名单 | `add/contains/remove` |
| `RogueQueue<E>` | 任务消费、消息处理 | `offer/poll/peek` |

## 两种存储模式

1. `temporary()`：临时文件模式，适合批处理和中间数据。
2. `persistent(path)`：持久化模式，适合需要重启恢复的数据。

## 使用边界

适合：

- 写多读少或读写均衡场景。
- 数据规模可能超过 JVM 堆限制的场景。
- 希望使用嵌入式方案，避免外部存储依赖的场景。

不适合：

- 极端读密集且追求最低读延迟的纯内存场景。
- 需要分布式一致性与多节点复制的场景。

## 从哪里开始

1. [上手路线（10 分钟）](./quick-start-path.md)
2. [快速开始](./getting-started.md)
3. [配置选项](./configuration.md)
