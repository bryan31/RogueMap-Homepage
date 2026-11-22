<script setup lang="ts">
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'

const content = useHomeContent()
</script>

<template>
  <section class="RhSection RhStructs">
    <div class="RhWrap">
      <header class="RhHead">
        <h2 class="RhTitle"><span v-for="(p, i) in phrases(content.structures.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
        <p class="RhLead">{{ content.structures.lead }}</p>
      </header>

      <div class="RhTable" role="table" :aria-label="content.structures.title">
        <div class="RhTable-row RhTable-row--head" role="row">
          <span v-for="h in content.structures.head" :key="h" role="columnheader">{{ h }}</span>
        </div>
        <a
          v-for="row in content.structures.rows"
          :key="row.type"
          class="RhTable-row"
          role="row"
          :href="withBase(row.link)"
        >
          <span class="RhTable-type" role="cell"><code>{{ row.type }}</code></span>
          <span class="RhTable-scene" role="cell">{{ row.scenario }}</span>
          <span class="RhTable-ops" role="cell">
            <code v-for="op in row.ops" :key="op">{{ op }}</code>
          </span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhTable {
  border-top: 1px solid var(--rh-line-strong);
}

.RhTable-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding: 20px 16px;
  border-bottom: 1px solid var(--rh-line);
  color: var(--rh-ink-2);
  text-decoration: none;
  transition: background-color 160ms ease;
}

.RhTable-row--head {
  padding-top: 14px;
  padding-bottom: 14px;
  color: var(--rh-muted);
  font-size: 13px;
  font-weight: 600;
}

a.RhTable-row::before {
  content: '';
  position: absolute;
  top: -1px;
  bottom: -1px;
  left: 0;
  width: 3px;
  background: var(--rh-rogue);
  transform: scaleY(0);
  transition: transform 200ms ease;
}

a.RhTable-row:hover {
  background: var(--rh-brand-soft);
}

a.RhTable-row:hover::before,
a.RhTable-row:focus-visible::before {
  transform: scaleY(1);
}

a.RhTable-row:focus-visible {
  outline: 2px solid var(--rh-brand);
  outline-offset: -2px;
}

.RhTable-type code {
  color: var(--rh-ink);
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  font-weight: 600;
}

.RhTable-scene {
  font-size: 15px;
}

.RhTable-ops {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.RhTable-ops code {
  padding: 3px 9px;
  border: 1px solid var(--rh-line);
  border-radius: 6px;
  background: var(--rh-surface);
  color: var(--rh-brand);
  font-family: var(--vp-font-family-mono);
  font-size: 12.5px;
}

@media (max-width: 767px) {
  .RhTable-row--head {
    display: none;
  }

  .RhTable-row {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 18px 12px;
  }
}
</style>
