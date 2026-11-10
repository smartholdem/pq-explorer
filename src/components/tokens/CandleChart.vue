<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { formatDate } from '@/utils/format'

export interface Candle { t: number; o: number; h: number; l: number; c: number; v: number; n: number }
const props = withDefaults(defineProps<{ candles: Candle[]; symbol: string; quote: string; height?: number }>(), { height: 240 })
const W = 1000
const H = 100
const VOL_H = 22
const fmt = (x: number) => (x === 0 ? '0' : x >= 1 ? x.toLocaleString('en-US', { maximumFractionDigits: 4 }) : x.toPrecision(4))

const view = computed(() => {
  const cs = props.candles
  if (!cs.length) return null
  const lo = Math.min(...cs.map((c) => c.l)), hi = Math.max(...cs.map((c) => c.h))
  const span = hi - lo || hi * 0.05 || 1
  const vmax = Math.max(...cs.map((c) => c.v)) || 1
  const step = W / cs.length
  const y = (p: number) => 4 + (H - VOL_H - 10) * (1 - (p - (lo - span * 0.05)) / (span * 1.1))
  return {
    lo, hi,
    items: cs.map((c, i) => ({
      x: i * step + step / 2, w: Math.max(1.5, step * 0.62), up: c.c >= c.o,
      yo: y(c.o), yc: y(c.c), yh: y(c.h), yl: y(c.l), vh: (c.v / vmax) * VOL_H,
    })),
  }
})
const hover = ref<number | null>(null)
const onMove = (e: MouseEvent) => {
  if (!view.value) return
  const r = (e.currentTarget as SVGElement).getBoundingClientRect()
  hover.value = Math.min(props.candles.length - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * props.candles.length)))
}
const hc = computed(() => (hover.value !== null ? props.candles[hover.value] : props.candles[props.candles.length - 1]))
</script>

<template>
  <div class="relative" data-testid="candle-chart">
    <div v-if="hc" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mono text-muted mb-2" data-testid="candle-legend">
      <span>{{ formatDate(hc.t) }}</span>
      <span>O <b class="text-fg">{{ fmt(hc.o) }}</b></span><span>H <b class="text-ok">{{ fmt(hc.h) }}</b></span>
      <span>L <b class="text-bad">{{ fmt(hc.l) }}</b></span><span>C <b class="text-fg">{{ fmt(hc.c) }}</b> {{ quote }}</span>
      <span>{{ $t('tmarket.volume') }} <b class="text-fg">{{ fmt(hc.v) }}</b> {{ symbol }}</span><span>{{ $t('tmarket.tradesN', { n: hc.n }) }}</span>
    </div>
    <svg v-if="view" :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${height}px` }" @mousemove="onMove" @mouseleave="hover = null">
      <g v-for="(it, i) in view.items" :key="i" :opacity="hover === null || hover === i ? 1 : 0.55">
        <rect :x="it.x - it.w / 2" :y="H - it.vh" :width="it.w" :height="it.vh" :fill="it.up ? 'rgb(var(--c-ok) / 0.25)' : 'rgb(var(--c-bad) / 0.25)'" />
        <line :x1="it.x" :x2="it.x" :y1="it.yh" :y2="it.yl" :stroke="it.up ? 'rgb(var(--c-ok))' : 'rgb(var(--c-bad))'" stroke-width="1" vector-effect="non-scaling-stroke" />
        <rect :x="it.x - it.w / 2" :y="Math.min(it.yo, it.yc)" :width="it.w" :height="Math.max(0.6, Math.abs(it.yo - it.yc))" :fill="it.up ? 'rgb(var(--c-ok))' : 'rgb(var(--c-bad))'" />
      </g>
    </svg>
    <div v-else class="flex items-center justify-center text-sm text-muted border border-dashed hair rounded-xl" :style="{ height: `${height}px` }" data-testid="candle-empty">{{ $t('tmarket.noTrades') }}</div>
    <div v-if="view" class="flex justify-between text-[10px] mono text-muted mt-1"><span>{{ $t('tmarket.low') }} {{ fmt(view.lo) }}</span><span>{{ $t('tmarket.high') }} {{ fmt(view.hi) }} {{ quote }}</span></div>
  </div>
</template>
