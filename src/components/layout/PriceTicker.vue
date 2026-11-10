<script setup lang="ts">
import { defineProps } from 'vue'
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { TrendingDown, TrendingUp, Minus } from 'lucide-vue-next'
import { changeTone, formatChange, formatPrice, POOL_URL, usePrice } from '@/composables/usePrice'
import TimeAgo from '@/components/ui/TimeAgo.vue'

const props = defineProps<{ strip?: boolean }>()
const { ticker, error, change24h } = usePrice()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))

const tone = computed(() => changeTone(change24h.value))
const icon = computed(() => (change24h.value === null || change24h.value === 0 ? Minus : change24h.value > 0 ? TrendingUp : TrendingDown))
const changeLabel = computed(() => formatChange(change24h.value))
const updatedUnix = computed(() => (ticker.value?.updatedAt ? Math.floor(new Date(ticker.value.updatedAt).getTime() / 1000) : undefined))
</script>

<template>
  <div v-if="ticker" ref="root" class="relative" :class="props.strip && 'flex justify-end'">
    <button class="btn-ghost text-xs mono" :class="[error && 'opacity-60', props.strip ? '!py-1 !px-2 !border-0 !bg-transparent' : '!py-1.5 !px-2.5']" @click="open = !open" :data-testid="props.strip ? 'price-ticker-strip-btn' : 'price-ticker-btn'" :title="$t('price.title')">
      <span class="eyebrow text-[10px] text-muted">STH/USD</span>
      <span class="font-semibold" data-testid="price-ticker-value">{{ formatPrice(ticker.price) }}</span>
      <span class="inline-flex items-center gap-0.5 font-semibold" :class="tone" data-testid="price-ticker-change">
        <component :is="icon" class="h-3 w-3" />{{ changeLabel }}
      </span>
    </button>
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="open" class="absolute end-0 mt-2 w-64 card p-3 z-50 text-xs space-y-2" data-testid="price-ticker-menu">
        <div class="flex items-baseline justify-between">
          <span class="eyebrow text-[10px] text-muted">STH / USD</span>
          <span class="mono font-semibold text-sm">{{ formatPrice(ticker.price) }}</span>
        </div>
        <div class="flex justify-between"><span class="text-muted">{{ $t('price.change24h') }}</span><span class="mono font-semibold" :class="tone">{{ changeLabel }}</span></div>
        <div v-if="ticker.high24h && ticker.low24h" class="flex justify-between"><span class="text-muted">{{ $t('price.range24h') }}</span><span class="mono">{{ formatPrice(ticker.low24h) }} – {{ formatPrice(ticker.high24h) }}</span></div>
        <div v-if="change24h === null" class="text-[11px] text-muted leading-snug">{{ $t('price.noHistory') }}</div>
        <div v-if="error" class="text-[11px] text-warn leading-snug" data-testid="price-ticker-stale">{{ $t('price.stale') }}</div>
        <div class="flex justify-between pt-1 border-t hair text-[11px] text-muted">
          <span>{{ $t('price.updated') }} <TimeAgo v-if="updatedUnix" :unix="updatedUnix" /></span>
          <a :href="POOL_URL" target="_blank" rel="noopener" class="hover:text-fg underline decoration-dotted" data-testid="price-ticker-source">{{ $t('price.source') }}</a>
        </div>
      </div>
    </Transition>
  </div>
</template>
