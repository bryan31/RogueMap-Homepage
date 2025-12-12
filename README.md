# RogueMap 文档站点

这是 RogueMap 的官方文档站点，使用 VitePress 构建。

## 快速开始

### 安装依赖

```bash
cd homepage
npm install
```

### 本地开发

```bash
npm run docs:dev
```

启动后可在浏览器中访问查看文档站点。

### 构建生产版本

```bash
npm run docs:build
```

构建产物将生成在 `.vitepress/dist` 目录。

### 预览生产版本

```bash
npm run docs:preview
```

## 文档结构

```
homepage/
├── .vitepress/
│   └── config.mts          # VitePress 配置
├── public/
│   └── logo.svg            # 项目 Logo
├── guide/                  # 指南文档
│   ├── introduction.md     # 介绍
│   ├── getting-started.md  # 快速开始
│   ├── why-roguemap.md     # 为什么选择 RogueMap
│   ├── storage-modes.md    # 存储模式
│   ├── index-strategies.md # 索引策略
│   ├── codecs.md           # 编解码器
│   ├── memory-management.md # 内存管理
│   ├── concurrency.md      # 并发控制
│   ├── persistence.md      # 持久化
│   ├── configuration.md    # 配置选项
│   └── best-practices.md   # 最佳实践
├── performance/            # 性能文档
│   ├── benchmark.md        # 性能测试
│   ├── comparison.md       # 对比分析
│   └── optimization.md     # 性能优化
├── index.md                # 首页
├── package.json            # 依赖配置
└── README.md               # 本文件
```

## 技术栈

- [VitePress](https://vitepress.dev/) - 静态站点生成器
- [Vue 3](https://vuejs.org/) - 前端框架
- [Markdown](https://www.markdownguide.org/) - 文档格式

## 部署

### GitHub Pages

在 `.github/workflows/deploy.yml` 中添加：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - master

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: cd homepage && npm install
      - name: Build
        run: cd homepage && npm run docs:build
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: homepage/.vitepress/dist
```

### Netlify

1. 连接 GitHub 仓库
2. 设置构建命令: `cd homepage && npm run docs:build`
3. 设置发布目录: `homepage/.vitepress/dist`

### Vercel

1. 导入 GitHub 仓库
2. 设置根目录: `homepage`
3. 构建命令: `npm run docs:build`
4. 输出目录: `.vitepress/dist`

## 自定义

### 修改配置

编辑 `.vitepress/config.mts` 文件。

### 修改主题

VitePress 使用默认主题，可以通过配置文件自定义颜色、布局等。

### 添加页面

在相应目录下创建 Markdown 文件，并在配置文件中添加侧边栏配置。

## 许可证

Apache License 2.0
