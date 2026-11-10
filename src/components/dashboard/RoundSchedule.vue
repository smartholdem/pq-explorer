<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Timer, Check, AlertTriangle, Hourglass } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useCacheStore } from '@/stores/cache'
import Panel from '@/components/ui/Panel.vue'
import { forgingOrder, roundOf, slotOf } from '@/utils/rounds'
import { formatNumber, formatDuration } from '@/utils/format'

interface SlotView { slot: number; publicKey: string; state: 'forged' | 'missed' | 'pending' | 'current' | 'upcoming'; height?: number }
const { t } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()
const cache = useCacheStore()
const active = computed(() => chain.config?.constants?.activeDelegates ?? net.current.activeDelegates)
const blocktime = computed(() => chain.config?.constants?.blocktime ?? net.current.blocktime)
const epochUnix = computed(() => chain.epochUnix)

const now = ref(Date.now() / 1000)
const tick = window.setInterval(() => { now.value = Date.now() / 1000 }, 500)
onUnmounted(() => clearInterval(tick))

const tip = computed(() => cache.recent[0] ?? null)
const round = computed(() => (tip.value ? roundOf(tip.value.height + 1, active.value) : null))
const order = shallowRef<string[]>([])
const names = shallowRef<Map<string, string>>(new Map())
watch(round, async (r) => {
  if (!r) return
  order.value = await forgingOrder(net.api, net.currentId, r).catch(() => [])
  if (!names.value.size) {
    const list = await cache.memo('delegates:names', 5 * 60_000, () => net.api.delegates.list({ limit: 100 })).catch(() => null)
    if (list) names.value = new Map(list.data.map((d) => [d.publicKey, d.username]))
  }
}, { immediate: true })
const nameOf = (pk: string) => names.value.get(pk) ?? cache.recent.find((b) => b.generator.publicKey === pk)?.generator.username ?? pk.slice(0, 8) + '…'

const roundStart = computed(() => (round.value ? (round.value - 1) * active.value + 1 : 0))
const roundBlocks = computed(() => cache.recent.filter((b) => b.height >= roundStart.value))
const nowSlot = computed(() => slotOf(Math.floor(now.value) - epochUnix.value, blocktime.value))
// how long the chain has been silent (tip older than one slot + propagation)
const tipSlot = computed(() => (tip.value ? slotOf(tip.value.timestamp.epoch, blocktime.value) : 0))
const stalledSlots = computed(() => Math.max(0, nowSlot.value - tipSlot.value - 1))
// only trust the gap once our window has caught up with the live node tip (not a restored snapshot)
const synced = computed(() => cache.synced)
const stalled = computed(() => synced.value && stalledSlots.value >= 3)
const MAX_PENDING_CHIPS = 3
const slots = computed<SlotView[]>(() => {
  const n = active.value
  if (!order.value.length || !synced.value) return []
  const bySlot = new Map(roundBlocks.value.map((b) => [slotOf(b.timestamp.epoch, blocktime.value), b]))
  const first = roundBlocks.value.length ? Math.min(...bySlot.keys()) : tipSlot.value + 1
  const out: SlotView[] = []
  // proven part of the round: up to the tip (bounded by the round itself, ≤ 2n slots in practice)
  for (let s = first; s <= Math.min(tipSlot.value, nowSlot.value); s++) {
    const b = bySlot.get(s)
    if (b) out.push({ slot: s, publicKey: b.generator.publicKey, state: 'forged', height: b.height })
    else out.push({ slot: s, publicKey: order.value[s % n], state: 'missed' })
  }
  // slots after our tip may simply not have reached us yet; during a stall only the last few are listed, the rest is summarised
  const pendingFrom = Math.max(tipSlot.value + 1, nowSlot.value - MAX_PENDING_CHIPS)
  for (let s = pendingFrom; s < nowSlot.value; s++) out.push({ slot: s, publicKey: order.value[s % n], state: 'pending' })
  if (nowSlot.value > tipSlot.value) out.push({ slot: nowSlot.value, publicKey: order.value[nowSlot.value % n], state: 'current' })
  let remaining = n - roundBlocks.value.length - (nowSlot.value > tipSlot.value ? 1 : 0)
  for (let s = nowSlot.value + 1; remaining > 0; s++, remaining--) out.push({ slot: s, publicKey: order.value[s % n], state: 'upcoming' })
  return out
})
const hiddenPending = computed(() => Math.max(0, stalledSlots.value - MAX_PENDING_CHIPS))
// long outages leave hundreds of proven-missed slots in one round: collapse runs into a single summary chip
type StripItem = { kind: 'slot'; slot: SlotView } | { kind: 'run'; from: number; to: number; count: number; byName: [string, number][] }
const MAX_MISSED_RUN = 4
const strip = computed<StripItem[]>(() => {
  const out: StripItem[] = []
  let run: SlotView[] = []
  const flush = () => {
    if (run.length > MAX_MISSED_RUN) {
      const counts = new Map<string, number>()
      for (const r of run) { const nm = nameOf(r.publicKey); counts.set(nm, (counts.get(nm) ?? 0) + 1) }
      out.push({ kind: 'run', from: run[0].slot, to: run[run.length - 1].slot, count: run.length, byName: [...counts.entries()].sort((a, b) => b[1] - a[1]) })
    } else run.forEach((r) => out.push({ kind: 'slot', slot: r }))
    run = []
  }
  for (const sv of slots.value) {
    if (sv.state === 'missed') run.push(sv)
    else { flush(); out.push({ kind: 'slot', slot: sv }) }
  }
  flush()
  return out
})
const current = computed(() => slots.value.find((s) => s.slot === nowSlot.value))
const currentForged = computed(() => current.value?.state === 'forged')
const next = computed(() => slots.value.find((s) => s.state === 'upcoming'))
const secondsLeft = computed(() => Math.max(0, (nowSlot.value + 1) * blocktime.value + epochUnix.value - now.value))
const progress = computed(() => 1 - secondsLeft.value / blocktime.value)
const forgedCount = computed(() => roundBlocks.value.length)
const missedCount = computed(() => slots.value.filter((s) => s.state === 'missed').length)
</script>

<template>
  <Panel :title="t('round.title')" :subtitle="round ? t('round.subtitle', { r: formatNumber(round), f: forgedCount, n: active }) : ''" data-testid="round-schedule">
    <template #actions>
      <span v-if="missedCount" class="inline-flex items-center gap-1 text-xs text-bad" data-testid="round-missed"><AlertTriangle class="h-3 w-3" />{{ t('round.missed', { n: missedCount }) }}</span>
    </template>
    <div v-if="!slots.length" class="px-5 pb-5"><div class="skeleton h-16"></div></div>
    <div v-else class="px-5 pb-5 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="card !rounded-xl p-3 relative overflow-hidden" data-testid="round-current">
          <div class="absolute inset-x-0 bottom-0 h-0.5 bg-line/10"><div class="h-full bg-cyan transition-[width] duration-500 ease-linear" :style="{ width: progress * 100 + '%' }"></div></div>
          <div class="eyebrow text-[10px] flex items-center gap-1"><component :is="currentForged ? Check : Timer" class="h-3 w-3" :class="currentForged ? 'text-ok' : 'text-cyan'" />{{ currentForged ? t('round.slotDone') : t('round.nowForging') }}</div>
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <RouterLink v-if="current" :to="`/delegate/${nameOf(current.publicKey)}`" class="font-display text-lg font-semibold link truncate" :class="currentForged && '!text-ok'" data-testid="round-current-name">{{ nameOf(current.publicKey) }}</RouterLink>
            <span v-else class="font-display text-lg font-semibold text-muted">—</span>
            <span class="mono text-2xl font-semibold tabular-nums text-cyan" data-testid="round-countdown">{{ secondsLeft.toFixed(0) }}s</span>
          </div>
          <div class="text-[11px] text-muted mono">{{ t('round.slot') }} {{ formatNumber(nowSlot) }}</div>
        </div>
        <div class="card !rounded-xl p-3" data-testid="round-next">
          <div class="eyebrow text-[10px]">{{ t('round.next') }}</div>
          <RouterLink v-if="next" :to="`/delegate/${nameOf(next.publicKey)}`" class="mt-1 block font-display text-lg font-semibold link truncate" data-testid="round-next-name">{{ nameOf(next.publicKey) }}</RouterLink>
          <span v-else class="mt-1 block font-display text-lg font-semibold text-muted">{{ t('round.newRound') }}</span>
          <div class="text-[11px] text-muted">{{ t('round.inSeconds', { s: secondsLeft.toFixed(0) }) }}</div>
        </div>
      </div>
      <div v-if="stalled" class="flex flex-wrap items-center gap-2 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn" data-testid="round-stalled">
        <AlertTriangle class="h-3.5 w-3.5 shrink-0" />
        <span class="font-semibold">{{ t('round.stalled', { s: formatDuration(stalledSlots * blocktime) }) }}</span>
        <span class="text-warn/80">{{ t('round.stalledHint', { h: formatNumber(tip?.height ?? 0), n: stalledSlots }) }}</span>
      </div>
      <div class="flex flex-wrap gap-1.5" data-testid="round-strip">
        <template v-for="it in strip" :key="it.kind === 'slot' ? it.slot.slot : 'run' + it.from">
        <span v-if="it.kind === 'run'" class="inline-flex items-center gap-1 rounded-lg border border-bad/40 bg-bad/10 px-2 py-1 text-[11px] font-semibold text-bad" :title="it.byName.map(([n, c]) => `${n} ×${c}`).join(', ')" data-testid="round-missed-run"><AlertTriangle class="h-3 w-3" />{{ t('round.missedRun', { n: formatNumber(it.count), d: formatDuration(it.count * blocktime) }) }}</span>
        <template v-else>
        <span v-if="hiddenPending > 0 && it.slot.state === 'pending' && it.slot.slot === nowSlot - MAX_PENDING_CHIPS" class="inline-flex items-center gap-1 rounded-lg border border-dashed hair px-2 py-1 text-[11px] text-muted/70" :title="t('round.pendingHint')" data-testid="round-pending-summary"><Hourglass class="h-3 w-3 opacity-60" />+{{ formatNumber(hiddenPending) }} {{ t('round.pending') }}</span>
        <RouterLink :to="`/delegate/${nameOf(it.slot.publicKey)}`" :title="`${nameOf(it.slot.publicKey)} · ${t('round.slot')} ${it.slot.slot}${it.slot.height ? ' · #' + formatNumber(it.slot.height) : ''}${it.slot.state === 'pending' ? ' · ' + t('round.pendingHint') : ''}`"
          class="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors"
          :class="{
            'border-ok/30 bg-ok/10 text-ok': it.slot.state === 'forged',
            'border-bad/40 bg-bad/10 text-bad': it.slot.state === 'missed',
            'hair text-muted/70 border-dashed': it.slot.state === 'pending',
            'border-cyan/50 bg-cyan/15 text-cyan shadow-glow': it.slot.state === 'current',
            'hair text-muted hover:text-fg': it.slot.state === 'upcoming',
          }" :data-state="it.slot.state" data-testid="round-slot">
          <Check v-if="it.slot.state === 'forged'" class="h-3 w-3" /><AlertTriangle v-else-if="it.slot.state === 'missed'" class="h-3 w-3" /><Timer v-else-if="it.slot.state === 'current'" class="h-3 w-3" /><Hourglass v-else-if="it.slot.state === 'pending'" class="h-3 w-3 opacity-60" />
          {{ nameOf(it.slot.publicKey) }}
        </RouterLink>
        </template>
        </template>
      </div>
    </div>
  </Panel>
</template>
