import { defineConfig } from 'vitepress'

const logo = {
  light: '/logo-in-light.svg',
  dark: '/logo-in-dark.svg'
}

const links = {
  text: 'Links',
  items: [
    { text: 'Gitee', link: 'https://gitee.com/bryan31/RogueMap' },
    { text: 'GitHub', link: 'https://github.com/bryan31/RogueMap' },
    { text: 'Maven Central', link: 'https://central.sonatype.com/artifact/com.yomahub/roguemap' }
  ]
}

const zhNav = [
  { text: '首页', link: '/' },
  { text: 'RogueMap 指南', link: '/guide/introduction' },
  { text: 'RogueMemory 指南', link: '/rogue-memory/introduction' },
  { text: '性能白皮书', link: '/performance/benchmark' },
  { ...links, text: '链接' }
]

const enNav = [
  { text: 'Home', link: '/en/' },
  { text: 'RogueMap Guide', link: '/en/guide/introduction' },
  { text: 'RogueMemory Guide', link: '/en/rogue-memory/introduction' },
  { text: 'Performance', link: '/en/performance/benchmark' },
  links
]

const zhSidebar = {
  '/rogue-memory/': [
    {
      text: 'RogueMemory 指南',
      items: [
        { text: '介绍', link: '/rogue-memory/introduction' },
        { text: '快速开始', link: '/rogue-memory/quick-start' },
        { text: '检索模式', link: '/rogue-memory/search-modes' },
        { text: '数据操作', link: '/rogue-memory/data-operations' },
        { text: '元数据与命名空间', link: '/rogue-memory/metadata-namespace' },
        { text: 'Embedding 服务配置', link: '/rogue-memory/embedding-config' },
        { text: '检查点与自动检查点', link: '/rogue-memory/auto-checkpoint' },
        { text: '自动扩容', link: '/rogue-memory/auto-expand' },
        { text: '持久化与运维', link: '/rogue-memory/persistence' },
        { text: '存储结构与性能', link: '/rogue-memory/storage-and-performance' }
      ]
    }
  ],
  '/guide/': [
    {
      text: '开始',
      items: [
        { text: '上手路线（10 分钟）', link: '/guide/quick-start-path' },
        { text: '介绍', link: '/guide/introduction' },
        { text: '快速开始', link: '/guide/getting-started' },
        { text: '为什么选择 RogueMap', link: '/guide/why-roguemap' },
        { text: '功能矩阵', link: '/guide/feature-matrix' }
      ]
    },
    {
      text: '数据结构',
      items: [
        { text: 'RogueMap', link: '/guide/getting-started' },
        { text: 'RogueList', link: '/guide/roguelist' },
        { text: 'RogueSet', link: '/guide/rogueset' },
        { text: 'RogueQueue', link: '/guide/roguequeue' }
      ]
    },
    {
      text: '核心概念',
      items: [
        { text: '存储模式', link: '/guide/storage-modes' },
        { text: '索引策略', link: '/guide/index-strategies' },
        { text: '编解码器', link: '/guide/codecs' },
        { text: 'TTL 数据过期', link: '/guide/ttl' },
        { text: '并发控制', link: '/guide/concurrency' }
      ]
    },
    {
      text: '运维与管理',
      items: [
        { text: '持久化与崩溃恢复', link: '/guide/persistence' },
        { text: '检查点与自动检查点', link: '/guide/auto-checkpoint' },
        { text: '自动扩容', link: '/guide/auto-expand' },
        { text: '空间回收', link: '/guide/compact' },
        { text: '监控指标', link: '/guide/monitoring' },
        { text: '事务', link: '/guide/transaction' }
      ]
    },
    {
      text: '参考',
      items: [
        { text: '配置选项', link: '/guide/configuration' },
        { text: '最佳实践', link: '/guide/best-practices' },
        { text: '内存管理', link: '/guide/memory-management' },
        { text: '常见问题与排障', link: '/guide/troubleshooting' }
      ]
    }
  ],
  '/performance/': [
    {
      text: '性能',
      items: [{ text: '性能白皮书', link: '/performance/benchmark' }]
    }
  ]
}

const enSidebar = {
  '/en/rogue-memory/': [
    {
      text: 'RogueMemory Guide',
      items: [
        { text: 'Introduction', link: '/en/rogue-memory/introduction' },
        { text: 'Quick Start', link: '/en/rogue-memory/quick-start' },
        { text: 'Search Modes', link: '/en/rogue-memory/search-modes' },
        { text: 'Data Operations', link: '/en/rogue-memory/data-operations' },
        { text: 'Metadata and Namespaces', link: '/en/rogue-memory/metadata-namespace' },
        { text: 'Embedding Configuration', link: '/en/rogue-memory/embedding-config' },
        { text: 'Checkpoints', link: '/en/rogue-memory/auto-checkpoint' },
        { text: 'Auto Expansion', link: '/en/rogue-memory/auto-expand' },
        { text: 'Persistence and Operations', link: '/en/rogue-memory/persistence' },
        { text: 'Storage and Performance', link: '/en/rogue-memory/storage-and-performance' }
      ]
    }
  ],
  '/en/guide/': [
    {
      text: 'Getting Started',
      items: [
        { text: '10-Minute Path', link: '/en/guide/quick-start-path' },
        { text: 'Introduction', link: '/en/guide/introduction' },
        { text: 'Quick Start', link: '/en/guide/getting-started' },
        { text: 'Why RogueMap', link: '/en/guide/why-roguemap' },
        { text: 'Feature Matrix', link: '/en/guide/feature-matrix' }
      ]
    },
    {
      text: 'Data Structures',
      items: [
        { text: 'RogueMap', link: '/en/guide/getting-started' },
        { text: 'RogueList', link: '/en/guide/roguelist' },
        { text: 'RogueSet', link: '/en/guide/rogueset' },
        { text: 'RogueQueue', link: '/en/guide/roguequeue' }
      ]
    },
    {
      text: 'Core Concepts',
      items: [
        { text: 'Storage Modes', link: '/en/guide/storage-modes' },
        { text: 'Index Strategies', link: '/en/guide/index-strategies' },
        { text: 'Codecs', link: '/en/guide/codecs' },
        { text: 'TTL Expiration', link: '/en/guide/ttl' },
        { text: 'Concurrency', link: '/en/guide/concurrency' }
      ]
    },
    {
      text: 'Operations',
      items: [
        { text: 'Persistence and Recovery', link: '/en/guide/persistence' },
        { text: 'Checkpoints', link: '/en/guide/auto-checkpoint' },
        { text: 'Auto Expansion', link: '/en/guide/auto-expand' },
        { text: 'Compaction', link: '/en/guide/compact' },
        { text: 'Monitoring', link: '/en/guide/monitoring' },
        { text: 'Transactions', link: '/en/guide/transaction' }
      ]
    },
    {
      text: 'Reference',
      items: [
        { text: 'Configuration', link: '/en/guide/configuration' },
        { text: 'Best Practices', link: '/en/guide/best-practices' },
        { text: 'Memory Management', link: '/en/guide/memory-management' },
        { text: 'Troubleshooting', link: '/en/guide/troubleshooting' }
      ]
    }
  ],
  '/en/performance/': [
    {
      text: 'Performance',
      items: [{ text: 'Performance White Paper', link: '/en/performance/benchmark' }]
    }
  ]
}

const searchTranslations = {
  button: {
    buttonText: '搜索文档',
    buttonAriaLabel: '搜索文档'
  },
  modal: {
    noResultsText: '无法找到相关结果',
    resetButtonTitle: '清除查询条件',
    footer: {
      selectText: '选择',
      navigateText: '切换'
    }
  }
}

export default defineConfig({
  title: 'RogueMap',
  description: 'Java 嵌入式存储引擎 — 堆外数据结构 + RogueMemory AI 记忆层',
  lang: 'zh-CN',

  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: zhNav,
        sidebar: zhSidebar,
        outline: { label: '页面导航', level: [2, 3] },
        lastUpdated: {
          text: '最后更新于',
          formatOptions: { dateStyle: 'short', timeStyle: 'short' }
        },
        docFooter: { prev: '上一页', next: '下一页' },
        darkModeSwitchLabel: '主题',
        lightModeSwitchTitle: '切换到浅色模式',
        darkModeSwitchTitle: '切换到深色模式',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '回到顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳转到正文'
      }
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      description: 'A Java embedded storage engine with off-heap data structures and the RogueMemory AI memory layer.',
      themeConfig: {
        nav: enNav,
        sidebar: enSidebar,
        outline: { label: 'On this page', level: [2, 3] },
        lastUpdated: {
          text: 'Last updated',
          formatOptions: { dateStyle: 'short', timeStyle: 'short' }
        },
        docFooter: { prev: 'Previous page', next: 'Next page' },
        darkModeSwitchLabel: 'Appearance',
        lightModeSwitchTitle: 'Switch to light theme',
        darkModeSwitchTitle: 'Switch to dark theme',
        sidebarMenuLabel: 'Menu',
        returnToTopLabel: 'Return to top',
        langMenuLabel: 'Change language',
        skipToContentLabel: 'Skip to content'
      }
    }
  },

  head: [
    ['link', { rel: 'icon', href: '/logo-in-dark.svg' }],
    ['meta', { name: 'theme-color', content: '#3451b2' }]
  ],

  themeConfig: {
    logo,
    socialLinks: [
      {
        icon: {
          svg: '<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M512 1024C229.222 1024 0 794.778 0 512S229.222 0 512 0s512 229.222 512 512-229.222 512-512 512z m259.149-568.883h-290.74a25.293 25.293 0 0 0-25.292 25.293l-0.026 63.206c0 13.952 11.315 25.293 25.267 25.293h177.024c13.978 0 25.293 11.315 25.293 25.267v12.646a75.853 75.853 0 0 1-75.853 75.853h-240.23a25.293 25.293 0 0 1-25.267-25.293V417.203a75.853 75.853 0 0 1 75.827-75.853h353.946a25.293 25.293 0 0 0 25.267-25.292l0.077-63.207a25.293 25.293 0 0 0-25.268-25.293H417.152a189.62 189.62 0 0 0-189.62 189.645V771.15c0 13.977 11.316 25.293 25.294 25.293h372.94a170.65 170.65 0 0 0 170.65-170.65V480.384a25.293 25.293 0 0 0-25.293-25.267z"/></svg>'
        },
        link: 'https://gitee.com/bryan31/RogueMap'
      },
      { icon: 'github', link: 'https://github.com/bryan31/RogueMap' }
    ],
    footer: {
      message: 'Released under the Apache License 2.0',
      copyright: 'Copyright © 2024-present bryan31'
    },
    search: {
      provider: 'local',
      options: {
        locales: {
          root: { translations: searchTranslations }
        }
      }
    }
  }
})
