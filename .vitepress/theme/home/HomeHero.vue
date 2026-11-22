<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { useHomeContent } from './content'
import { useCopy } from './useCopy'
import { MemoryField } from './memoryField'

const content = useHomeContent()
const { copied, copy } = useCopy()

const hero = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const mark = ref<HTMLElement>()

const isExternal = (link: string) => /^https?:/.test(link)
const href = (link: string) => (isExternal(link) ? link : withBase(link))

let field: MemoryField | null = null
let resizeObserver: ResizeObserver | null = null
let classObserver: MutationObserver | null = null
let viewObserver: IntersectionObserver | null = null
let burstTimer = 0
let inView = true

// Logo 相对 canvas 的位置：resize 时更新，避免每帧读布局
const geom = { ox: 0, oy: 0, hole: null as null | { x: number; y: number; w: number; h: number } }

function measure() {
  const el = mark.value
  const inner = el?.offsetParent as HTMLElement | null
  if (!el || !inner) return
  // 用 offset* 取布局盒，避免入场动画的 transform 影响坐标
  const size = el.offsetWidth
  if (!size) {
    geom.hole = null
    return
  }
  const x = inner.offsetLeft + el.offsetLeft
  const y = inner.offsetTop + el.offsetTop
  // 破壁块（Logo viewBox 内 55~95 区域）的中心
  geom.ox = x + size * 0.75
  geom.oy = y + size * 0.75
  geom.hole = { x: x + size * 0.1, y: y + size * 0.1, w: size * 0.88, h: size * 0.88 }
}

function onPointer(e: PointerEvent) {
  if (!field || !canvas.value) return
  const c = canvas.value.getBoundingClientRect()
  field.setPointer(e.clientX - c.left, e.clientY - c.top, true)
}

function onLeave() {
  field?.setPointer(0, 0, false)
}

function onVisibility() {
  if (!field) return
  if (document.hidden || !inView) field.stop()
  else field.start()
}

onMounted(() => {
  if (!canvas.value) return
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  field = new MemoryField(canvas.value, {
    reducedMotion,
    origin: () => (geom.hole ? { x: geom.ox, y: geom.oy } : null),
    hole: () => geom.hole
  })

  measure()
  field.readPalette()
  field.resize()

  resizeObserver = new ResizeObserver(() => {
    measure()
    field?.resize()
  })
  resizeObserver.observe(canvas.value)

  // 主题切换时重新取色（VitePress 通过 html.dark 切换）
  classObserver = new MutationObserver(() => field?.readPalette())
  classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  viewObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    onVisibility()
  })
  viewObserver.observe(canvas.value)
  document.addEventListener('visibilitychange', onVisibility)

  document.fonts?.ready.then(() => {
    measure()
  })

  if (!reducedMotion) {
    field.start()
    // 与 Logo 入场动画对齐：Logo 落定后第一道波纹冲出
    burstTimer = window.setTimeout(() => {
      measure()
      field?.burst()
    }, 620)
  }
})

onBeforeUnmount(() => {
  clearTimeout(burstTimer)
  field?.destroy()
  resizeObserver?.disconnect()
  classObserver?.disconnect()
  viewObserver?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <section
    ref="hero"
    class="RhHero"
    @pointermove="onPointer"
    @pointerleave="onLeave"
  >
    <canvas ref="canvas" class="RhHero-field" aria-hidden="true" />

    <div class="RhHero-inner">
      <div class="RhHero-copy">
        <h1 class="RhHero-name">{{ content.hero.name }}</h1>
        <p class="RhHero-headline">
          <template v-for="(part, i) in content.hero.headline.split(' + ')" :key="i">
            <template v-if="i > 0">{{ ' ' }}</template>
            <span class="RhPhrase">{{ i > 0 ? `+ ${part}` : part }}</span>
          </template>
        </p>
        <p class="RhHero-tagline">{{ content.hero.tagline }}</p>

        <div class="RhHero-actions">
          <a
            v-for="action in content.hero.actions"
            :key="action.link"
            class="RhBtn"
            :class="`RhBtn--${action.theme}`"
            :href="href(action.link)"
            :target="isExternal(action.link) ? '_blank' : undefined"
            :rel="isExternal(action.link) ? 'noreferrer' : undefined"
          >
            <svg
              v-if="action.theme === 'ghost'"
              class="RhBtn-icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
              />
            </svg>
            {{ action.text }}
          </a>
        </div>

        <button
          type="button"
          class="RhHero-coord"
          :aria-label="content.hero.copyLabel"
          @click="copy(content.hero.coordinate)"
        >
          <span class="RhHero-coordTag">Maven</span>
          <code>{{ content.hero.coordinate }}</code>
          <span class="RhHero-coordState" aria-live="polite">
            <svg
              v-if="!copied"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" />
            </svg>
            <span v-else class="RhHero-coordDone">{{ content.hero.copied }}</span>
          </span>
        </button>
      </div>

      <div ref="mark" class="RhHero-mark">
        <img class="RhHero-logo is-light" :src="withBase('/logo-in-light.svg')" alt="RogueMap logo" />
        <img class="RhHero-logo is-dark" :src="withBase('/logo-in-dark.svg')" alt="RogueMap logo" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhHero {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  margin-top: calc(var(--vp-nav-height) * -1);
  padding: calc(var(--vp-nav-height) + 72px) var(--rh-gutter) 96px;
  min-height: min(880px, 100svh);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--rh-line);
}

.RhHero-field {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  -webkit-mask-image:
    linear-gradient(to bottom, #000 72%, transparent 100%),
    radial-gradient(120% 95% at 74% 46%, #000 18%, rgba(0, 0, 0, 0.55) 52%, rgba(0, 0, 0, 0.18) 82%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to bottom, #000 72%, transparent 100%),
    radial-gradient(120% 95% at 74% 46%, #000 18%, rgba(0, 0, 0, 0.55) 52%, rgba(0, 0, 0, 0.18) 82%);
  mask-composite: intersect;
}

.RhHero-inner {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.65fr);
  align-items: center;
  gap: 48px;
  width: 100%;
  max-width: var(--rh-max);
  margin: 0 auto;
}

.RhHero-copy {
  min-width: 0;
  max-width: 760px;
}

.RhHero-name {
  margin: 0;
  color: var(--rh-ink);
  font-family: var(--rh-display);
  font-size: clamp(48px, 7.2vw, 112px);
  font-stretch: 125%;
  font-weight: 800;
  line-height: 0.92;
  letter-spacing: -0.035em;
  white-space: nowrap;
}

.RhHero-headline {
  margin: 28px 0 0;
  color: var(--rh-ink);
  font-size: clamp(24px, 2.6vw, 34px);
  font-weight: 700;
  line-height: 1.3;
  text-wrap: balance;
}

.RhHero-tagline {
  margin: 18px 0 0;
  max-width: 34em;
  color: var(--rh-muted);
  font-size: clamp(16px, 1.25vw, 18px);
  line-height: 1.8;
  text-wrap: pretty;
}

.RhHero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 36px;
}

.RhHero-coord {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
  margin-top: 28px;
  padding: 8px 10px 8px 8px;
  border: 1px solid var(--rh-line);
  border-radius: 10px;
  background: color-mix(in srgb, var(--rh-surface) 80%, transparent);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: var(--rh-ink-2);
  cursor: pointer;
  transition: border-color 160ms ease;
}

.RhHero-coord:hover {
  border-color: var(--rh-brand);
}

.RhHero-coord:focus-visible {
  outline: 2px solid var(--rh-brand);
  outline-offset: 3px;
}

.RhHero-coordTag {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--rh-brand-soft);
  color: var(--rh-brand);
  font-size: 12px;
  font-weight: 700;
}

.RhHero-coord code {
  overflow: hidden;
  color: inherit;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.RhHero-coordState {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  color: var(--rh-muted);
}

.RhHero-coordDone {
  color: var(--rh-brand);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.RhHero-mark {
  position: relative;
  justify-self: center;
  width: clamp(220px, 25vw, 360px);
  aspect-ratio: 1;
}

.RhHero-logo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.RhHero-logo.is-dark,
.dark .RhHero-logo.is-light {
  display: none;
}

.dark .RhHero-logo.is-dark {
  display: block;
}

@media (prefers-reduced-motion: no-preference) {
  .RhHero-name,
  .RhHero-headline,
  .RhHero-tagline,
  .RhHero-actions,
  .RhHero-coord {
    animation: rh-rise 900ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .RhHero-headline { animation-delay: 80ms; }
  .RhHero-tagline { animation-delay: 160ms; }
  .RhHero-actions { animation-delay: 240ms; }
  .RhHero-coord { animation-delay: 320ms; }

  .RhHero-mark {
    animation: rh-land 760ms 60ms cubic-bezier(0.34, 1.45, 0.5, 1) both;
  }
}

@keyframes rh-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
}

@keyframes rh-land {
  from {
    opacity: 0;
    transform: scale(0.82) rotate(-4deg);
  }
}

@media (max-width: 959px) {
  .RhHero {
    min-height: 0;
    padding-top: calc(var(--vp-nav-height) + 56px);
    padding-bottom: 72px;
  }

  .RhHero-inner {
    grid-template-columns: minmax(0, 1fr) 200px;
    gap: 24px;
  }

  .RhHero-mark {
    width: 200px;
  }
}

@media (max-width: 719px) {
  .RhHero {
    padding-top: calc(var(--vp-nav-height) + 32px);
    padding-bottom: 56px;
  }

  .RhHero-inner {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .RhHero-mark {
    grid-row: 1;
    justify-self: start;
    width: 96px;
    margin-bottom: 28px;
  }

  .RhHero-field {
    -webkit-mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
    mask-image: linear-gradient(to bottom, #000 0%, rgba(0, 0, 0, 0.5) 45%, transparent 100%);
  }

  .RhHero-headline {
    margin-top: 20px;
  }

  .RhHero-actions {
    margin-top: 28px;
  }

  .RhHero-coord code {
    font-size: 13px;
  }
}
</style>
