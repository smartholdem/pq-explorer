<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Layers, Gauge, Zap, CheckCircle2, ArrowRight } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'
import { useMempoolStore } from '@/stores/mempool'
import { useNetworkStore } from '@/stores/network'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Panel from '@/components/ui/Panel.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import BlockPulse from '@/components/ui/BlockPulse.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import TxTypeBadge from '@/components/tx/TxTypeBadge.vue'
import { formatNumber, formatBytes, percent, fromUnits } from '@/utils/format'
import { isMultiPayment, multiPaymentTotal } from '@/utils/tx'
import type { Transaction } from '@/api/types'

const { t } = useI18n()
const chain = useChainStore()
const net = useNetworkStore()
const mp = useMempoolStore()
onMounted(() => mp.refresh())

const m = computed(() => chain.metrics?.mempool)
const fill = computed(() => percent(m.value?.count ?? 0, m.value?.max ?? 1))
const bytesFill = computed(() => percent(m.value?.bytes ?? 0, m.value?.maxBytes ?? 1))
const df = computed(() => m.value?.dynamicFees)
const displayAmount = (tx: Transaction) => (isMultiPayment(tx) ? multiPaymentTotal(tx).toString() : tx.amount)
const totalPending = computed(() => mp.pending.reduce((s, tx) => s + BigInt(displayAmount(tx)), 0n).toString())
const feeBuckets = computed(() => {
  const edges = [0.01, 0.1, 0.5, 1, 10]
  const counts = new Array(edges.length + 1).fill(0)
  mp.pending.forEach((tx) => { const f = Number(tx.fee) / 1e8; counts[edges.findIndex((e) => f < e) === -1 ? edges.length : edges.findIndex((e) => f < e)]++ })
  const labels = ['<0.01', '0.01–0.1', '0.1–0.5', '0.5–1', '1–10', '≥10']
  return labels.map((label, i) => ({ label, count: counts[i] }))
})
const maxBucket = computed(() => Math.max(1, ...feeBuckets.value.map((b) => b.count)))
</script>

<template>
  <div data-testid="mempool-page">
    <PageHeader :title="t('mempool.title')" :subtitle="t('mempool.subtitle')">
      <div class="flex items-center gap-2 text-xs text-muted"><BlockPulse :error="Boolean(chain.error)" />{{ t('mempool.syncedEvery', { s: net.current.blocktime }) }}<span v-if="mp.lastSync" class="mono">· <TimeAgo :unix="Math.floor(mp.lastSync / 1000)" /></span></div>
    </PageHeader>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard :label="t('mempool.pending')" tone="brand" :loading="!m" :value="formatNumber(m?.count)" data-testid="mempool-count">
        <template #icon><Layers class="h-4 w-4 text-brand/70" /></template>
        <template #sub>
          <div class="flex justify-between"><span>{{ t('mempool.capacity') }} {{ formatNumber(m?.max) }}</span><span class="mono">{{ fill }}%</span></div>
          <div class="h-1 mt-1 rounded-full bg-line/10 overflow-hidden"><div class="h-full bg-brand transition-[width] duration-500" :style="{ width: fill + '%' }"></div></div>
        </template>
      </StatCard>
      <StatCard :label="t('mempool.size')" tone="cyan" :loading="!m" :value="formatBytes(m?.bytes ?? 0)">
        <template #icon><Gauge class="h-4 w-4 text-cyan/70" /></template>
        <template #sub>
          <div class="flex justify-between"><span>{{ t('mempool.capacity') }} {{ formatBytes(m?.maxBytes ?? 0) }}</span><span class="mono">{{ bytesFill }}%</span></div>
          <div class="h-1 mt-1 rounded-full bg-line/10 overflow-hidden"><div class="h-full bg-cyan transition-[width] duration-500" :style="{ width: bytesFill + '%' }"></div></div>
        </template>
      </StatCard>
      <StatCard :label="t('mempool.minFee')" tone="ok" :loading="!m" :sub="df ? `${t('mempool.perByte')} · ${t('mempool.broadcast')} ${df.minFeeBroadcast}` : ''">
        <template #icon><Zap class="h-4 w-4 text-ok/70" /></template>
        <span class="mono">{{ df?.enabled ? df.minFeePool : '—' }}</span><span class="text-sm text-muted ms-1">sat/B</span>
      </StatCard>
      <StatCard :label="t('mempool.minTransfer')" tone="neutral" :loading="!m" :sub="df ? `${t('mempool.transferBytes')} ${df.transferBytes} B · ${t('mempool.rejected')} ${df.lowFeeRejected}` : ''">
        <Amount :value="df?.minTransferFee ?? 0" :max-frac="8" />
      </StatCard>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Panel :title="t('mempool.live')" :subtitle="mp.pending.length ? t('mempool.totalValue') + ': ' + fromUnits(totalPending) + ' ' + net.current.symbol : ''" class="xl:col-span-2">
        <template #actions><Pill :tone="mp.pending.length ? 'warn' : 'neutral'" data-testid="mempool-live-count">{{ mp.pending.length }} {{ t('common.txs') }}</Pill></template>
        <SkeletonRows v-if="mp.loading" :rows="5" :cols="4" />
        <StatePanel v-else-if="mp.error" :error="mp.error" @retry="mp.refresh" />
        <div v-else-if="!mp.pending.length" class="py-14 text-center text-muted" data-testid="mempool-empty">
          <CheckCircle2 class="mx-auto h-9 w-9 text-ok/70" />
          <div class="mt-3 text-sm">{{ t('mempool.empty') }}</div>
          <div class="text-xs mt-1">{{ t('mempool.emptyHint', { s: net.current.blocktime }) }}</div>
        </div>
        <TransitionGroup v-else tag="div" class="divide-y hair" enter-active-class="transition duration-700 ease-out" enter-from-class="opacity-0 -translate-y-2 bg-warn/20" data-testid="mempool-list">
          <div v-for="tx in mp.pending" :key="tx.id" class="px-5 py-3 flex flex-wrap items-center gap-3 text-sm row-hover" data-testid="mempool-row">
            <span class="h-2 w-2 rounded-full bg-warn animate-pulseDot"></span>
            <HashLink :value="tx.id" :to="`/tx/${tx.id}`" :head="10" :tail="6" />
            <TxTypeBadge :tx="tx" />
            <span class="inline-flex items-center gap-1.5 text-xs">
              <HashLink :value="tx.sender" :to="`/wallet/${tx.sender}`" :head="6" :tail="4" :copy="false" /><ArrowRight class="rtl:-scale-x-100 h-3 w-3 text-muted" />
              <HashLink v-if="tx.recipient" :value="tx.recipient" :to="`/wallet/${tx.recipient}`" :head="6" :tail="4" :copy="false" /><span v-else class="text-muted">—</span>
            </span>
            <span class="ms-auto text-end"><Amount :value="displayAmount(tx)" /><div class="text-[11px] text-muted">{{ t('common.fee') }} <Amount :value="tx.fee" :symbol="null" /></div></span>
            <span class="text-[11px] text-muted w-24 text-end whitespace-nowrap">{{ t('mempool.inPool') }} <TimeAgo :unix="Math.floor(tx.seenAt / 1000)" /></span>
          </div>
        </TransitionGroup>
      </Panel>

      <div class="space-y-6">
        <Panel :title="t('mempool.feeDist')" pad>
          <div class="space-y-2 pt-1" data-testid="mempool-fee-dist">
            <div v-for="b in feeBuckets" :key="b.label" class="flex items-center gap-3 text-xs">
              <span class="mono w-16 text-muted">{{ b.label }}</span>
              <div class="flex-1 h-2 rounded-full bg-line/10 overflow-hidden"><div class="h-full bg-cyan transition-[width] duration-500" :style="{ width: (b.count / maxBucket) * 100 + '%' }"></div></div>
              <span class="mono w-6 text-end">{{ b.count }}</span>
            </div>
            <div class="eyebrow text-[10px] pt-1">{{ t('common.fee') }}, {{ net.current.symbol }}</div>
          </div>
        </Panel>
        <Panel :title="t('mempool.left')" :subtitle="t('mempool.leftSub')">
          <div v-if="!mp.left.length" class="px-5 pb-5 text-sm text-muted">{{ t('common.empty') }}</div>
          <div v-else class="divide-y hair" data-testid="mempool-left">
            <div v-for="tx in mp.left" :key="tx.id" class="px-5 py-2.5 flex items-center gap-3 text-xs">
              <CheckCircle2 class="h-3.5 w-3.5 text-ok" />
              <HashLink :value="tx.id" :to="`/tx/${tx.id}`" :head="8" :tail="6" :copy="false" />
              <span class="ms-auto"><Amount :value="displayAmount(tx)" :max-frac="4" /></span>
              <TimeAgo :unix="Math.floor(tx.leftAt / 1000)" class="text-muted" />
            </div>
          </div>
        </Panel>
        <Panel v-if="df?.addonBytes" :title="t('mempool.policy')" pad>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mono pt-1">
            <template v-for="(v, k) in df.addonBytes" :key="k"><span class="text-muted">{{ k }}</span><span class="text-end">{{ formatNumber(v as number) }} B</span></template>
          </div>
        </Panel>
      </div>
    </div>
  </div>
</template>
