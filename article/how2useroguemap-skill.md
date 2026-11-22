# 不用看文档，让 AI 帮你用好 RogueMap：How2useRogueMap Skill 发布

> 给 AI 编程助手装一个经过源码核验的 RogueMap 知识包。写 RogueMap 的代码、问 RogueMap 的用法，AI 都不再靠猜。

---

## 先说痛点

我用 Cursor、Claude Code 这类 AI 助手写代码已经很长时间了，效率确实高。但只要话题一转到 RogueMap，情况就不太对劲。

RogueMap 是个比较新的开源项目，AI 的训练语料里几乎没有它的内容。你问它「RogueMap 的持久化怎么配」「RogueMemory 的混合检索怎么调」，它不会老实说自己不知道，而是会一本正经地编：

- 编一个根本不存在的方法名，比如 `RogueMap.builder()`；
- 信誓旦旦地告诉你一个错误的配置默认值；
- 描述一套它想象出来的持久性保证。

这些答案看着都像模像样，一跑就报错。更麻烦的是不报错的那种——行为和你预期的完全不一样，等问题暴露往往已经上线了。

## How2useRogueMap 是干什么的

How2useRogueMap 是一个 Agent Skill，说白了就是一个「给 AI 看的 RogueMap 知识包」。里面的内容不是从博客和搜索摘要里抄的，而是照着 RogueMap 1.1.7 的源码一条条核验过的，覆盖堆外集合、Codec、索引、事务、TTL、持久化、崩溃恢复、RogueMemory 混合检索、Embedding 这些主题。

装上之后，不管是让 AI 直接写 RogueMap 相关的代码，还是问它用法、让它排查报错，依据都是源码，不是训练记忆。你不用翻文档，也不用先花时间去学一遍 API——把需求直接丢给 AI 就行。

## 它凭什么「不胡说」

Skill 里写死了三条规则：

1. **内置知识优先**。配置、API 用法、容量规划这类常见问题，直接从自带的参考文档里答，不用联网。
2. **源码托底**。内置知识没覆盖到的实现细节，先找你本地的 RogueMap 源码；本地没有的话，征得你同意后按核验过的 commit 克隆官方仓库，回答时附上具体的源码位置。
3. **答不上来就明说**。参考文档和匹配版本的源码都确认不了的问题，Skill 会直接告诉你「无法确认」，而不是猜一个答案。

另外，Skill 里还放了一张「幻觉对照表」，把 AI 最容易编错的写法一一列了出来，比如把 `mem.search()` 编成 `mem.hybridSearch()`、把 `RogueMapTransaction` 编成 `RogueMap.Transaction`。AI 看到这类问题时会主动纠正，而不是顺着错误写法往下编。

## 装完不是静态副本：Skill 会自检新版本

这类知识包有个常见问题：装完就是一个静态副本，作者之后更新了，你感知不到，用旧知识答新问题的情况迟早会出现。How2useRogueMap 内置了版本自检机制：

- 每次会话里 Skill 第一次被触发时，会先跑一遍 `scripts/version-check.sh`，拿本地的 `version` 字段和远端发布的 SKILL.md 比一比；
- 发现远端有新版，会告诉你本地和远端的版本号，征得同意后执行 `npx skills update` 完成更新；
- 检查只读取远端文件的一个字段，不执行远端任何代码；结果按天缓存，断网、超时也会静默跳过，不影响正常使用。

想手动更新也可以：

```bash
npx skills update how2useroguemap -g -y   # 全局安装
npx skills update how2useroguemap -p -y   # 项目安装
```

如果你担心「提示了但自己会忘」，还可以把检查脚本挂进 agent 的 hook 里强制执行。以 Kimi Code 为例，在 `~/.kimi-code/config.toml` 里加上：

```toml
[[hooks]]
event = "UserPromptSubmit"
matcher = "[Rr]ogue(Map|List|Set|Queue|Memory)"
command = "sh ~/.agents/skills/how2useroguemap/scripts/version-check.sh || true"
```

注意末尾的 `|| true` 不能省——有些 hook 体系会把退出码 2 解释成「阻断」，而这个脚本里 2 的含义是「有更新」。Claude Code 也有对应的挂法（SessionStart hook），完整配置见仓库 README。

## 安装：一行命令

通过 skills CLI 一键安装：

```bash
npx skills add bryan31/How2useRogueMap
```

可选参数：

```bash
# 全局安装、指定 Codex、跳过确认
npx skills add bryan31/How2useRogueMap@how2useroguemap -g -a codex -y
```

安装会把整个 Skill 目录（含 `references/`、`scripts/`、`assets/`）复制到 agent 的配置目录，无需额外配置。Cursor、Claude Code、Codex、Kimi Code 都能用。

::: tip 注意
这个命令装的是 AI Skill，不是 RogueMap Java 库本身。项目里使用 RogueMap，仍需添加对应的 `com.yomahub` Maven 依赖。
:::

## 装好之后怎么用

不用学任何新东西。想写代码，直接把需求描述给它；想问用法，直接问。当你提到 RogueMap、RogueList、RogueSet、RogueQueue、RogueMemory、`UniversalEmbeddingProvider`，或者相关的安装、持久化、检索、容量规划、报错排查话题时，Skill 会自动启用。

最直接的方式是让它替你写代码，比如：

- 「帮我写一个基于 RogueMap 的本地 KV 缓存，要持久化，崩溃后能恢复」
- 「用 RogueMemory 给我的应用加一个对话记忆模块，支持混合检索」
- 「这段用 RogueMap 的代码帮我 review 一下，看看有没有坑」

写出来的代码用的是真实存在的 API：入口是 `RogueMap.mmap()` 而不是 AI 臆想的 `builder()`，import、资源关闭、变量作用域都是完整的，基本拿来就能跑，不用你再去文档里逐个核对方法名。

当然，纯问问题也行：

- 「RogueMap 怎么开启 mmap 持久化？崩了能恢复到什么程度？」
- 「RogueMemory 的向量 + BM25 混合检索，权重怎么配？」
- 「我要存 5000 万条 KV，堆外内存大概要留多少？」
- 「这个报错是什么意思：……」

以前这些事情，要么自己翻文档翻源码，要么赌 AI 没记错。现在 AI 给出的代码和答案都过了源码这一关，还附带引用。

## 版本范围

- RogueMap：**1.1.7**
- Java：**8+**
- 源码核验基线：`e78b7f9b1825e35910119284d6299aab5265c039`

如果你问的是其他版本，Skill 会重新核对应版本的源码，而不是直接套用 1.1.7 的结论。

## 最后

做这个 Skill 的初衷其实很简单：我自己也不想在「AI 说得对不对」这件事上反复花时间验证。与其每次都将信将疑，不如把核验过的东西直接喂给它。

欢迎安装试用，也欢迎 Star 和提 issue：

- **Skill 仓库**：https://github.com/bryan31/How2useRogueMap
- **RogueMap 仓库**：https://github.com/bryan31/RogueMap
- **官网**：https://roguemap.yomahub.com/
