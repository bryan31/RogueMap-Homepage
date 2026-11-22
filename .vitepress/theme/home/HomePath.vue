<script setup lang="ts">
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'

const content = useHomeContent()
</script>

<template>
  <section class="RhSection RhPath">
    <div class="RhWrap">
      <h2 class="RhTitle RhPath-title"><span v-for="(p, i) in phrases(content.path.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
      <ol class="RhSteps">
        <li v-for="(step, i) in content.path.steps" :key="step.link" class="RhStep">
          <a :href="withBase(step.link)" class="RhStep-link">
            <span class="RhStep-num" aria-hidden="true">{{ i + 1 }}</span>
            <span class="RhStep-title">{{ step.title }}</span>
            <span class="RhStep-desc">{{ step.desc }}</span>
          </a>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.RhPath-title {
  margin-bottom: 40px;
}

.RhSteps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* 贯穿五个步骤的路径线 */
.RhSteps::before {
  content: '';
  position: absolute;
  top: 17px;
  right: 0;
  left: 18px;
  height: 2px;
  background: linear-gradient(90deg, var(--rh-brand), var(--rh-line) 80%);
}

.RhStep-link {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 8px;
  color: var(--rh-ink);
  text-decoration: none;
}

.RhStep-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 14px;
  border: 2px solid var(--rh-brand);
  border-radius: 8px;
  background: var(--rh-bg);
  color: var(--rh-brand);
  font-family: var(--rh-display);
  font-size: 15px;
  font-weight: 800;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}

.RhStep:first-child .RhStep-num {
  background: var(--rh-brand);
  color: var(--rh-brand-ink);
}

.RhStep-title {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

.RhStep-desc {
  color: var(--rh-muted);
  font-size: 13.5px;
  line-height: 1.6;
}

.RhStep-link:hover .RhStep-num,
.RhStep-link:focus-visible .RhStep-num {
  border-color: var(--rh-rogue);
  background: var(--rh-rogue);
  color: #1a1200;
}

.RhStep-link:hover .RhStep-title {
  color: var(--rh-brand);
}

.RhStep-link:focus-visible {
  outline: 2px solid var(--rh-brand);
  outline-offset: 6px;
  border-radius: 4px;
}

@media (max-width: 959px) {
  .RhSteps {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .RhSteps::before {
    display: none;
  }

  /* 竖排时每一步单独画到下一步的连接线 */
  .RhStep:not(:last-child) .RhStep-link::after {
    content: '';
    position: absolute;
    top: 36px;
    bottom: 0;
    left: 17px;
    width: 2px;
    background: var(--rh-line-strong);
  }

  .RhStep:first-child .RhStep-link::after {
    background: var(--rh-brand);
  }

  .RhStep:last-child .RhStep-link {
    padding-bottom: 0;
  }

  .RhStep-link {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr);
    column-gap: 18px;
    row-gap: 2px;
    padding: 0 0 26px;
  }

  .RhStep-num {
    grid-row: span 2;
    margin-bottom: 0;
  }
}
</style>
