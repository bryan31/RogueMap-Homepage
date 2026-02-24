import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "RogueMap",
  description: "高性能的 Java 堆外内存和持久化键值存储引擎",
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', href: '/logo-in-dark.svg' }],
    ['meta', { name: 'theme-color', content: '#0f766e' }]
  ],

  themeConfig: {
    logo: {
      light: '/logo-in-light.svg',
      dark: '/logo-in-dark.svg'
    },

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/introduction' },
      { text: '性能白皮书', link: '/performance/benchmark' },
      {
        text: '链接',
        items: [
          { text: 'Gitee', link: 'https://gitee.com/bryan31/RogueMap' },
          { text: 'GitHub', link: 'https://github.com/bryan31/RogueMap' },
          { text: 'Maven Central', link: 'https://central.sonatype.com/artifact/com.yomahub/roguemap' }
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '上手路线（10 分钟）', link: '/guide/quick-start-path' },
            { text: '功能矩阵', link: '/guide/feature-matrix' },
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '为什么选择 RogueMap', link: '/guide/why-roguemap' }
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
            { text: '内存管理', link: '/guide/memory-management' }
          ]
        },
        {
          text: '高级用法',
          items: [
            { text: '并发控制', link: '/guide/concurrency' },
            { text: '事务', link: '/guide/transaction' },
            { text: '持久化', link: '/guide/persistence' },
            { text: '运维指南', link: '/guide/operations' },
            { text: '配置选项', link: '/guide/configuration' },
            { text: '最佳实践', link: '/guide/best-practices' },
            { text: '常见问题与排障', link: '/guide/troubleshooting' }
          ]
        }
      ],
      '/performance/': [
        {
          text: '性能',
          items: [
            { text: '性能白皮书', link: '/performance/benchmark' }
          ]
        }
      ]
    },

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
          root: {
            translations: {
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
          }
        }
      }
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部'
  }
})
