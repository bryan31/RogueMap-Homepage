<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import {
  Bot,
  BrainCircuit,
  ChartNoAxesCombined,
  Database,
  Gauge
} from '@lucide/vue'

const { frontmatter, lang } = useData()

const featureIcons = [Database, BrainCircuit, Gauge, ChartNoAxesCombined, Bot]
const features = computed(() => frontmatter.value.features ?? [])
const sectionLabel = computed(() =>
  lang.value.startsWith('zh') ? '核心能力' : 'Core capabilities'
)
const linkText = computed(() =>
  lang.value.startsWith('zh') ? '了解详情' : 'Learn more'
)
</script>

<template>
  <section v-if="features.length" class="RogueHomeFeatures" :aria-label="sectionLabel">
    <div class="RogueHomeFeatures-grid">
      <component
        :is="feature.link ? 'a' : 'article'"
        v-for="(feature, index) in features"
        :key="feature.title"
        :href="feature.link"
        class="RogueHomeFeature"
        :class="{ 'is-link': feature.link }"
      >
        <span class="RogueHomeFeature-iconWrap" aria-hidden="true">
          <component
            :is="featureIcons[index]"
            class="RogueHomeFeature-icon"
            :size="22"
            :stroke-width="1.8"
          />
        </span>
        <h2 v-html="feature.title"></h2>
        <p v-html="feature.details"></p>
        <span v-if="feature.link" class="RogueHomeFeature-more">
          {{ linkText }}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </span>
      </component>
    </div>
  </section>
</template>
