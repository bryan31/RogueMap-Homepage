<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import {
  BrainCircuit,
  ChartNoAxesCombined,
  Database,
  Gauge
} from '@lucide/vue'

const { frontmatter } = useData()

const featureIcons = [Database, BrainCircuit, Gauge, ChartNoAxesCombined]
const features = computed(() => frontmatter.value.features ?? [])
</script>

<template>
  <section v-if="features.length" class="RogueHomeFeatures" aria-label="核心能力">
    <div class="RogueHomeFeatures-grid">
      <article
        v-for="(feature, index) in features"
        :key="feature.title"
        class="RogueHomeFeature"
      >
        <component
          :is="featureIcons[index]"
          class="RogueHomeFeature-icon"
          :size="28"
          :stroke-width="1.7"
          aria-hidden="true"
        />
        <h2 v-html="feature.title"></h2>
        <p v-html="feature.details"></p>
      </article>
    </div>
  </section>
</template>
