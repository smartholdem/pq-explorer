<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, ref } from 'vue'

export interface BarPoint { label: string; value: number; title?: string }
const props = withDefaults(defineProps<{ points: BarPoint[]; color?: string; height?: number; format?: (v: number) => string }>(), { color: 'rgb(var(--c-cyan))', height: 120 })
const W = 100
const max = computed(() => Math.max(1, ...props.points.map((p) => p.value)))
const gap = 1.5
const bw = computed(() => (W - gap * (props.points.length - 1)) / Math.max(1, props.points.length))
const hover = ref<number | null>(null)
const fmt = (v: number) => (props.format ? props.format(v) : v.toLocaleString('en-US'))
</script>

<template>
  <div class="relative" data-testid="bar-chart">
    <svg :viewBox="`0 0 ${W} 100`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${height}px` }">
      <line v-for="y in [25, 50, 75]" :key="y" x1="0" :y1="y" :x2="W" :y2="y" stroke="rgb(var(--c-line) / 0.08)" stroke-width="0.3" />
      <g v-for="(p, i) in points" :key="i" @mouseenter="hover = i" @mouseleave="hover = null">
        <rect :x="i * (bw + gap)" :y="0" :width="bw" height="100" fill="transparent" />
        <rect
          :x="i * (bw + gap)" :y="100 - (p.value / max) * 96" :width="bw" :height="Math.max(0.8, (p.value / max) * 96)"
          :fill="color" :opacity="hover === null || hover === i ? 0.9 : 0.45" rx="0.6"
          class="transition-opacity duration-200"
        />
      </g>
    </svg>
    <div class="flex justify-between mt-1.5 text-[10px] mono text-muted">
      <span v-for="(p, i) in points" :key="i" class="flex-1 text-center truncate" :class="hover === i && 'text-fg'">{{ p.label }}</span>
    </div>
    <Transition enter-active-class="transition duration-100" enter-from-class="opacity-0" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="hover !== null" class="absolute top-0 end-0 card !rounded-lg px-2.5 py-1.5 text-xs pointer-events-none" data-testid="bar-tooltip">
        <div class="eyebrow text-[9px]">{{ points[hover].title ?? points[hover].label }}</div>
        <div class="mono font-semibold">{{ fmt(points[hover].value) }}</div>
      </div>
    </Transition>
  </div>
</template>
