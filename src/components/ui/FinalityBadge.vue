<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck, Clock } from 'lucide-vue-next'
import Pill from './Pill.vue'
import { formatNumber } from '@/utils/format'
import { useChainStore } from '@/stores/chain'
import { useNetworkStore } from '@/stores/network'

const props = defineProps<{ finalized: boolean | undefined; compact?: boolean; confirmations?: number | null }>()
const { t } = useI18n()
const chain = useChainStore()
const net = useNetworkStore()
// without a SHIP-35 certificate a full round of confirmations is the practical "safe" threshold
const target = computed(() => chain.metrics?.finality?.activeDelegates ?? net.current.activeDelegates)
const pct = computed(() => Math.min(1, (props.confirmations ?? 0) / Math.max(1, target.value)))
const roundSafe = computed(() => !props.finalized && props.confirmations != null && props.confirmations >= target.value)
const R = 5
const C = 2 * Math.PI * R
// long confirmation counts add noise – past two rounds the ring alone tells the story
const SHOW_COUNT_BELOW = 42
const title = computed(() => {
  if (props.finalized) return t('common.finalizedHint')
  if (props.confirmations == null) return t('common.pending')
  return roundSafe.value ? t('common.roundSafeHint', { n: formatNumber(props.confirmations), total: target.value }) : t('common.finalityProgress', { n: formatNumber(props.confirmations), total: target.value })
})
</script>

<template>
  <Pill :tone="finalized ? 'ok' : roundSafe ? 'cyan' : 'neutral'" :glow="finalized" data-testid="finality-badge" :title="title" :data-progress="!finalized && confirmations != null ? Math.round(pct * 100) : undefined">
    <ShieldCheck v-if="finalized" class="h-3 w-3" />
    <svg v-else-if="confirmations != null" viewBox="0 0 14 14" class="h-3 w-3 -rotate-90 shrink-0" data-testid="finality-ring">
      <circle cx="7" cy="7" :r="R" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="2" />
      <circle cx="7" cy="7" :r="R" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - pct)" class="transition-[stroke-dashoffset] duration-700 ease-out" />
    </svg>
    <Clock v-else class="h-3 w-3" />
    <span v-if="!finalized && confirmations != null && confirmations < SHOW_COUNT_BELOW" class="mono tabular-nums" data-testid="finality-confirmations">{{ compact ? formatNumber(confirmations) : $t('common.confirmationsN', confirmations) }}</span>
    <span v-else-if="!compact">{{ finalized ? $t('common.finalized') : confirmations != null ? $t('common.confirmed') : $t('common.pending') }}</span>
  </Pill>
</template>
