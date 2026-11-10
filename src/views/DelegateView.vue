<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Activity, AlertTriangle, Atom, Wallet as WalletIcon } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useQuery } from '@/composables/useQuery'
import { useNtfryDelegates } from '@/composables/useNtfryDelegates'
import { useMissedSlots, type MissedSlot } from '@/composables/useMissedSlots'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/ui/PageHeader.vue'
import FavoriteButton from '@/components/ui/FavoriteButton.vue'
import Panel from '@/components/ui/Panel.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { formatNumber, formatDuration } from '@/utils/format'
import type { Block, NtfryDelegate } from '@/api/types'
import { delegateImpl, implTone, implLabel } from '@/utils/delegates'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()

const { data: d, loading, error, reload } = useQuery(() => net.api.delegates.get(props.id), [() => props.id])
const notFound = computed(() => error.value instanceof ApiError && error.value.isNotFound)
const ntfry = useNtfryDelegates()
const extra = computed<NtfryDelegate | null>(() => (ntfry.data.value?.list ?? []).find((x: NtfryDelegate) => x.publicKey === d.value?.publicKey) ?? null)
const impl = computed(() => delegateImpl(extra.value))
const activeCount = computed(() => ntfry.data.value?.active ?? chain.config?.constants?.activeDelegates ?? net.current.activeDelegates)
const roundSeconds = computed(() => activeCount.value * (chain.config?.constants?.blocktime ?? net.current.blocktime))

const votersPage = ref(1)
const votersLimit = ref(25)
const voters = useQuery(async () => (d.value ? net.api.delegates.voters(d.value.address, { page: votersPage.value, limit: votersLimit.value, orderBy: 'balance:desc' }) : { data: [] }), [() => d.value?.address, votersPage, votersLimit])
const blocksPage = ref(1)
const blocks = useQuery(async () => (d.value ? net.api.delegates.blocks(d.value.address, { page: blocksPage.value, limit: 25, orderBy: 'height:desc' }) : { data: [] }), [() => d.value?.address, blocksPage])

const lastAge = computed(() => (d.value?.blocks.last ? Math.max(0, Math.floor(Date.now() / 1000) - d.value.blocks.last.timestamp.unix) : null))
// slot-accurate misses computed from the chain window + per-round forging order (see useMissedSlots)
const slots = useMissedSlots()
const pk = computed(() => d.value?.publicKey ?? '')
const myMissed = computed(() => slots.byPk.value.get(pk.value) ?? [])
const myForged = computed(() => slots.forged.value.get(pk.value) ?? 0)
const liveMiss = computed(() => myMissed.value.some((m) => m.live))
const recentMissed = computed(() => slots.recentMissed(pk.value))
const missedTotal = computed(() => d.value?.blocks.missed ?? null)
const productivity = computed(() => (missedTotal.value !== null && d.value!.blocks.produced + missedTotal.value ? Math.round((d.value!.blocks.produced / (d.value!.blocks.produced + missedTotal.value)) * 1000) / 10 : null))
const reliability = computed(() => (myForged.value + myMissed.value.length ? Math.round((myForged.value / (myForged.value + myMissed.value.length)) * 1000) / 10 : null))
const status = computed<'standby' | 'resigned' | 'forging' | 'missing' | 'never' | 'checking'>(() => {
  if (!d.value) return 'never'
  if (d.value.isResigned) return 'resigned'
  if (d.value.rank > activeCount.value) return 'standby'
  if (lastAge.value === null) return 'never'
  if (!slots.coverage.value) return 'checking'
  return recentMissed.value > 0 && slots.stillMissing(pk.value) ? 'missing' : 'forging'
})
const recovered = computed(() => status.value === 'forging' && recentMissed.value > 0)

interface Row { block: Block; missedBefore: MissedSlot[] }
// misses of this delegate that happened after each block (newest first); misses newer than the top row go to `missedOnTop`
const blockRows = computed<Row[]>(() => {
  const list = blocks.data.value ?? []
  return list.map((b, i) => {
    const newer = i > 0 ? list[i - 1].timestamp.unix : Infinity
    return { block: b, missedBefore: i > 0 ? myMissed.value.filter((m) => m.unix > b.timestamp.unix && m.unix < newer).sort((a, b2) => b2.slot - a.slot) : [] }
  })
})
const missedOnTop = computed(() => {
  const top = blocks.data.value?.[0]
  return blocksPage.value === 1 && top ? myMissed.value.filter((m) => m.unix > top.timestamp.unix).sort((a, b) => b.slot - a.slot) : []
})
const totalVotes = computed(() => voters.meta.value?.totalCount ?? null)
</script>

<template>
  <div data-testid="delegate-page">
    <PageHeader :title="d ? d.username : t('wallet.delegate')" :subtitle="d?.address ?? id">
      <template v-if="d">
        <Pill v-if="status === 'forging'" tone="ok" glow><Activity class="h-3 w-3" />{{ t('delegate.forging') }}</Pill>
        <span v-if="recovered" class="text-xs text-warn" :title="t('delegate.recoveredHint')" data-testid="delegate-recovered">{{ t('delegate.recovered', { n: recentMissed }) }}</span>
        <Pill v-else-if="status === 'checking'" tone="neutral" data-testid="delegate-status-pending"><span class="h-1.5 w-1.5 rounded-full bg-muted animate-pulseDot"></span>{{ t('delegates.checking') }}</Pill>
        <Pill v-else-if="status === 'missing'" tone="bad" glow data-testid="delegate-missing-pill"><AlertTriangle class="h-3 w-3" />{{ liveMiss ? t('delegate.missingNow') : t('delegate.missing', { n: recentMissed }) }}</Pill>
        <Pill v-else-if="status === 'standby'" tone="neutral">{{ t('delegates.standby') }}</Pill>
        <Pill v-else-if="status === 'resigned'" tone="neutral">{{ t('common.resigned') }}</Pill>
        <Pill v-if="impl" :tone="implTone(impl.impl)" :title="impl.inferred ? t('delegates.inferredHint') : ''" data-testid="delegate-impl">{{ implLabel(impl.impl, t('common.unknown')) }}<span v-if="impl.inferred" class="opacity-60">~</span> {{ impl.version ?? '' }}</Pill>
        <Pill v-if="extra?.banned" tone="bad">{{ t('delegates.banned') }}</Pill>
        <Pill v-if="extra?.pqKey" tone="quantum"><Atom class="h-3 w-3" />PQ</Pill>
        <FavoriteButton kind="delegate" :id="d.username" />
        <RouterLink :to="`/wallet/${d.address}`" class="btn-ghost !py-1 text-xs" data-testid="delegate-wallet-link"><WalletIcon class="h-3.5 w-3.5" />{{ t('wallet.title') }}</RouterLink>
      </template>
    </PageHeader>

    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 5" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 10 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !d"><StatePanel :error="notFound ? new Error(t('delegate.notFound')) : error" @retry="reload" /></Panel>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard :label="t('common.rank')" tone="cyan" :value="`#${d.rank}`" :sub="`${t('delegates.active')}: ${activeCount}`" data-testid="delegate-rank" />
        <StatCard :label="t('common.votes')" tone="brand" :sub="`${t('delegates.approval')} ${d.production?.approval ?? 0}%`"><Amount :value="d.votes" :max-frac="0" :symbol="null" /></StatCard>
        <StatCard :label="t('delegates.produced')" tone="ok" :value="formatNumber(d.blocks.produced)" :sub="totalVotes !== null ? `${t('delegate.voters')}: ${formatNumber(totalVotes)}` : ''" />
        <StatCard :label="t('delegates.forged')" tone="neutral"><Amount :value="d.forged.total" :max-frac="0" /></StatCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel :title="t('delegate.monitor')" :subtitle="t('delegate.monitorSub', { bt: slots.blocktime.value, n: activeCount })" class="xl:col-span-2">
          <div class="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div class="card !rounded-xl p-3"><div class="eyebrow text-[10px]">{{ t('delegates.lastBlock') }}</div>
              <div v-if="d.blocks.last" class="mt-1"><RouterLink :to="`/block/${d.blocks.last.height}`" class="link mono">#{{ formatNumber(d.blocks.last.height) }}</RouterLink><div class="text-xs text-muted"><TimeAgo :unix="d.blocks.last.timestamp.unix" /></div></div>
              <div v-else class="mt-1 text-muted">—</div></div>
            <div class="card !rounded-xl p-3"><div class="eyebrow text-[10px]">{{ t('delegate.sinceLast') }}</div><div class="mt-1 mono" :class="liveMiss && 'text-bad'">{{ lastAge !== null ? formatDuration(lastAge) : '—' }}</div>
              <div v-if="liveMiss" class="text-[11px] text-bad flex items-center gap-1 mt-0.5" data-testid="delegate-live-miss"><span class="h-1.5 w-1.5 rounded-full bg-bad animate-pulseDot"></span>{{ t('delegate.missingNow') }}</div>
              <div v-else class="text-[11px] text-muted mt-0.5">{{ t('delegate.nextSlotHint', { max: 2 * activeCount - 1 }) }}</div></div>
            <div class="card !rounded-xl p-3"><div class="eyebrow text-[10px]">{{ t('delegate.missedSlots') }}</div>
              <div v-if="slots.loading.value && !slots.coverage.value" class="skeleton h-7 w-16 mt-1"></div>
              <template v-else>
                <div class="mt-1 font-display text-xl font-semibold" :class="myMissed.length ? 'text-bad' : 'text-ok'" data-testid="missed-rounds">{{ myMissed.length }}<span v-if="reliability !== null" class="text-xs font-sans font-normal text-muted ms-2">{{ t('delegate.reliability', { p: reliability }) }}</span></div>
                <div v-if="slots.coverage.value" class="text-[11px] text-muted mt-0.5" data-testid="missed-coverage">{{ t('delegate.coverage', { r: slots.coverage.value.rounds, f: myForged }) }}</div>
              </template></div>
            <div class="card !rounded-xl p-3" data-testid="missed-total-card"><div class="eyebrow text-[10px]">{{ t('delegate.missedTotal') }}</div>
              <div class="mt-1 font-display text-xl font-semibold" :class="missedTotal ? 'text-bad' : 'text-ok'" data-testid="missed-total">{{ missedTotal !== null ? formatNumber(missedTotal) : '—' }}</div>
              <div v-if="productivity !== null" class="text-[11px] text-muted mt-0.5" data-testid="missed-total-productivity">{{ t('delegate.missedTotalSub', { p: productivity }) }}</div></div>
          </div>
          <SkeletonRows v-if="blocks.loading.value" :rows="8" :cols="4" />
          <StatePanel v-else-if="blocks.error.value" :error="blocks.error.value" @retry="blocks.reload" />
          <div v-else class="overflow-x-auto">
            <table v-card-table class="w-full min-w-[560px]" data-testid="delegate-blocks-table">
              <thead><tr><th class="th">{{ t('common.height') }}</th><th class="th">{{ t('common.id') }}</th><th class="th text-end">{{ t('blocks.txCount') }}</th><th class="th text-end">{{ t('common.fee') }}</th><th class="th">{{ t('common.age') }}</th></tr></thead>
              <tbody>
                <tr v-for="m in missedOnTop" :key="'top' + m.slot" data-testid="missed-gap-row" :class="m.live && 'animate-pulse'">
                  <td colspan="5" class="px-4 py-1.5 border-b hair text-[11px] text-bad/90 bg-bad/5"><span class="inline-flex items-center gap-2"><AlertTriangle class="h-3 w-3" />{{ t('delegate.missedSlot', { s: formatNumber(m.slot), r: formatNumber(m.round) }) }} · <TimeAgo :unix="m.unix" /><span v-if="m.live" class="font-semibold">· {{ t('delegate.live') }}</span></span></td>
                </tr>
                <template v-for="r in blockRows" :key="r.block.id">
                  <tr v-for="m in r.missedBefore" :key="'m' + m.slot" data-testid="missed-gap-row">
                    <td colspan="5" class="px-4 py-1.5 border-b hair text-[11px] text-bad/90 bg-bad/5"><span class="inline-flex items-center gap-2"><AlertTriangle class="h-3 w-3" />{{ t('delegate.missedSlot', { s: formatNumber(m.slot), r: formatNumber(m.round) }) }} · <TimeAgo :unix="m.unix" /></span></td>
                  </tr>
                  <tr class="row-hover" data-testid="delegate-block-row">
                    <td class="td"><RouterLink :to="`/block/${r.block.height}`" class="link mono font-semibold">{{ formatNumber(r.block.height) }}</RouterLink></td>
                    <td class="td"><HashLink :value="r.block.id" :to="`/block/${r.block.id}`" :head="8" :tail="6" /></td>
                    <td class="td text-end mono">{{ r.block.transactions }}</td>
                    <td class="td text-end text-muted"><Amount :value="r.block.forged.fee" :symbol="null" :max-frac="4" /></td>
                    <td class="td text-muted whitespace-nowrap"><TimeAgo :unix="r.block.timestamp.unix" /></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <Pagination :page="blocksPage" :meta="blocks.meta.value" :limit="25" :loading="blocks.loading.value" @update:page="blocksPage = $event" />
        </Panel>

        <Panel :title="t('delegate.voters')" :subtitle="totalVotes !== null ? formatNumber(totalVotes) : ''">
          <SkeletonRows v-if="voters.loading.value" :rows="10" :cols="2" />
          <StatePanel v-else-if="voters.error.value" :error="voters.error.value" @retry="voters.reload" />
          <StatePanel v-else-if="!voters.data.value?.length" empty />
          <div v-else class="divide-y hair" data-testid="delegate-voters">
            <div v-for="v in voters.data.value" :key="v.address" class="px-5 py-2.5 flex items-center gap-3 text-sm">
              <HashLink :value="v.address" :to="`/wallet/${v.address}`" :head="8" :tail="6" :copy="false" />
              <span class="ms-auto"><Amount :value="v.balance" :max-frac="2" /></span>
            </div>
          </div>
          <Pagination :page="votersPage" :meta="voters.meta.value" :limit="votersLimit" :loading="voters.loading.value" @update:page="votersPage = $event" @update:limit="votersLimit = $event; votersPage = 1" />
        </Panel>
      </div>
    </div>
  </div>
</template>
