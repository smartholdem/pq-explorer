<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, ShieldCheck, Activity } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import { useNtfryDelegates } from '@/composables/useNtfryDelegates'
import { useMissedSlots } from '@/composables/useMissedSlots'
import RoundSchedule from '@/components/dashboard/RoundSchedule.vue'
import FavoriteButton from '@/components/ui/FavoriteButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { formatNumber } from '@/utils/format'
import type { NtfryDelegate, Delegate, Block } from '@/api/types'
import { delegateImpl, implTone, implLabel, type ImplInfo } from '@/utils/delegates'

const { t } = useI18n()
const net = useNetworkStore()
const list = useQuery(() => net.api.delegates.list({ limit: 100 }), [], true)
const ntfry = useNtfryDelegates()
const extra = computed(() => new Map<string, NtfryDelegate>((ntfry.data.value?.list ?? []).map((d: NtfryDelegate) => [d.publicKey, d])))
// last known implementation per delegate, persisted per network: shown instantly on reload, then re-verified in the background
const implKey = () => `sth:${net.currentId}:delegates:impl`
const implMemory = ref(new Map<string, ImplInfo>())
const implHydrated = ref(false)
const hydrateImpl = async () => {
  implHydrated.value = false
  const hit = await idbGet<Record<string, ImplInfo>>(implKey()).catch(() => undefined)
  implMemory.value = new Map(Object.entries(hit ?? {}))
  implHydrated.value = true
}
watch(() => net.currentId, hydrateImpl, { immediate: true })
watch(() => ntfry.data.value, (d) => {
  if (!d) return
  const next = new Map(implMemory.value)
  for (const x of d.list) {
    const fresh = delegateImpl(x)
    if (fresh && fresh.impl !== 'unknown') next.set(x.publicKey, fresh)
  }
  implMemory.value = next
  void idbSet(implKey(), Object.fromEntries(next)).catch(() => undefined)
})
const implOf = (pk: string) => implMemory.value.get(pk) ?? delegateImpl(extra.value.get(pk))
// cached value not yet re-confirmed by the node during this session
const implStale = (pk: string) => !ntfry.data.value && implMemory.value.has(pk)
const active = computed(() => ntfry.data.value?.active ?? net.current.activeDelegates)
const totalVotes = computed(() => (list.data.value ?? []).reduce((s, d) => s + BigInt(d.votes || 0), 0n))
const votePct = (v: string) => (totalVotes.value ? (Number(BigInt(v) * 10000n / totalVotes.value) / 100).toFixed(2) : '0')
const summary = computed(() => {
  const l: NtfryDelegate[] = ntfry.data.value?.list ?? []
  // before the node answers, count from the persisted memory over the active set
  const pks = l.length ? l.map((d) => d.publicKey) : (list.data.value ?? []).filter((d) => d.rank <= active.value).map((d) => d.publicKey)
  const impls = pks.map((pk) => implOf(pk)?.impl ?? 'unknown')
  return { rust: impls.filter((i) => i === 'rust').length, legacy: impls.filter((i) => i === 'legacy').length, outdated: ntfry.data.value?.outdated ?? l.filter((d) => d.outdated).length }
})
const equivocations = computed(() => ntfry.data.value?.equivocations ?? [])

// forging monitor: slot-accurate misses from the chain window + per-round forging order
const chain = useChainStore()
const cache = useCacheStore()
const slots = useMissedSlots()
const now = ref(Math.floor(Date.now() / 1000))
let tick: number | undefined
onMounted(() => { tick = window.setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 10_000) })
onUnmounted(() => tick && clearInterval(tick))
// real-time: newest forged block per delegate comes from the live block window (updated every tick)
const lastByPk = computed(() => {
  const m = new Map<string, Block>()
  for (const b of cache.recent) if (!m.has(b.generator.publicKey)) m.set(b.generator.publicKey, b)
  return m
})
const lastBlock = (d: Delegate) => {
  const live = lastByPk.value.get(d.publicKey)
  const own = d.blocks.last
  if (live && (!own || live.height > own.height)) return { height: live.height, timestamp: live.timestamp }
  return own ?? null
}
const missedRounds = (d: Delegate) => {
  if (d.rank > active.value || d.isResigned || !slots.coverage.value) return 0
  return slots.recentMissed(d.publicKey)
}
// red only while the delegate has not forged since its latest miss; afterwards it is "recovered" (green + amber note)
const isMissing = (d: Delegate) => missedRounds(d) >= 1 && slots.stillMissing(d.publicKey)
const isRecovered = (d: Delegate) => missedRounds(d) >= 1 && !slots.stillMissing(d.publicKey)
const liveMiss = (d: Delegate) => (slots.byPk.value.get(d.publicKey) ?? []).some((m) => m.live)
const missingCount = computed(() => (list.data.value ?? []).filter(isMissing).length)
// votes/ranks: refresh once per round; ban/slashing status: every tick
let lastReloadHeight = 0
watch(() => chain.height, (h) => {
  if (!h) return
  if (!lastReloadHeight) { lastReloadHeight = h; return }
  void ntfry.reload()
  if (h - lastReloadHeight >= active.value) { lastReloadHeight = h; void list.reload() }
})
</script>

<template>
  <div data-testid="delegates-page">
    <PageHeader :title="t('delegates.title')" :subtitle="t('delegates.subtitle')" />

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard :label="t('delegates.active')" tone="cyan" :value="active" :loading="list.loading.value && !list.data.value" :sub="!slots.coverage.value ? t('delegates.checking') : missingCount ? t('delegates.missingNow', { n: missingCount }) : t('delegates.allForging')" data-testid="delegates-active-card">
        <template #icon><Activity class="h-4 w-4" :class="missingCount ? 'text-bad' : 'text-ok/70'" /></template>
      </StatCard>
      <StatCard :label="t('delegates.rust')" tone="ok" :value="summary.rust" :loading="!ntfry.data.value && !summary.rust && !summary.legacy" :sub="ntfry.data.value?.minCoreVersion ? `${t('delegates.minCore')} ${ntfry.data.value.minCoreVersion}` : ''" />
      <StatCard :label="t('delegates.legacy')" tone="brand" :value="summary.legacy" :loading="!ntfry.data.value && !summary.rust && !summary.legacy" />
      <StatCard :label="t('delegates.slashing')" :tone="equivocations.length ? 'brand' : 'neutral'" :loading="ntfry.loading.value && !ntfry.data.value" :value="equivocations.length" :sub="ntfry.data.value?.slashing?.enabled ? t('delegates.slashingRounds', { n: ntfry.data.value.slashing.rounds }) : t('common.inactive')" />
    </div>

    <RoundSchedule class="mb-6" />

    <Panel class="mb-6" :title="t('delegates.equivocations')">
      <div v-if="!equivocations.length" class="px-5 pb-5 text-sm text-muted flex items-center gap-2"><ShieldCheck class="h-4 w-4 text-ok" />{{ t('delegates.noEquivocations') }}</div>
      <div v-else class="divide-y hair" data-testid="equivocations-list">
        <div v-for="e in equivocations" :key="e.publicKey + e.height" class="px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
          <AlertTriangle class="h-4 w-4 text-bad" />
          <RouterLink :to="`/wallet/${e.username}`" class="link font-semibold">{{ e.username }}</RouterLink>
          <span class="mono text-muted">#{{ formatNumber(e.height) }} · {{ e.blockIds.length }} blocks</span>
          <Pill :tone="e.banned ? 'bad' : 'warn'">{{ e.banned ? t('delegates.bannedUntil', { r: e.bannedUntilRound }) : `${e.roundsLeft} rounds` }}</Pill>
        </div>
      </div>
    </Panel>

    <Panel>
      <div class="overflow-x-auto">
        <SkeletonRows v-if="list.loading.value && !list.data.value" :rows="12" :cols="6" />
        <StatePanel v-else-if="list.error.value" :error="list.error.value" @retry="list.reload" />
        <table v-card-table v-else class="w-full min-w-[900px]" data-testid="delegates-table">
          <thead>
            <tr>
              <th class="th w-12">{{ t('common.rank') }}</th><th class="th">{{ t('common.username') }}</th><th class="th">{{ t('delegates.implementation') }}</th>
              <th class="th text-end">{{ t('common.votes') }}</th><th class="th text-end">{{ t('delegates.approval') }}</th><th class="th text-end">{{ t('delegates.produced') }}</th><th class="th text-end">{{ t('delegates.missed') }}</th>
              <th class="th">{{ t('delegates.lastBlock') }}</th><th class="th">{{ t('common.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in list.data.value" :key="d.publicKey" class="row-hover" :class="[d.rank > active && 'opacity-60', isMissing(d) && 'bg-bad/5 shadow-[inset_3px_0_0_0_rgb(var(--c-bad))]']" data-testid="delegate-row" :data-missing="isMissing(d) ? 'true' : undefined" :data-recovered="isRecovered(d) ? 'true' : undefined">
              <td class="td mono" :class="d.rank <= active ? 'text-cyan font-semibold' : 'text-muted'">{{ d.rank }}</td>
              <td class="td card-title">
                <div class="flex items-center gap-2"><RouterLink :to="`/delegate/${d.username}`" class="link font-semibold" data-testid="delegate-link">{{ d.username }}</RouterLink><FavoriteButton kind="delegate" :id="d.username" compact /></div>
                <div class="mono text-[11px] text-muted"><HashLink :value="d.address" :head="8" :tail="6" :copy="false" /></div>
              </td>
              <td class="td">
                <template v-if="implOf(d.publicKey)">
                  <Pill :tone="implTone(implOf(d.publicKey)!.impl)" :title="implStale(d.publicKey) ? t('delegates.staleHint') : implOf(d.publicKey)!.inferred ? t('delegates.inferredHint') : ''" data-testid="delegate-impl" :data-stale="implStale(d.publicKey) ? 'true' : undefined">
                    {{ implLabel(implOf(d.publicKey)!.impl, t('common.unknown')) }}<span v-if="implOf(d.publicKey)!.inferred" class="opacity-60">~</span>
                  </Pill>
                  <span class="mono text-xs text-muted ms-2">{{ implOf(d.publicKey)!.version ?? '' }}</span>
                  <span v-if="implStale(d.publicKey)" class="inline-block h-1.5 w-1.5 rounded-full bg-cyan/70 animate-pulseDot ms-1.5 align-middle" data-testid="delegate-impl-verifying"></span>
                  <Pill v-if="extra.get(d.publicKey)?.outdated" tone="warn" class="ms-1">{{ t('delegates.outdated') }}</Pill>
                </template>
                <span v-else-if="!implHydrated || ntfry.loading.value" class="skeleton inline-block h-5 w-16 rounded-md" data-testid="delegate-impl-skeleton"></span>
                <span v-else class="text-muted text-xs">—</span>
              </td>
              <td class="td text-end"><Amount :value="d.votes" :max-frac="0" :symbol="null" /><div class="text-[11px] text-muted mono">{{ votePct(d.votes) }}%</div></td>
              <td class="td text-end mono">{{ d.production?.approval ?? 0 }}%</td>
              <td class="td text-end mono">{{ formatNumber(d.blocks.produced) }}</td>
              <td class="td text-end mono" :class="d.blocks.missed ? 'text-bad' : 'text-muted'" data-testid="delegate-missed-total">{{ d.blocks.missed != null ? formatNumber(d.blocks.missed) : '—' }}</td>
              <td class="td text-xs" :class="isMissing(d) ? 'text-bad' : 'text-muted'">
                <template v-if="lastBlock(d)">
                  <span v-if="isMissing(d)" class="inline-flex items-center gap-1 font-semibold" data-testid="delegate-missing-marker"><span class="h-2 w-2 rounded-full bg-bad animate-pulseDot"></span>{{ t('delegates.lastSeen') }} <TimeAgo :unix="lastBlock(d)!.timestamp.unix" /></span>
                  <template v-else><RouterLink :to="`/block/${lastBlock(d)!.height}`" class="link mono">#{{ formatNumber(lastBlock(d)!.height) }}</RouterLink> · <TimeAgo :unix="lastBlock(d)!.timestamp.unix" /></template>
                </template>
                <span v-else>—</span>
              </td>
              <td class="td">
                <span class="inline-flex flex-wrap gap-1">
                  <Pill v-if="d.isResigned" tone="neutral">{{ t('common.resigned') }}</Pill>
                  <Pill v-else-if="d.rank > active" tone="neutral">{{ t('delegates.standby') }}</Pill>
                  <Pill v-else-if="!slots.coverage.value" tone="neutral" data-testid="delegate-status-pending"><span class="h-1.5 w-1.5 rounded-full bg-muted animate-pulseDot"></span>{{ t('delegates.checking') }}</Pill>
                  <Pill v-else-if="isMissing(d)" tone="bad" glow data-testid="delegate-missing-pill"><AlertTriangle class="h-3 w-3" />{{ liveMiss(d) ? t('delegate.missingNow') : t('delegate.missing', { n: missedRounds(d) }) }}</Pill>
                  <span v-else-if="isRecovered(d)" class="inline-flex flex-wrap items-center gap-1.5" data-testid="delegate-recovered"><Pill tone="ok" glow><Activity class="h-3 w-3" />{{ t('delegates.forging') }}</Pill><span class="text-[11px] text-warn" :title="t('delegate.recoveredHint')">{{ t('delegate.recovered', { n: missedRounds(d) }) }}</span></span>
                  <Pill v-else tone="cyan">{{ t('common.active') }}</Pill>
                  <Pill v-if="extra.get(d.publicKey)?.banned" tone="bad">{{ t('delegates.banned') }}</Pill>
                  <Pill v-if="extra.get(d.publicKey)?.doubleVotes" tone="warn">{{ t('delegates.doubleVotes') }}: {{ extra.get(d.publicKey)!.doubleVotes }}</Pill>
                  <Pill v-if="extra.get(d.publicKey)?.pqKey" tone="quantum">PQ</Pill>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>
</template>
