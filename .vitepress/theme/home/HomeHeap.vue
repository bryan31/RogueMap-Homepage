<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'

const content = useHomeContent()
const active = ref(0)
const revealed = ref(false)
const panel = ref<HTMLElement>()
const tabRefs = ref<HTMLButtonElement[]>([])

const tab = computed(() => content.value.heap.tabs[active.value] ?? content.value.heap.tabs[0])
const max = computed(() => Math.max(...tab.value.rows.map((r) => r.value)))

function pct(value: number) {
  return `${Math.max(1.2, (value / max.value) * 100).toFixed(2)}%`
}

function select(i: number, focus = false) {
  const n = content.value.heap.tabs.length
  active.value = (i + n) % n
  if (focus) tabRefs.value[active.value]?.focus()
}

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (!panel.value) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        revealed.value = true
        observer?.disconnect()
      }
    },
    { threshold: 0.35 }
  )
  observer.observe(panel.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section class="RhSection RhHeap">
    <div class="RhWrap RhHeap-grid">
      <header class="RhHeap-head">
        <h2 class="RhTitle"><span v-for="(p, i) in phrases(content.heap.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
        <p class="RhLead">{{ content.heap.lead }}</p>
        <p class="RhHeap-foot">{{ content.heap.footnote }}</p>
        <a class="RhLink" :href="withBase(content.heap.moreLink)">{{ content.heap.moreText }}</a>
      </header>

      <div ref="panel" class="RhHeap-panel" :class="{ 'is-revealed': revealed }">
        <div class="RhTabs" role="tablist" :aria-label="content.heap.title">
          <button
            v-for="(t, i) in content.heap.tabs"
            :key="t.id"
            :ref="(el) => { if (el) tabRefs[i] = el as HTMLButtonElement }"
            type="button"
            role="tab"
            class="RhTabs-tab"
            :class="{ 'is-active': i === active }"
            :aria-selected="i === active"
            :aria-controls="`rh-heap-${t.id}`"
            :tabindex="i === active ? 0 : -1"
            @click="select(i)"
            @keydown.right.prevent="select(i + 1, true)"
            @keydown.left.prevent="select(i - 1, true)"
          >
            {{ t.label }}
          </button>
        </div>

        <div :id="`rh-heap-${tab.id}`" role="tabpanel" class="RhHeap-body">
          <p class="RhHeap-caption">{{ tab.caption }}</p>
          <ul class="RhHeap-bars">
            <li
              v-for="(row, i) in tab.rows"
              :key="i"
              class="RhBar"
              :class="{ 'is-hl': row.highlight }"
              :style="{ '--w': pct(row.value), '--i': i }"
            >
              <span class="RhBar-name">{{ row.name }}</span>
              <span class="RhBar-track" aria-hidden="true">
                <span class="RhBar-fill" />
              </span>
              <span class="RhBar-value">
                {{ row.display }}
                <small v-if="row.estimate">{{ content.heap.estimate }}</small>
              </span>
            </li>
          </ul>
          <p class="RhHeap-note">{{ tab.note }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhHeap-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 64px;
  align-items: start;
}

.RhHeap-head {
  position: sticky;
  top: calc(var(--vp-nav-height) + 40px);
}

.RhHeap-foot {
  margin: 28px 0 0;
  padding-top: 20px;
  border-top: 1px solid var(--rh-line);
  color: var(--rh-muted);
  font-size: 13px;
  line-height: 1.75;
}

.RhHeap-head .RhLink {
  margin-top: 14px;
}

.RhHeap-panel {
  padding: 28px 32px 30px;
  border: 1px solid var(--rh-line);
  border-radius: 16px;
  background: var(--rh-surface);
}

.RhHeap-body {
  margin-top: 26px;
}

.RhHeap-caption {
  margin: 0 0 18px;
  color: var(--rh-muted);
  font-size: 13px;
}

.RhHeap-bars {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.RhBar {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) 120px;
  align-items: center;
  gap: 16px;
  color: var(--rh-ink-2);
  font-size: 14px;
}

.RhBar-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.RhBar-track {
  position: relative;
  height: 14px;
  border-radius: 3px;
  background: var(--rh-bg-2);
  overflow: hidden;
}

.RhBar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0;
  border-radius: 3px;
  background: var(--rh-line-strong);
  transition: width 900ms cubic-bezier(0.16, 1, 0.3, 1);
  transition-delay: calc(var(--i) * 70ms);
}

.is-revealed .RhBar-fill {
  width: var(--w);
}

.RhBar.is-hl {
  color: var(--rh-ink);
}

.RhBar.is-hl .RhBar-fill {
  background: var(--rh-brand);
}

/* 高亮条尾部的橙色方块，呼应 Logo 的破壁块 */
.RhBar.is-hl .RhBar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--rh-rogue);
}

.RhBar-value {
  font-family: var(--vp-font-family-mono);
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.RhBar.is-hl .RhBar-value {
  font-weight: 700;
}

.RhBar-value small {
  display: block;
  color: var(--rh-muted);
  font-family: var(--vp-font-family-base);
  font-size: 11.5px;
  font-weight: 500;
}

.RhHeap-note {
  margin: 24px 0 0;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--rh-brand-soft);
  color: var(--rh-ink-2);
  font-size: 14px;
  line-height: 1.7;
}

@media (prefers-reduced-motion: reduce) {
  .RhBar-fill {
    width: var(--w);
    transition: none;
  }
}

@media (max-width: 959px) {
  .RhHeap-grid {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .RhHeap-head {
    position: static;
  }
}

@media (max-width: 639px) {
  .RhHeap-panel {
    padding: 20px 18px 22px;
  }

  .RhBar {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 6px;
    column-gap: 12px;
  }

  .RhBar-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .RhBar-value small {
    display: inline;
    margin-left: 4px;
  }
}
</style>
