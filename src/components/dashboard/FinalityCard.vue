<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ShieldCheck } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'
import Pill from '@/components/ui/Pill.vue'
import ShipLink from '@/components/ui/ShipLink.vue'
import { formatNumber, percent } from '@/utils/format'

const { t } = useI18n()
const chain = useChainStore()
const f = computed(() => chain.metrics?.finality)
const tipVotes = computed(() => f.value?.tipVotes ?? f.value?.heights?.[0]?.votes ?? 0)
const pct = computed(() => percent(tipVotes.value, f.value?.quorum ?? 1))
</script>

<template>
  <div class="card card-hover relative p-5 overflow-hidden animate-rise" data-testid="finality-card">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-ok/60 to-transparent"></div>
    <div class="flex items-start justify-between gap-3">
      <div class="eyebrow">{{ t('dashboard.finalityLabel') }} · <ShipLink :n="35" class="!text-ok/80" /></div>
      <ShieldCheck class="h-4 w-4 text-ok/70" />
    </div>
    <div v-if="!f" class="skeleton h-8 w-2/3 mt-3"></div>
    <template v-else>
      <div class="mt-2 flex items-center gap-2 flex-wrap">
        <Pill :tone="f.enabled ? (f.hard ? 'ok' : 'cyan') : 'neutral'">{{ f.enabled ? (f.hard ? t('dashboard.hard') : t('dashboard.soft')) : t('dashboard.notEnabled') }}</Pill>
        <span class="mono text-[11px] text-muted">{{ t('dashboard.quorum') }} {{ f.quorum }}/{{ f.activeDelegates }}</span>
      </div>
      <div class="mt-3 font-display text-2xl font-semibold tabular-nums" data-testid="finalized-height">
        {{ f.finalizedHeight ? formatNumber(f.finalizedHeight) : '—' }}
        <span class="text-xs text-muted font-sans font-normal ms-1">{{ t('dashboard.finalizedHeight') }}</span>
      </div>
      <div class="mt-3">
        <div class="flex justify-between text-[11px] text-muted mb-1"><span>{{ t('dashboard.tipVotes') }}</span><span class="mono">{{ tipVotes }} / {{ f.quorum }}</span></div>
        <div class="h-1.5 rounded-full bg-line/10 overflow-hidden"><div class="h-full bg-ok transition-[width] duration-500" :style="{ width: pct + '%' }"></div></div>
      </div>
      <div class="mt-2 text-[11px] mono text-muted">{{ t('dashboard.lag') }}: {{ f.finalizedHeight ? formatNumber(f.lag) : '∞' }}</div>
    </template>
  </div>
</template>
