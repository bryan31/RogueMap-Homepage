import { computed } from 'vue'
import { useData } from 'vitepress'

/**
 * 首页文案与数据（中英双语）。
 * 代码示例写在 index.md / en/index.md 的 <HomeQuickstart> 插槽里，以便使用 Shiki 高亮。
 * 性能数据来自 performance/benchmark.md（Linux 2C4G，100 万条记录）。
 */

export const VERSION = '1.1.7'

export interface HeroAction {
  text: string
  link: string
  theme: 'brand' | 'alt' | 'ghost'
}

export interface BarRow {
  name: string
  value: number
  display: string
  highlight?: boolean
  estimate?: boolean
}

export interface BarTab {
  id: string
  label: string
  caption: string
  note: string
  rows: BarRow[]
}

export interface FeatureItem {
  title: string
  details: string
  link: string
}

export interface StructureRow {
  type: string
  scenario: string
  ops: string[]
  link: string
}

export interface PathStep {
  title: string
  desc: string
  link: string
}

export interface HomeContent {
  hero: {
    name: string
    headline: string
    tagline: string
    actions: HeroAction[]
    coordinate: string
    copyLabel: string
    copied: string
  }
  heap: {
    title: string
    lead: string
    tabs: BarTab[]
    estimate: string
    footnote: string
    moreText: string
    moreLink: string
  }
  features: {
    title: string
    lead: string
    more: string
    items: FeatureItem[]
    structures: { name: string; hint: string }[]
    memory: {
      query: string
      vector: string
      keyword: string
      results: { text: string; score: number; vector: number; keyword: number }[]
    }
    segments: { caption: string; locked: string; reading: string }
    metrics: {
      usage: string
      fragmentation: string
      entries: string
      threshold: string
      compact: string
      hint: string
    }
  }
  quickstart: {
    title: string
    lead: string
    links: { text: string; link: string }[]
  }
  structures: {
    title: string
    lead: string
    head: [string, string, string]
    rows: StructureRow[]
  }
  skill: {
    title: string
    lead: string
    command: string
    agentsLabel: string
    agents: string[]
    linkText: string
    link: string
    copyLabel: string
    copied: string
  }
  path: {
    title: string
    steps: PathStep[]
  }
}

const GITHUB = 'https://github.com/bryan31/RogueMap'

const zh: HomeContent = {
  hero: {
    name: 'RogueMap',
    headline: 'Java 嵌入式存储引擎 + AI 记忆层',
    tagline:
      '基于 mmap 的堆外数据结构与 RogueMemory 混合检索，突破 JVM 内存墙，让 Java 应用拥有持久化与 AI 智能记忆能力。',
    actions: [
      { text: '10 分钟上手', link: '/guide/quick-start-path', theme: 'brand' },
      { text: '快速开始', link: '/guide/getting-started', theme: 'alt' },
      { text: 'GitHub', link: GITHUB, theme: 'ghost' }
    ],
    coordinate: `com.yomahub:roguemap-core:${VERSION}`,
    copyLabel: '复制 Maven 坐标',
    copied: '已复制'
  },
  heap: {
    title: '100 万条数据，堆内存只占 47 MB',
    lead: '数据写进 mmap 映射的堆外文件，堆上只保留索引。与 HashMap 相比堆内存减少 84.7%，数据量再大也不会频繁 Full GC。',
    tabs: [
      {
        id: 'heap',
        label: '堆内存占用',
        caption: '单位 MB，越低越好',
        note: 'MapDB 的堆占用更低，但读、写吞吐分别只有 RogueMap 的 1/12 和 1/8。',
        rows: [
          { name: 'Caffeine', value: 351.69, display: '351.69 MB' },
          { name: 'HashMap', value: 311.31, display: '311.31 MB' },
          { name: 'FastUtil', value: 275.69, display: '275.69 MB' },
          { name: 'RogueMap 持久化', value: 47.63, display: '47.63 MB', highlight: true },
          { name: 'MapDB 持久化', value: 7.71, display: '7.71 MB' }
        ]
      },
      {
        id: 'read',
        label: '读吞吐',
        caption: '单位 ops/s，越高越好，仅对比可持久化方案',
        note: '纯内存的 HashMap、FastUtil 读得更快，但进程退出后数据随之丢失。',
        rows: [
          { name: 'RogueMap 持久化', value: 1557632, display: '1,557,632', highlight: true },
          { name: 'Redis 本地', value: 1000000, display: '~1,000,000', estimate: true },
          { name: 'MapDB 持久化', value: 129718, display: '129,718' },
          { name: 'Redis 网络', value: 100000, display: '~100,000', estimate: true }
        ]
      },
      {
        id: 'write',
        label: '写吞吐',
        caption: '单位 ops/s，越高越好',
        note: '写入只更新索引，数据直接落进映射区，比 HashMap 快 1.45 倍。',
        rows: [
          { name: 'FastUtil', value: 1666666, display: '1,666,666' },
          { name: 'RogueMap 持久化', value: 946073, display: '946,073', highlight: true },
          { name: 'Caffeine', value: 903342, display: '903,342' },
          { name: 'HashMap', value: 651465, display: '651,465' },
          { name: 'MapDB 持久化', value: 123198, display: '123,198' }
        ]
      }
    ],
    estimate: '估算值',
    footnote:
      '测试环境：Linux 2 核 4 GB，SSD；100 万条含 10 个字段的对象，顺序写入后随机读取。Redis 为基于典型延迟的估算值。',
    moreText: '查看完整性能白皮书',
    moreLink: '/performance/benchmark'
  },
  features: {
    title: '全部运行在你的 Java 进程里',
    lead: '不需要部署 Redis、向量数据库或搜索引擎。加一个依赖，存储、检索和记忆都在本地完成。',
    more: '了解详情',
    items: [
      {
        title: '嵌入式存储引擎',
        details:
          'RogueMap、RogueList、RogueSet、RogueQueue 四种堆外数据结构，统一 Builder 风格，支持持久化、事务、TTL、自动检查点与崩溃恢复。',
        link: '/guide/introduction'
      },
      {
        title: 'RogueMemory AI 记忆层',
        details:
          '内置向量 ANN + BM25 关键词混合检索，支持 OpenAI、Ollama 等主流 Embedding 服务，无需外部向量数据库或搜索引擎。',
        link: '/rogue-memory/introduction'
      },
      {
        title: '高并发与大容量',
        details:
          '分段索引、乐观读、自动扩容、超低堆 LowHeap 索引（堆内存再降 99%），数据容量可达 TB 级。',
        link: '/guide/concurrency'
      },
      {
        title: '运行可观测',
        details:
          '内置 StorageMetrics，可监控使用量、碎片率、条目数并按阈值触发 compact。支持 TTL 数据自动过期。',
        link: '/guide/monitoring'
      }
    ],
    structures: [
      { name: 'Map', hint: '键值' },
      { name: 'List', hint: '顺序' },
      { name: 'Set', hint: '去重' },
      { name: 'Queue', hint: '先进先出' }
    ],
    memory: {
      query: 'mem.search("用户界面偏好", 5)',
      vector: '向量',
      keyword: 'BM25',
      results: [
        { text: '用户偏好深色模式', score: 0.91, vector: 0.94, keyword: 0.72 },
        { text: '编辑器字号调到 16px', score: 0.74, vector: 0.81, keyword: 0.38 },
        { text: '侧边栏默认收起', score: 0.58, vector: 0.66, keyword: 0.21 }
      ]
    },
    segments: {
      caption: '64 个分段各自加锁，读操作走 StampedLock 乐观读',
      locked: '写锁',
      reading: '乐观读'
    },
    metrics: {
      usage: '使用量',
      fragmentation: '碎片率',
      entries: '条目数',
      threshold: '阈值 30%',
      compact: '已 compact',
      hint: '悬停查看 compact 效果'
    }
  },
  quickstart: {
    title: '2 分钟跑起来',
    lead: '引入依赖，用 Builder 创建实例，然后像操作 Map 一样读写。持久化文件会在下次启动时自动恢复。',
    links: [
      { text: '完整上手路线', link: '/guide/quick-start-path' },
      { text: '配置选项', link: '/guide/configuration' }
    ]
  },
  structures: {
    title: '按场景选结构',
    lead: '五种结构共用同一套 Builder 与存储模式，换一种结构几乎不用改代码。',
    head: ['结构', '适合场景', '核心操作'],
    rows: [
      { type: 'RogueMap<K, V>', scenario: '键值缓存、状态存储', ops: ['put', 'get', 'remove'], link: '/guide/getting-started' },
      { type: 'RogueList<E>', scenario: '顺序数据、时间序列', ops: ['addLast', 'get', 'removeLast'], link: '/guide/roguelist' },
      { type: 'RogueSet<E>', scenario: '去重、标签、黑名单', ops: ['add', 'contains', 'remove'], link: '/guide/rogueset' },
      { type: 'RogueQueue<E>', scenario: '任务与消息消费', ops: ['offer', 'poll', 'peek'], link: '/guide/roguequeue' },
      { type: 'RogueMemory', scenario: 'AI Agent 记忆、RAG、语义搜索', ops: ['add', 'search', 'delete'], link: '/rogue-memory/introduction' }
    ]
  },
  skill: {
    title: '让 AI 编程助手照着源码写 RogueMap',
    lead: '官方 Agent Skill「How2useRogueMap」内置经过源码核验的 API 知识与运维参考，AI 不再凭记忆猜测用法。',
    command: 'npx skills add bryan31/How2useRogueMap',
    agentsLabel: '支持',
    agents: ['Cursor', 'Claude Code', 'Codex', 'Kimi Code'],
    linkText: '了解 AI Skill',
    link: '/guide/ai-skill',
    copyLabel: '复制安装命令',
    copied: '已复制'
  },
  path: {
    title: '推荐阅读路径',
    steps: [
      { title: '上手路线（10 分钟）', desc: '从引入依赖到第一次读写', link: '/guide/quick-start-path' },
      { title: '快速开始', desc: 'RogueMap 的基本 API', link: '/guide/getting-started' },
      { title: 'RogueMemory 介绍', desc: '混合检索与 Embedding', link: '/rogue-memory/introduction' },
      { title: '配置选项', desc: '存储、索引与检查点参数', link: '/guide/configuration' },
      { title: '常见问题与排障', desc: '常见报错与处理办法', link: '/guide/troubleshooting' }
    ]
  }
}

const en: HomeContent = {
  hero: {
    name: 'RogueMap',
    headline: 'Embedded storage and AI memory for Java',
    tagline:
      'mmap-backed off-heap collections and RogueMemory hybrid search break through JVM heap limits, bringing durable storage and intelligent memory to Java applications.',
    actions: [
      { text: '10-Minute Guide', link: '/en/guide/quick-start-path', theme: 'brand' },
      { text: 'Quick Start', link: '/en/guide/getting-started', theme: 'alt' },
      { text: 'GitHub', link: GITHUB, theme: 'ghost' }
    ],
    coordinate: `com.yomahub:roguemap-core:${VERSION}`,
    copyLabel: 'Copy Maven coordinate',
    copied: 'Copied'
  },
  heap: {
    title: 'A million records in 47 MB of heap',
    lead: 'Data lives in mmap-backed files off the heap; only the index stays on it. That is 84.7% less heap than HashMap, so large datasets stop triggering frequent full GCs.',
    tabs: [
      {
        id: 'heap',
        label: 'Heap usage',
        caption: 'MB, lower is better',
        note: 'MapDB uses even less heap, but reads and writes at roughly 1/12 and 1/8 of RogueMap’s throughput.',
        rows: [
          { name: 'Caffeine', value: 351.69, display: '351.69 MB' },
          { name: 'HashMap', value: 311.31, display: '311.31 MB' },
          { name: 'FastUtil', value: 275.69, display: '275.69 MB' },
          { name: 'RogueMap persistent', value: 47.63, display: '47.63 MB', highlight: true },
          { name: 'MapDB persistent', value: 7.71, display: '7.71 MB' }
        ]
      },
      {
        id: 'read',
        label: 'Read throughput',
        caption: 'ops/s, higher is better, durable options only',
        note: 'In-memory HashMap and FastUtil read faster, but lose everything when the process exits.',
        rows: [
          { name: 'RogueMap persistent', value: 1557632, display: '1,557,632', highlight: true },
          { name: 'Redis local', value: 1000000, display: '~1,000,000', estimate: true },
          { name: 'MapDB persistent', value: 129718, display: '129,718' },
          { name: 'Redis network', value: 100000, display: '~100,000', estimate: true }
        ]
      },
      {
        id: 'write',
        label: 'Write throughput',
        caption: 'ops/s, higher is better',
        note: 'Writes only touch the index while data lands straight in the mapped region — 1.45× faster than HashMap.',
        rows: [
          { name: 'FastUtil', value: 1666666, display: '1,666,666' },
          { name: 'RogueMap persistent', value: 946073, display: '946,073', highlight: true },
          { name: 'Caffeine', value: 903342, display: '903,342' },
          { name: 'HashMap', value: 651465, display: '651,465' },
          { name: 'MapDB persistent', value: 123198, display: '123,198' }
        ]
      }
    ],
    estimate: 'estimate',
    footnote:
      'Environment: Linux, 2 cores, 4 GB, SSD; one million objects with 10 fields, sequential writes followed by random reads. Redis figures are estimates based on typical latency.',
    moreText: 'Read the full performance white paper',
    moreLink: '/en/performance/benchmark'
  },
  features: {
    title: 'Everything runs inside your Java process',
    lead: 'No Redis, vector database, or search engine to deploy. Add one dependency and storage, retrieval, and memory all stay local.',
    more: 'Learn more',
    items: [
      {
        title: 'Embedded storage engine',
        details:
          'RogueMap, RogueList, RogueSet, and RogueQueue: four off-heap structures with one Builder style, supporting persistence, transactions, TTL, automatic checkpoints, and crash recovery.',
        link: '/en/guide/introduction'
      },
      {
        title: 'RogueMemory AI layer',
        details:
          'Built-in vector ANN + BM25 hybrid search works with OpenAI, Ollama, and other embedding services — no external vector database or search engine required.',
        link: '/en/rogue-memory/introduction'
      },
      {
        title: 'High concurrency at scale',
        details:
          'Segmented indexes, optimistic reads, automatic expansion, and the LowHeap index (99% less heap again) take capacity to the terabyte range.',
        link: '/en/guide/concurrency'
      },
      {
        title: 'Built-in observability',
        details:
          'StorageMetrics reports utilization, fragmentation, and entry counts, and triggers compaction at thresholds you set. TTL expiry is built in.',
        link: '/en/guide/monitoring'
      }
    ],
    structures: [
      { name: 'Map', hint: 'key-value' },
      { name: 'List', hint: 'ordered' },
      { name: 'Set', hint: 'unique' },
      { name: 'Queue', hint: 'FIFO' }
    ],
    memory: {
      query: 'mem.search("UI preferences", 5)',
      vector: 'Vector',
      keyword: 'BM25',
      results: [
        { text: 'User prefers dark mode', score: 0.91, vector: 0.94, keyword: 0.72 },
        { text: 'Editor font size set to 16px', score: 0.74, vector: 0.81, keyword: 0.38 },
        { text: 'Sidebar collapsed by default', score: 0.58, vector: 0.66, keyword: 0.21 }
      ]
    },
    segments: {
      caption: '64 independently locked segments; reads use StampedLock optimistic reads',
      locked: 'Write lock',
      reading: 'Optimistic read'
    },
    metrics: {
      usage: 'Utilization',
      fragmentation: 'Fragmentation',
      entries: 'Entries',
      threshold: '30% threshold',
      compact: 'Compacted',
      hint: 'Hover to run compact'
    }
  },
  quickstart: {
    title: 'Running in two minutes',
    lead: 'Add the dependency, build an instance, then read and write it like a Map. Persistent files are recovered automatically on the next start.',
    links: [
      { text: 'Full 10-minute path', link: '/en/guide/quick-start-path' },
      { text: 'Configuration', link: '/en/guide/configuration' }
    ]
  },
  structures: {
    title: 'Pick a structure by use case',
    lead: 'All five share the same Builder and storage modes, so switching structures barely changes your code.',
    head: ['Structure', 'Good for', 'Core operations'],
    rows: [
      { type: 'RogueMap<K, V>', scenario: 'Key-value cache, state storage', ops: ['put', 'get', 'remove'], link: '/en/guide/getting-started' },
      { type: 'RogueList<E>', scenario: 'Sequential data, time series', ops: ['addLast', 'get', 'removeLast'], link: '/en/guide/roguelist' },
      { type: 'RogueSet<E>', scenario: 'Deduplication, tags, blocklists', ops: ['add', 'contains', 'remove'], link: '/en/guide/rogueset' },
      { type: 'RogueQueue<E>', scenario: 'Task and message consumption', ops: ['offer', 'poll', 'peek'], link: '/en/guide/roguequeue' },
      { type: 'RogueMemory', scenario: 'AI agent memory, RAG, semantic search', ops: ['add', 'search', 'delete'], link: '/en/rogue-memory/introduction' }
    ]
  },
  skill: {
    title: 'Let AI coding assistants write RogueMap from the source',
    lead: 'The official Agent Skill “How2useRogueMap” ships source-verified API knowledge and operations references, so assistants stop guessing.',
    command: 'npx skills add bryan31/How2useRogueMap',
    agentsLabel: 'Works with',
    agents: ['Cursor', 'Claude Code', 'Codex', 'Kimi Code'],
    linkText: 'About the AI Skill',
    link: '/en/guide/ai-skill',
    copyLabel: 'Copy install command',
    copied: 'Copied'
  },
  path: {
    title: 'Recommended reading path',
    steps: [
      { title: '10-Minute Guide', desc: 'From dependency to first read', link: '/en/guide/quick-start-path' },
      { title: 'Quick Start', desc: 'The core RogueMap API', link: '/en/guide/getting-started' },
      { title: 'RogueMemory', desc: 'Hybrid search and embeddings', link: '/en/rogue-memory/introduction' },
      { title: 'Configuration', desc: 'Storage, index, checkpoints', link: '/en/guide/configuration' },
      { title: 'Troubleshooting', desc: 'Common errors and fixes', link: '/en/guide/troubleshooting' }
    ]
  }
}

export function useHomeContent() {
  const { lang } = useData()
  return computed(() => (lang.value.startsWith('zh') ? zh : en))
}

/** 中文标题按逗号等标点切成短语，避免在词中间折行 */
export function phrases(text: string): string[] {
  return text.split(/(?<=[，。；：、])/)
}
