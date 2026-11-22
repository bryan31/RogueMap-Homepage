<script setup lang="ts">
import { withBase } from 'vitepress'
import { phrases, useHomeContent } from './content'
import { useCopy } from './useCopy'

const content = useHomeContent()
const { copied, copy } = useCopy()
</script>

<template>
  <section class="RhSection RhSkill">
    <div class="RhWrap">
      <div class="RhSkill-band">
        <div class="RhSkill-copy">
          <h2 class="RhTitle"><span v-for="(p, i) in phrases(content.skill.title)" :key="i" class="RhPhrase">{{ p }}</span></h2>
          <p class="RhLead">{{ content.skill.lead }}</p>
          <p class="RhSkill-agents">
            <span>{{ content.skill.agentsLabel }}</span>
            <span v-for="a in content.skill.agents" :key="a" class="RhSkill-agent">{{ a }}</span>
          </p>
        </div>

        <div class="RhSkill-side">
          <div class="RhTerm">
            <code class="RhTerm-line"><span class="RhTerm-prompt" aria-hidden="true">$</span>{{ content.skill.command }}</code>
            <button
              type="button"
              class="RhTerm-copy"
              :aria-label="content.skill.copyLabel"
              @click="copy(content.skill.command)"
            >
              <span aria-live="polite">{{ copied ? content.skill.copied : content.skill.copyLabel }}</span>
            </button>
          </div>
          <a class="RhLink RhSkill-link" :href="withBase(content.skill.link)">{{ content.skill.linkText }}</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.RhSkill-band {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: 48px;
  padding: 56px;
  border-radius: 20px;
  background: var(--rh-panel);
  color: var(--rh-panel-ink);
}

/* 从右下角冲出面板的橙色破壁块，与 Logo 同一语汇 */
.RhSkill-band::after {
  content: '';
  position: absolute;
  right: -22px;
  bottom: -22px;
  width: 84px;
  height: 84px;
  background: var(--rh-rogue);
  clip-path: polygon(0 0, 75% 25%, 100% 100%, 25% 75%);
  pointer-events: none;
}

.RhSkill-band .RhTitle {
  color: var(--rh-panel-ink);
}

.RhSkill-band .RhLead {
  color: var(--rh-panel-muted);
}

.RhSkill-agents {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 26px 0 0;
  color: var(--rh-panel-muted);
  font-size: 13px;
}

.RhSkill-agent {
  padding: 4px 10px;
  border: 1px solid var(--rh-panel-line);
  border-radius: 6px;
  color: var(--rh-panel-ink);
  font-weight: 600;
}

.RhSkill-side {
  position: relative;
  z-index: 1;
  min-width: 0;
}

.RhTerm {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 22px 18px;
  border: 1px solid var(--rh-panel-line);
  border-radius: 12px;
  background: var(--rh-panel-deep);
}

.RhTerm-line {
  display: block;
  overflow-x: auto;
  color: var(--rh-panel-ink);
  font-family: var(--vp-font-family-mono);
  font-size: 15px;
  line-height: 1.6;
  white-space: nowrap;
}

.RhTerm-prompt {
  margin-right: 12px;
  color: var(--rh-rogue);
  user-select: none;
}

.RhTerm-copy {
  align-self: flex-start;
  padding: 7px 14px;
  border-radius: 8px;
  background: var(--rh-panel-ink);
  color: var(--rh-panel);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease;
}

.RhTerm-copy:hover {
  opacity: 0.9;
}

.RhTerm-copy:active {
  transform: translateY(1px);
}

.RhTerm-copy:focus-visible {
  outline: 2px solid var(--rh-rogue);
  outline-offset: 3px;
}

.RhSkill-link {
  margin-top: 18px;
  color: var(--rh-panel-ink);
}

@media (max-width: 959px) {
  .RhSkill-band {
    grid-template-columns: 1fr;
    gap: 32px;
    padding: 40px 32px 56px;
  }
}

@media (max-width: 639px) {
  .RhSkill-band {
    padding: 32px 20px 56px;
    border-radius: 16px;
  }

  .RhSkill-band::after {
    right: -10px;
    bottom: -14px;
    width: 60px;
    height: 60px;
  }

  .RhTerm-line {
    font-size: 13px;
  }
}
</style>
