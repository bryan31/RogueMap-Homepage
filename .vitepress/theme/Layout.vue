<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { nextTick, provide } from 'vue'

const { isDark } = useData()

function canAnimate() {
  return (
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  )
}

/**
 * 明暗切换：从点击位置展开一个圆形揭幕（View Transitions API）。
 * 不支持或开启"减少动态效果"时直接切换。
 */
provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
  if (!canAnimate()) {
    isDark.value = !isDark.value
    return
  }

  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const clipPath = [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`]

  const transition = (
    document as Document & {
      startViewTransition: (cb: () => Promise<void>) => { ready: Promise<void>; finished: Promise<void> }
    }
  ).startViewTransition(async () => {
    isDark.value = !isDark.value
    await nextTick()
  })

  await transition.ready

  // 浅→深：旧的浅色画面向点击处收缩；深→浅：新的浅色画面从点击处展开
  const animation = document.documentElement.animate(
    { clipPath: isDark.value ? clipPath.reverse() : clipPath },
    {
      duration: 520,
      easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
      fill: 'forwards',
      pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`
    }
  )

  // fill: forwards 的动画会一直挂在 <html> 上，并作用到下一次切换新建的伪元素，
  // 导致深→浅时旧画面直接被裁成 0、看不到展开动画。过渡结束后必须取消。
  transition.finished.finally(() => animation.cancel())
})
</script>

<template>
  <DefaultTheme.Layout />
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root),
.dark::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
  z-index: 9999;
}
</style>
