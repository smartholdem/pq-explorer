<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { TrendingUp, TrendingDown, ShoppingBag } from 'lucide-vue-next'
import type { Token } from '@/api/types'
import { useTokenMarket } from '@/composables/useTokenMarket'
import TokenLogo from './TokenLogo.vue'
import Amount from '@/components/ui/Amount.vue'
import Pill from '@/components/ui/Pill.vue'
import PriceSparkline from '@/components/ui/PriceSparkline.vue'
import { formatNumber } from '@/utils/format'

const props = defineProps<{ token: Token }>()
const m = useTokenMarket(() => props.token)
</script>

<template>
  <RouterLink :to="`/token/${token.id}?tab=market`" class="card p-4 flex flex-col gap-3 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-cyan/40" data-testid="token-market-card">
    <div class="flex items-center gap-3">
      <TokenLogo :token-key="token.id" :symbol="token.symbol" :size="40" />
      <div class="min-w-0 flex-1">
        <div class="font-display font-semibold text-lg leading-tight" data-testid="token-market-symbol">{{ token.symbol }}</div>
        <div class="text-xs text-muted truncate">{{ token.meta?.name ?? token.id.slice(0, 12) + '…' }}</div>
      </div>
      <Pill v-if="token.sobj?.forSale" tone="brand" :title="$t('tmarket.sobjForSale')"><ShoppingBag class="h-3 w-3" /></Pill>
    </div>
    <div class="flex items-end justify-between gap-3">
      <div class="min-w-0">
        <div class="eyebrow text-[10px]">{{ $t('tmarket.bestAsk') }}</div>
        <div v-if="m.best.loading.value && !m.best.data.value" class="skeleton h-6 w-24 mt-1"></div>
        <div v-else class="font-display text-xl font-semibold" data-testid="token-market-price">
          <Amount v-if="m.bestPrice.value !== null" :value="m.bestPrice.value.toString()" />
          <span v-else class="text-muted text-sm">{{ $t('tmarket.noAsks') }}</span>
        </div>
      </div>
      <span v-if="m.change.value !== null" class="inline-flex items-center gap-1 text-xs font-semibold mono" :class="m.change.value >= 0 ? 'text-ok' : 'text-bad'" data-testid="token-market-change">
        <component :is="m.change.value >= 0 ? TrendingUp : TrendingDown" class="h-3.5 w-3.5" />{{ m.change.value >= 0 ? '+' : '' }}{{ m.change.value.toFixed(2) }}%
      </span>
    </div>
    <PriceSparkline :points="m.spark.value" :height="36" :tooltip="false" />
    <div class="grid grid-cols-2 gap-2 text-[11px] text-muted border-t hair pt-2">
      <div>{{ $t('tmarket.volume24') }}<div class="mono text-fg"><Amount :value="m.value.value.toString()" :max-frac="2" /></div></div>
      <div class="text-end">{{ $t('tmarket.trades24') }}<div class="mono text-fg">{{ formatNumber(m.trades.value) }}</div></div>
    </div>
  </RouterLink>
</template>
