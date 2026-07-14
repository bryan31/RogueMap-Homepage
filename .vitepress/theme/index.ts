import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import HomeFeatureMatrix from './components/HomeFeatureMatrix.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'home-features-before': () => h(HomeFeatureMatrix)
    })
  },
  enhanceApp({ app, router, siteData }) {
    // 可以在这里注册自定义组件或添加全局功能
  }
} satisfies Theme
