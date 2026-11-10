<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
import { CandlestickChart, ExternalLink, Minus, TrendingDown, TrendingUp } from 'lucide-vue-next'
import PriceSparkline from '@/components/ui/PriceSparkline.vue'
import { changeFor, changeTone, formatChange, formatPrice, isServerSeries, POOL_URL, pointsFor, RANGE_LABEL, RANGES, usePrice, type Range } from '@/composables/usePrice'

// compact: full-width row inside the mobile status bar; default: stat-card look for the dashboard grid
const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })
const { ticker, serverSeries, localSamples, loadHistory } = usePrice()
const RANGE_KEY = 'sth.price.range'
const saved = localStorage.getItem(RANGE_KEY) as Range | null
const range = ref<Range>(saved && RANGES.includes(saved) ? saved : '24h')
watch(range, (r) => { localStorage.setItem(RANGE_KEY, r); void loadHistory(r) })
onMounted(() => { void loadHistory(range.value) })
// reads of serverSeries/localSamples/ticker keep the computed reactive to every source
const points = computed(() => (serverSeries.value, localSamples.value, pointsFor(range.value)))
const change = computed(() => (ticker.value, serverSeries.value, localSamples.value, changeFor(range.value)))
const icon = computed(() => (change.value === null || change.value === 0 ? Minus : change.value > 0 ? TrendingUp : TrendingDown))
const lo = computed(() => (points.value.length ? Math.min(...points.value.map((s) => s.p)) : null))
const hi = computed(() => (points.value.length ? Math.max(...points.value.map((s) => s.p)) : null))
const local = computed(() => (serverSeries.value, !isServerSeries(range.value)))
</script>

<template>
  <div v-if="ticker" class="card relative overflow-hidden animate-rise" :class="props.compact ? '!rounded-xl p-2.5' : 'card-hover p-5'" data-testid="price-card">
    <div v-if="!props.compact" class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-ok/60 to-transparent"></div>
    <div class="flex items-start justify-between gap-3">
      <div class="eyebrow" :class="props.compact && 'text-[10px]'">STH / USD</div>
      <CandlestickChart v-if="!props.compact" class="h-4 w-4 text-ok/70" />
    </div>
    <div class="flex items-end justify-between gap-3" :class="props.compact ? 'mt-0.5' : 'mt-2'">
      <div class="font-display font-semibold tracking-tight tabular-nums" :class="props.compact ? 'text-lg leading-tight' : 'text-2xl md:text-[28px]'" data-testid="price-card-value">{{ formatPrice(ticker.price) }}</div>
      <div class="text-end">
        <div class="inline-flex items-center gap-1 mono text-sm font-semibold" :class="changeTone(change)" data-testid="price-card-change"><component :is="icon" class="h-3.5 w-3.5" />{{ formatChange(change) }}</div>
        <div class="flex justify-end gap-0.5 mt-0.5" data-testid="price-card-range">
          <button v-for="r in RANGES" :key="r" class="px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-colors" :class="range === r ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="range = r" :data-testid="`price-range-${r}`">{{ RANGE_LABEL[r] }}</button>
        </div>
      </div>
    </div>
    <PriceSparkline :points="points" :height="props.compact ? 56 : 36" class="mt-1.5" />
    <div class="mt-1.5 flex items-center justify-between text-[10px] mono text-muted">
      <span v-if="points.length >= 2" data-testid="price-card-lowhigh" :title="local ? $t('price.localHint') : ''">L {{ formatPrice(lo!) }} · H {{ formatPrice(hi!) }}<span v-if="local" class="font-sans ms-1 opacity-70" data-testid="price-card-local">· {{ $t('price.local') }}</span></span>
      <span v-else class="font-sans" data-testid="price-card-collecting">{{ $t('price.collecting') }}</span>
      <a :href="POOL_URL" target="_blank" rel="noopener" class="inline-flex items-center gap-1 hover:text-fg font-sans" data-testid="price-card-source">XBTS Pool <ExternalLink class="h-2.5 w-2.5" /></a>
    </div>
  </div>
</template>
