<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Atom, ShieldCheck, ShieldOff } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'
import Pill from '@/components/ui/Pill.vue'
import ShipLink from '@/components/ui/ShipLink.vue'
import { formatNumber } from '@/utils/format'
import { pqAlgorithmName } from '@/utils/tx'

const { t } = useI18n()
const chain = useChainStore()
const m = computed(() => chain.metrics?.node)
const cfg = computed(() => chain.config)
const active = computed(() => chain.pqActive)
const stage = computed(() => m.value?.pqStage ?? cfg.value?.quantumShield.stage ?? '—')
const algos = computed(() => (cfg.value?.pq.algorithms?.length ? cfg.value.pq.algorithms : cfg.value?.quantumShield.algorithms ?? []))
</script>

<template>
  <div class="card card-hover relative p-5 overflow-hidden animate-rise" :class="active && 'border-ok/40 shadow-[0_0_24px_rgba(34,230,120,0.18)]'" data-testid="quantum-shield-card">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent" :class="active ? 'from-ok/70' : 'from-quantum/60'"></div>
    <div class="flex items-start justify-between gap-3">
      <div class="eyebrow">{{ t('dashboard.quantum') }}</div>
      <Atom class="h-4 w-4" :class="active ? 'text-ok' : 'text-quantum/80'" />
    </div>
    <div v-if="!m && !cfg" class="skeleton h-8 w-2/3 mt-3"></div>
    <template v-else>
      <div class="mt-2 flex items-center gap-2 flex-wrap">
        <Pill :tone="active ? 'ok' : 'quantum'" :glow="active" data-testid="pq-status-pill">
          <ShieldCheck v-if="active" class="h-3 w-3" /><ShieldOff v-else class="h-3 w-3" />
          <template v-if="active">{{ t('common.active') }}</template>
          <ShipLink v-else :n="18" class="!text-inherit" :title="`${t('dashboard.stage')} ${stage} · SHIP-18`">{{ t('dashboard.stage') }} {{ stage }}</ShipLink>
        </Pill>
        <span v-for="a in algos" :key="a" class="mono text-[11px] text-muted">{{ pqAlgorithmName(a) }}</span>
      </div>
      <p class="mt-2 text-xs text-muted">{{ active ? t('dashboard.shieldOn') : t('dashboard.shieldOff', { s: stage }) }}</p>
      <div class="mt-4 grid grid-cols-3 gap-3 text-center">
        <div><div class="font-display text-xl font-semibold tabular-nums" data-testid="pq-active-count">{{ formatNumber(m?.pqActive ?? 0) }}</div><div class="eyebrow text-[10px] mt-0.5">{{ t('dashboard.pqActive') }}</div></div>
        <div><div class="font-display text-xl font-semibold tabular-nums">{{ formatNumber(m?.pqCommitments ?? 0) }}</div><div class="eyebrow text-[10px] mt-0.5">{{ t('dashboard.commitments') }}</div></div>
        <div><div class="font-display text-xl font-semibold tabular-nums">{{ m?.pqBlocks ? t('common.yes') : t('common.no') }}</div><div class="eyebrow text-[10px] mt-0.5">{{ t('dashboard.pqBlocks') }}</div></div>
      </div>
      <div v-if="cfg?.pq.activation" class="mt-3 text-[11px] mono text-muted">{{ t('dashboard.activation') }}: {{ formatNumber(cfg.pq.activation) }}</div>
    </template>
  </div>
</template>
