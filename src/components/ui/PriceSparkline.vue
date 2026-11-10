<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import type { Sample } from '@/composables/usePrice'
import { formatPrice } from '@/composables/usePrice'
import { formatDate } from '@/utils/format'

const props = withDefaults(defineProps<{ points: Sample[]; height?: number; tooltip?: boolean }>(), { height: 48, tooltip: true })
const W = 100
const H = 32
const up = computed(() => props.points.length < 2 || props.points[props.points.length - 1].p >= props.points[0].p)
const color = computed(() => (up.value ? 'rgb(var(--c-ok))' : 'rgb(var(--c-bad))'))
const xy = computed(() => {
  const pts = props.points
  if (!pts.length) return [] as { x: number; y: number }[]
  const t0 = pts[0].t, t1 = pts[pts.length - 1].t || t0 + 1
  const lo = Math.min(...pts.map((s) => s.p)), hi = Math.max(...pts.map((s) => s.p))
  const span = hi - lo || hi * 0.02 || 1
  return pts.map((s) => ({ x: t1 === t0 ? W / 2 : ((s.t - t0) / (t1 - t0)) * W, y: 2 + (H - 4) * (1 - (s.p - (lo - span * 0.1)) / (span * 1.2)) }))
})
const line = computed(() => xy.value.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '))
const area = computed(() => (xy.value.length ? `${xy.value[0].x},${H} ${line.value} ${xy.value[xy.value.length - 1].x},${H}` : ''))
const hover = ref<number | null>(null)
const onMove = (e: MouseEvent) => {
  if (!props.tooltip || !xy.value.length) return
  const r = (e.currentTarget as SVGElement).getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * W
  let best = 0
  xy.value.forEach((p, i) => { if (Math.abs(p.x - x) < Math.abs(xy.value[best].x - x)) best = i })
  hover.value = best
}
const gid = `spark-${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <div class="relative" data-testid="price-sparkline">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${height}px` }" @mousemove="onMove" @mouseleave="hover = null">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <template v-if="xy.length >= 2">
        <polygon :points="area" :fill="`url(#${gid})`" />
        <polyline :points="line" fill="none" :stroke="color" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        <line v-if="hover !== null" :x1="xy[hover].x" y1="0" :x2="xy[hover].x" :y2="H" :stroke="color" stroke-width="0.6" stroke-dasharray="1.5 1.5" vector-effect="non-scaling-stroke" />
        <circle v-if="hover !== null" :cx="xy[hover].x" :cy="xy[hover].y" r="1.4" :fill="color" />
      </template>
      <line v-else x1="0" :y1="H / 2" :x2="W" :y2="H / 2" stroke="rgb(var(--c-line) / 0.25)" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
    </svg>
    <Transition enter-active-class="transition duration-100" enter-from-class="opacity-0" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="hover !== null && points[hover]" class="absolute -top-1 end-0 card !rounded-lg px-2 py-1 text-[11px] pointer-events-none" data-testid="sparkline-tooltip">
        <div class="mono font-semibold">{{ formatPrice(points[hover].p) }} <span class="text-muted">USD</span></div>
        <div class="text-muted">{{ formatDate(Math.floor(points[hover].t / 1000)) }}</div>
      </div>
    </Transition>
  </div>
</template>
