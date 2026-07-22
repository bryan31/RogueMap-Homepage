# AI Skill：How2useRogueMap

**How2useRogueMap** 是一个帮助 AI 正确使用 **RogueMap（v1.1.7）** 的 Agent Skill。它内置了经过源码核验的 RogueMap 堆外集合、持久化运维和 RogueMemory 混合检索知识，并规定了严格的托底流程：**不编造 API、默认值或持久性保证**。

如果你在使用 Cursor、Claude Code、Codex、Kimi Code 等 AI 编程助手开发基于 RogueMap 的应用，安装这个 Skill 后，AI 给出的 API 用法和配置建议将以官方源码为准，而不是凭训练记忆猜测。

## 安装

通过 [`skills` CLI](https://github.com/vercel-labs/skills) 一键安装：

```bash
npx skills add bryan31/How2useRogueMap
```

可选参数：

```bash
# 全局安装、指定 Codex、跳过确认
npx skills add bryan31/How2useRogueMap@how2useroguemap -g -a codex -y
```

安装时会把整个 Skill 目录复制到 Agent 的配置目录，其中包括 `references/`、`scripts/` 和 `assets/`，无需额外配置。

::: tip 注意
这个命令安装的是 AI Skill，而不是 RogueMap Java 库。在 Java 项目中使用 RogueMap 时，仍需添加对应的 `com.yomahub` Maven 依赖。
:::

## 工作原理

安装 Skill 后，直接用自然语言询问 RogueMap 问题即可。它采用分层策略：

1. **蒸馏知识**——内置速查内容和分主题参考文档，覆盖核心集合、Codec、索引、事务、TTL、持久化、恢复、压缩、RogueMemory、Embedding 和故障排查，常见问题无需联网。
2. **源码托底**——遇到内置知识未覆盖的实现细节时，优先查找本地 RogueMap 源码；征得你的同意后，也可以按已核验的源码基线克隆官方仓库，并给出精确源码引用。
3. **绝不杜撰**——如果参考文档和匹配版本的源码都无法确认，Skill 会明确说明，而不是猜测。

## 触发方式

当你提到 RogueMap、RogueList、RogueSet、RogueQueue、RogueMemory、`UniversalEmbeddingProvider`，以及相关安装、持久化、检索、容量规划或故障排查问题时，Skill 会自动启用。

## 版本范围

- RogueMap：**1.1.7**
- Java：**8+**
- 源码核验基线：`e78b7f9b1825e35910119284d6299aab5265c039`

询问其他版本时，Skill 会重新核对对应源码，不会直接套用 1.1.7 的实现结论。

## 仓库地址

- [GitHub：bryan31/How2useRogueMap](https://github.com/bryan31/How2useRogueMap)

## 仓库结构

```text
skills/how2useroguemap/
├── SKILL.md          # 决策流程、高频速查和知识路由
├── references/       # 按主题拆分的详细参考文档
├── scripts/          # 本地优先的源码定位与受控克隆工具
└── assets/           # 预留的可复用 Skill 资源
```
