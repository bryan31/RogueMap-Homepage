<script setup lang="ts">
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'

const content = useHomeContent()
</script>

<template>
  <section class="RhSection RhQuick">
    <div class="RhWrap RhQuick-grid">
      <header class="RhQuick-head">
        <h2 class="RhTitle"><span v-for="(p, i) in phrases(content.quickstart.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
        <p class="RhLead">{{ content.quickstart.lead }}</p>
        <div class="RhQuick-links">
          <a
            v-for="l in content.quickstart.links"
            :key="l.link"
            class="RhLink"
            :href="withBase(l.link)"
          >{{ l.text }}</a>
        </div>
      </header>

      <!-- 代码示例来自 Markdown 插槽，沿用 VitePress 的 Shiki 高亮与 code-group -->
      <div class="RhQuick-code vp-doc">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhQuick-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 56px;
  align-items: start;
}

.RhQuick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 22px;
}

.RhQuick-code {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--rh-line);
  border-radius: 16px;
  background: var(--vp-code-block-bg);
  box-shadow: 0 30px 60px -30px color-mix(in srgb, var(--rh-brand) 35%, transparent);
}

@media (max-width: 959px) {
  .RhQuick-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 639px) {
  .RhQuick-code {
    border-radius: 12px;
  }
}
</style>

<style>
/* 插槽内容来自 Markdown，用非 scoped 样式覆盖 VitePress 默认代码块 */
.RhQuick-code .vp-code-group {
  margin: 0;
}

.RhQuick-code .vp-code-group .tabs {
  margin: 0;
  padding: 0 14px;
  border-radius: 0;
  background: transparent;
  box-shadow: inset 0 -1px var(--rh-line);
}

.RhQuick-code .vp-code-group .tabs label {
  line-height: 52px;
  font-size: 13.5px;
  font-weight: 600;
}

.RhQuick-code .vp-code-group .tabs label::after {
  bottom: -1px;
  height: 2px;
}

.RhQuick-code div[class*='language-'] {
  margin: 0 !important;
  border-radius: 0 !important;
  background: transparent;
}

.RhQuick-code div[class*='language-'] pre {
  padding: 22px 0 26px;
}

.RhQuick-code div[class*='language-'] code {
  font-size: 13.5px;
  line-height: 1.75;
}

@media (max-width: 639px) {
  .RhQuick-code div[class*='language-'] code {
    font-size: 12.5px;
  }
}
</style>
