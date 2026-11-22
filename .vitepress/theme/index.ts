import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import '@fontsource-variable/archivo/wdth.css'
import Layout from './Layout.vue'
import HomeHero from './home/HomeHero.vue'
import HomeHeap from './home/HomeHeap.vue'
import HomeFeatures from './home/HomeFeatures.vue'
import HomeQuickstart from './home/HomeQuickstart.vue'
import HomeStructures from './home/HomeStructures.vue'
import HomeSkill from './home/HomeSkill.vue'
import HomePath from './home/HomePath.vue'
import './style.css'
import './home/home.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // 首页分区组件，在 index.md / en/index.md 中按顺序组合
    app.component('HomeHero', HomeHero)
    app.component('HomeHeap', HomeHeap)
    app.component('HomeFeatures', HomeFeatures)
    app.component('HomeQuickstart', HomeQuickstart)
    app.component('HomeStructures', HomeStructures)
    app.component('HomeSkill', HomeSkill)
    app.component('HomePath', HomePath)
  }
} satisfies Theme
