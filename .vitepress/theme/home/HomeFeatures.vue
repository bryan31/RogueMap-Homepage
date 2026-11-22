<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'

const content = useHomeContent()
const f = computed(() => content.value.features)

// 8×8 = 64 段；固定图案，保证 SSR 与客户端一致
const LOCKED = new Set([5, 19, 30, 44, 58])
const READING = new Set([2, 9, 12, 22, 27, 33, 36, 41, 47, 50, 55, 61])
const segments = Array.from({ length: 64 }, (_, i) =>
  LOCKED.has(i) ? 'locked' : READING.has(i) ? 'reading' : 'idle'
)
</script>

<template>
  <section class="RhSection RhFeatures">
    <div class="RhWrap">
      <header class="RhHead">
        <h2 class="RhTitle"><span v-for="(p, i) in phrases(f.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
        <p class="RhLead">{{ f.lead }}</p>
      </header>

      <div class="RhBento">
        <!-- 1. 四种数据结构 -->
        <a class="RhCell RhCell--wide" :href="withBase(f.items[0].link)">
          <div class="RhViz RhViz--structs" aria-hidden="true">
            <div v-for="(s, i) in f.structures" :key="s.name" class="RhStruct" :class="`is-${i}`">
              <div class="RhStruct-art">
                <template v-if="i === 0">
                  <span v-for="n in 3" :key="n" class="kv"><i /><b /></span>
                </template>
                <template v-else-if="i === 1">
                  <span v-for="n in 5" :key="n" class="seq" />
                </template>
                <template v-else-if="i === 2">
                  <span v-for="n in 5" :key="n" class="dot" :class="`d${n}`" />
                </template>
                <template v-else>
                  <span class="lane"><span v-for="n in 4" :key="n" class="job" /></span>
                </template>
              </div>
              <span class="RhStruct-name">Rogue{{ s.name }}</span>
              <span class="RhStruct-hint">{{ s.hint }}</span>
            </div>
          </div>
          <h3 class="RhCell-title">{{ f.items[0].title }}</h3>
          <p class="RhCell-text">{{ f.items[0].details }}</p>
          <span class="RhCell-more">{{ f.more }}</span>
        </a>

        <!-- 2. RogueMemory 混合检索 -->
        <a class="RhCell" :href="withBase(f.items[1].link)">
          <div class="RhViz RhViz--memory" aria-hidden="true">
            <code class="RhQuery">{{ f.memory.query }}</code>
            <ul class="RhHits">
              <li v-for="r in f.memory.results" :key="r.text" class="RhHit">
                <span class="RhHit-text">{{ r.text }}</span>
                <span class="RhHit-score">{{ r.score.toFixed(2) }}</span>
                <span class="RhHit-bars">
                  <span class="v" :style="{ width: `${r.vector * 100}%` }" />
                  <span class="k" :style="{ width: `${r.keyword * 100}%` }" />
                </span>
              </li>
            </ul>
            <span class="RhLegend">
              <span><i class="v" />{{ f.memory.vector }}</span>
              <span><i class="k" />{{ f.memory.keyword }}</span>
            </span>
          </div>
          <h3 class="RhCell-title">{{ f.items[1].title }}</h3>
          <p class="RhCell-text">{{ f.items[1].details }}</p>
          <span class="RhCell-more">{{ f.more }}</span>
        </a>

        <!-- 3. 64 段分段锁 -->
        <a class="RhCell" :href="withBase(f.items[2].link)">
          <div class="RhViz RhViz--segments" aria-hidden="true">
            <div class="RhSegs">
              <span
                v-for="(s, i) in segments"
                :key="i"
                class="RhSeg"
                :class="`is-${s}`"
                :style="{ '--d': `${(i * 137) % 1600}ms` }"
              />
            </div>
            <div class="RhSegs-side">
              <span class="RhLegend RhLegend--stack">
                <span><i class="k" />{{ f.segments.locked }}</span>
                <span><i class="v" />{{ f.segments.reading }}</span>
              </span>
              <p class="RhSegs-cap">{{ f.segments.caption }}</p>
            </div>
          </div>
          <h3 class="RhCell-title">{{ f.items[2].title }}</h3>
          <p class="RhCell-text">{{ f.items[2].details }}</p>
          <span class="RhCell-more">{{ f.more }}</span>
        </a>

        <!-- 4. StorageMetrics -->
        <a class="RhCell RhCell--wide RhCell--metrics" :href="withBase(f.items[3].link)">
          <div class="RhViz RhViz--metrics" aria-hidden="true">
            <div class="RhMeter">
              <span class="RhMeter-label">{{ f.metrics.usage }}</span>
              <span class="RhMeter-track"><span class="RhMeter-fill usage" /></span>
              <span class="RhMeter-val"><span class="before">62%</span><span class="after">51%</span></span>
            </div>
            <div class="RhMeter">
              <span class="RhMeter-label">{{ f.metrics.fragmentation }}</span>
              <span class="RhMeter-track">
                <span class="RhMeter-fill frag" />
                <span class="RhMeter-mark"><em>{{ f.metrics.threshold }}</em></span>
              </span>
              <span class="RhMeter-val"><span class="before">34%</span><span class="after">4%</span></span>
            </div>
            <div class="RhMeter">
              <span class="RhMeter-label">{{ f.metrics.entries }}</span>
              <span class="RhMeter-count">1,000,000</span>
              <span class="RhMeter-badge">compact()</span>
            </div>
            <span class="RhMeter-hint">{{ f.metrics.hint }}</span>
          </div>
          <h3 class="RhCell-title">{{ f.items[3].title }}</h3>
          <p class="RhCell-text">{{ f.items[3].details }}</p>
          <span class="RhCell-more">{{ f.more }}</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhBento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.RhCell {
  grid-column: span 5;
  display: flex;
  flex-direction: column;
  padding: 28px;
  border: 1px solid var(--rh-line);
  border-radius: 16px;
  background: var(--rh-surface);
  color: var(--rh-ink);
  text-decoration: none;
  transition: border-color 180ms ease;
}

.RhCell--wide {
  grid-column: span 7;
}

.RhCell:hover {
  border-color: color-mix(in srgb, var(--rh-brand) 55%, var(--rh-line));
}

.RhCell:focus-visible {
  outline: 2px solid var(--rh-brand);
  outline-offset: 3px;
}

.RhCell-title {
  margin: 28px 0 0;
  color: var(--rh-ink);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
}

.RhCell-text {
  margin: 10px 0 0;
  max-width: 56ch;
  color: var(--rh-muted);
  font-size: 14.5px;
  line-height: 1.8;
  text-wrap: pretty;
}

.RhCell-more {
  margin-top: auto;
  padding-top: 18px;
  color: var(--rh-brand);
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 4px;
  transition: text-decoration-color 160ms ease;
}

.RhCell:hover .RhCell-more {
  text-decoration-color: currentColor;
}

/* ---------- 可视化区 ---------- */
.RhViz {
  position: relative;
  min-height: 176px;
  padding: 20px;
  border-radius: 12px;
  background: var(--rh-bg-2);
}

/* 1. 数据结构 */
.RhViz--structs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.RhStruct {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.RhStruct-art {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88px;
  margin-bottom: 10px;
  border: 1px solid var(--rh-line);
  border-radius: 10px;
  background: var(--rh-surface);
}

.RhStruct-name {
  overflow: hidden;
  color: var(--rh-ink);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  font-weight: 600;
  text-overflow: ellipsis;
}

.RhStruct-hint {
  color: var(--rh-muted);
  font-size: 12.5px;
}

.is-0 .RhStruct-art {
  flex-direction: column;
  gap: 6px;
}

.kv {
  display: flex;
  gap: 4px;
}

.kv i,
.kv b {
  display: block;
  height: 10px;
  border-radius: 2px;
}

.kv i {
  width: 14px;
  background: var(--rh-brand);
}

.kv b {
  width: 30px;
  background: var(--rh-line-strong);
}

.is-1 .RhStruct-art {
  gap: 3px;
}

.seq {
  width: 11px;
  height: 22px;
  border-radius: 2px;
  background: var(--rh-brand);
  opacity: calc(0.35 + var(--o, 0));
}

.seq:nth-child(2) { --o: 0.15; }
.seq:nth-child(3) { --o: 0.3; }
.seq:nth-child(4) { --o: 0.45; }
.seq:nth-child(5) { --o: 0.65; }

.is-2 .RhStruct-art {
  position: relative;
}

.dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--rh-brand);
}

.d1 { top: 22px; left: 28%; }
.d2 { top: 40px; left: 52%; }
.d3 { top: 58px; left: 32%; background: var(--rh-rogue); }
.d4 { top: 28px; left: 68%; }
.d5 { top: 54px; left: 62%; opacity: 0.55; }

.lane {
  display: flex;
  gap: 4px;
  padding: 6px;
  border: 1px dashed var(--rh-line-strong);
  border-radius: 6px;
}

.job {
  width: 12px;
  height: 18px;
  border-radius: 2px;
  background: var(--rh-brand);
}

.job:first-child {
  background: var(--rh-rogue);
}

@media (prefers-reduced-motion: no-preference) {
  .RhCell:hover .lane .job {
    animation: rh-poll 900ms cubic-bezier(0.5, 0, 0.2, 1) infinite;
  }

  .RhCell:hover .seq {
    animation: rh-pulse 900ms ease-in-out infinite;
    animation-delay: calc(var(--o, 0) * 600ms);
  }

  .RhCell:hover .dot {
    transition: transform 300ms ease;
    transform: scale(1.25);
  }
}

@keyframes rh-poll {
  50% { transform: translateX(-4px); }
}

@keyframes rh-pulse {
  50% { transform: scaleY(0.7); }
}

/* 2. 混合检索 */
.RhViz--memory {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.RhQuery {
  align-self: flex-start;
  max-width: 100%;
  overflow: hidden;
  padding: 6px 10px;
  border: 1px solid var(--rh-line);
  border-radius: 6px;
  background: var(--rh-surface);
  color: var(--rh-ink-2);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.RhHits {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.RhHit {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 5px 12px;
  font-size: 13px;
}

.RhHit-text {
  overflow: hidden;
  color: var(--rh-ink);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.RhHit-score {
  color: var(--rh-muted);
  font-family: var(--vp-font-family-mono);
  font-variant-numeric: tabular-nums;
}

.RhHit-bars {
  grid-column: 1 / -1;
  display: grid;
  gap: 3px;
}

.RhHit-bars span {
  display: block;
  height: 4px;
  border-radius: 2px;
}

.v {
  background: var(--rh-brand);
}

.k {
  background: var(--rh-rogue);
}

.RhLegend {
  display: flex;
  gap: 16px;
  color: var(--rh-muted);
  font-size: 12px;
}

.RhLegend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.RhLegend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
}

.RhLegend--stack {
  flex-direction: column;
  gap: 8px;
}

/* 3. 分段锁 */
.RhViz--segments {
  display: flex;
  align-items: center;
  gap: 20px;
}

.RhSegs {
  display: grid;
  grid-template-columns: repeat(8, 14px);
  gap: 4px;
  flex: none;
}

.RhSeg {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--rh-line-strong);
  opacity: 0.6;
}

.RhSeg.is-reading {
  background: var(--rh-brand);
  opacity: 1;
}

.RhSeg.is-locked {
  background: var(--rh-rogue);
  opacity: 1;
}

@media (prefers-reduced-motion: no-preference) {
  .RhCell:hover .RhSeg.is-reading,
  .RhCell:hover .RhSeg.is-locked {
    animation: rh-blink 1600ms var(--d) ease-in-out infinite;
  }
}

@keyframes rh-blink {
  50% { opacity: 0.25; }
}

.RhSegs-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.RhSegs-cap {
  margin: 0;
  color: var(--rh-muted);
  font-size: 12.5px;
  line-height: 1.6;
}

/* 4. 监控 */
.RhViz--metrics {
  display: grid;
  align-content: center;
  gap: 18px;
  padding-bottom: 34px;
}

.RhMeter {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr) 64px;
  align-items: center;
  gap: 14px;
  font-size: 13px;
}

.RhMeter-label {
  color: var(--rh-muted);
}

.RhMeter-track {
  position: relative;
  height: 10px;
  border-radius: 3px;
  background: var(--rh-surface);
  box-shadow: inset 0 0 0 1px var(--rh-line);
}

.RhMeter-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: 3px;
  transition: width 700ms cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms ease;
}

.RhMeter-fill.usage {
  width: 62%;
  background: var(--rh-brand);
}

.RhMeter-fill.frag {
  width: 34%;
  background: var(--rh-rogue);
}

.RhMeter-mark {
  position: absolute;
  top: -6px;
  bottom: -6px;
  left: 30%;
  width: 2px;
  background: var(--rh-ink);
  opacity: 0.55;
}

.RhMeter-mark em {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  color: var(--rh-muted);
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}

.RhMeter-val {
  position: relative;
  color: var(--rh-ink);
  font-family: var(--vp-font-family-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.RhMeter-val .after {
  position: absolute;
  right: 0;
  opacity: 0;
}

.RhMeter-val span {
  transition: opacity 300ms ease;
}

.RhMeter-count {
  color: var(--rh-ink);
  font-family: var(--vp-font-family-mono);
  font-variant-numeric: tabular-nums;
}

.RhMeter-badge {
  justify-self: end;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--rh-brand-soft);
  color: var(--rh-brand);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 300ms ease, transform 300ms ease;
}

.RhMeter-hint {
  position: absolute;
  right: 20px;
  bottom: 12px;
  color: var(--rh-muted);
  font-size: 11.5px;
  transition: opacity 200ms ease;
}

.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-fill.usage { width: 51%; }
.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-fill.frag { width: 4%; background: var(--rh-brand); }
.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-val .before { opacity: 0; }
.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-val .after { opacity: 1; }
.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-badge { opacity: 1; transform: none; }
.RhCell--metrics:is(:hover, :focus-visible) .RhMeter-hint { opacity: 0; }

@media (hover: none) {
  .RhMeter-hint {
    display: none;
  }
}

@media (max-width: 959px) {
  .RhCell,
  .RhCell--wide {
    grid-column: span 12;
  }
}

@media (max-width: 639px) {
  .RhBento {
    gap: 12px;
  }

  .RhCell {
    padding: 18px;
  }

  .RhViz {
    padding: 16px;
  }

  .RhViz--structs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .RhViz--segments {
    flex-direction: column;
    align-items: flex-start;
  }

  .RhMeter {
    grid-template-columns: 64px minmax(0, 1fr) 48px;
    gap: 10px;
  }
}
</style>
