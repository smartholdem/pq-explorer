<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { get as idbGet, set as idbSet } from 'idb-keyval'
dayjs.extend(utc)
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useQuery } from '@/composables/useQuery'
import type { FeeDayBucket } from '@/api/types'
import Panel from '@/components/ui/Panel.vue'
import BarChart from '@/components/ui/BarChart.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { fromUnits } from '@/utils/format'
import { txKind, CORE_TYPE_BY_NAME } from '@/utils/tx'

interface Day { date: string; count: number; fees: bigint }
interface TypeStat { key: string; tone: string; count: number; fees: bigint }
const { t, te } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()
const days = ref(7)
const source = ref<'day' | 'legacy'>('day')

const isDayBuckets = (d: unknown): d is FeeDayBucket[] => Array.isArray(d) && (d.length === 0 || (typeof d[0]?.day === 'string' && 'count' in d[0]))

const sumTypes = (buckets: FeeDayBucket[]) => {
  const acc = new Map<string, TypeStat>()
  for (const b of buckets) {
    for (const [group, types] of Object.entries(b.types ?? {})) {
      for (const [type, s] of Object.entries(types)) {
        // node labels types with core names regardless of group ("2": {"multiPayment"} == typeGroup 2 / type 6)
        const typeNo = /^\d+$/.test(type) ? Number(type) : CORE_TYPE_BY_NAME[type]
        const kind = typeNo === undefined ? { key: type, tone: 'neutral' } : txKind({ typeGroup: Number(group), type: typeNo })
        const cur = acc.get(kind.key) ?? { key: kind.key, tone: kind.tone, count: 0, fees: 0n }
        cur.count += Number(s.count ?? 0)
        cur.fees += BigInt(s.sum ?? 0)
        acc.set(kind.key, cur)
      }
    }
  }
  return [...acc.values()].sort((a, b) => b.count - a.count)
}

// new node API: one request per period, closed days are cached inside the node
const fetchByDay = async (starts: dayjs.Dayjs[]): Promise<{ out: Day[]; types: TypeStat[] } | null> => {
  const res = await net.api.node.feesByDay(days.value)
  if (!isDayBuckets(res.data)) return null
  const byDay = new Map(res.data.map((b) => [b.day.slice(0, 10), b]))
  const out = starts.map((s) => {
    const b = byDay.get(s.format('YYYY-MM-DD'))
    return { date: s.format('DD.MM'), count: b?.count ?? 0, fees: BigInt(b?.sum ?? 0) }
  })
  return { out, types: sumTypes(res.data) }
}

// ---- legacy fallback (node without groupBy=day): one range query per calendar day ----
const PAGE = 100
const MAX_PAGES = 10
const CONCURRENCY = 2
const withRetry = async <T>(fn: () => Promise<T>, attempts = 4): Promise<T> => {
  for (let i = 1; ; i++) {
    try { return await fn() } catch (e: any) {
      const status = e?.status ?? 0
      if (i >= attempts || (status && status !== 502 && status !== 503 && status !== 504 && status !== 429)) throw e
      await new Promise((r) => setTimeout(r, 500 * i * i))
    }
  }
}
const epochUnix = computed(() => chain.epochUnix)
const fetchDayLegacy = async (start: dayjs.Dayjs): Promise<Day> => {
  const from = start.unix() - epochUnix.value
  const to = start.add(1, 'day').unix() - epochUnix.value - 1
  let count = 0, fees = 0n, page = 1
  while (page <= MAX_PAGES) {
    const res = await withRetry(() => net.api.transactions.list({ 'timestamp.from': from, 'timestamp.to': to, limit: PAGE, page }))
    res.data.forEach((tx) => { fees += BigInt(tx.fee ?? 0) })
    count += res.data.length
    if (res.data.length < PAGE) break
    page++
  }
  return { date: start.format('DD.MM'), count, fees }
}
const dayKey = (d: dayjs.Dayjs) => `sth:${net.currentId}:activity:${d.format('YYYY-MM-DD')}`
const loadDayLegacy = async (d: dayjs.Dayjs, isToday: boolean): Promise<Day> => {
  if (!isToday) {
    const hit = await idbGet<{ date: string; count: number; fees: string }>(dayKey(d)).catch(() => undefined)
    if (hit) return { ...hit, fees: BigInt(hit.fees) }
  }
  const day = await fetchDayLegacy(d)
  if (!isToday) void idbSet(dayKey(d), { ...day, fees: day.fees.toString() }).catch(() => undefined)
  return day
}
const fetchLegacy = async (starts: dayjs.Dayjs[]): Promise<Day[]> => {
  const out: Day[] = new Array(starts.length)
  progress.value = 0
  let next = 0
  const worker = async () => {
    while (next < starts.length) {
      const i = next++
      out[i] = await loadDayLegacy(starts[i], i === starts.length - 1)
      progress.value++
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return out
}

const progress = ref(0)
const typeStats = ref<TypeStat[]>([])
// last successful period snapshot in IndexedDB: shown instantly while the node answers
interface Snapshot { days: { date: string; count: number; fees: string }[]; types: { key: string; tone: string; count: number; fees: string }[] }
const snapKey = () => `sth:${net.currentId}:activity:period:${days.value}`
const stale = ref<Day[] | null>(null)
const restoreSnapshot = async () => {
  const hit = await idbGet<Snapshot>(snapKey()).catch(() => undefined)
  if (!hit) { stale.value = null; return }
  stale.value = hit.days.map((d) => ({ ...d, fees: BigInt(d.fees) }))
  typeStats.value = hit.types.map((s) => ({ ...s, fees: BigInt(s.fees) }))
}
const saveSnapshot = (out: Day[], types: TypeStat[]) =>
  idbSet(snapKey(), { days: out.map((d) => ({ ...d, fees: d.fees.toString() })), types: types.map((s) => ({ ...s, fees: s.fees.toString() })) } satisfies Snapshot).catch(() => undefined)

const { data, loading, error, reload } = useQuery(async () => {
  const today = dayjs.utc().startOf('day')
  const starts = Array.from({ length: days.value }, (_, i) => today.subtract(days.value - 1 - i, 'day'))
  await restoreSnapshot()
  const byDay = await fetchByDay(starts).catch(() => null)
  if (byDay) {
    source.value = 'day'
    typeStats.value = byDay.types
    void saveSnapshot(byDay.out, byDay.types)
    return { data: byDay.out }
  }
  source.value = 'legacy'
  typeStats.value = []
  const out = await fetchLegacy(starts)
  void saveSnapshot(out, [])
  return { data: out }
}, [days])

const view = computed(() => data.value ?? (loading.value ? stale.value : null) ?? [])
const countPoints = computed(() => view.value.map((d) => ({ label: d.date, value: d.count, title: `${d.date} · ${t('common.transactions')}` })))
const feePoints = computed(() => view.value.map((d) => ({ label: d.date, value: Number(d.fees) / 1e8, title: `${d.date} · ${t('common.fee')}` })))
const totalCount = computed(() => view.value.reduce((s, d) => s + d.count, 0))
const totalFees = computed(() => view.value.reduce((s, d) => s + d.fees, 0n))
const topTypes = computed(() => typeStats.value.slice(0, 8))
const toneClass: Record<string, string> = {
  cyan: 'bg-cyan/15 text-cyan', brand: 'bg-brand/15 text-brand', ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn',
  bad: 'bg-bad/15 text-bad', quantum: 'bg-quantum/15 text-quantum', neutral: 'bg-line/10 text-muted',
}
</script>

<template>
  <Panel :title="t('dashboard.activity')" :subtitle="t('dashboard.activitySub', { n: days })" data-testid="activity-panel">
    <template #actions>
      <div class="flex rounded-xl border hair overflow-hidden text-xs font-semibold" data-testid="activity-range">
        <button v-for="n in [7, 14, 30]" :key="n" class="px-2.5 py-1 transition-colors" :class="days === n ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="days = n" :data-testid="`activity-range-${n}`">{{ n }}d</button>
      </div>
    </template>
    <div v-if="loading && !view.length" class="px-5 pb-5">
      <div v-if="source === 'legacy'" class="flex items-center gap-3 text-xs text-muted mb-3" data-testid="activity-progress"><span class="h-1.5 w-1.5 rounded-full bg-cyan animate-pulseDot"></span>{{ t('dashboard.activityLoading', { done: progress, total: days }) }}
        <div class="flex-1 h-1 rounded-full bg-line/10 overflow-hidden"><div class="h-full bg-cyan transition-[width] duration-300" :style="{ width: (progress / days) * 100 + '%' }"></div></div></div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6"><div class="skeleton h-40"></div><div class="skeleton h-40"></div></div>
    </div>
    <StatePanel v-else-if="error && !loading" :error="error" @retry="reload" />
    <div v-else class="px-5 pb-5 space-y-5" :class="loading && 'opacity-80'" data-testid="activity-content">
      <div v-if="loading" class="flex items-center gap-2 text-[11px] text-muted -mt-1" data-testid="activity-refreshing"><span class="h-1.5 w-1.5 rounded-full bg-cyan animate-pulseDot"></span>{{ t('dashboard.activityRefreshing') }}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="flex items-baseline justify-between mb-3">
            <span class="eyebrow">{{ t('dashboard.txPerDay') }}</span>
            <span class="font-display text-xl font-semibold tabular-nums" data-testid="activity-total-tx">{{ totalCount.toLocaleString('en-US') }}</span>
          </div>
          <BarChart :points="countPoints" color="rgb(var(--c-cyan))" />
        </div>
        <div>
          <div class="flex items-baseline justify-between mb-3">
            <span class="eyebrow">{{ t('dashboard.feesPerDay') }}</span>
            <span class="font-display text-xl font-semibold tabular-nums mono" data-testid="activity-total-fees">{{ fromUnits(totalFees, 8, 2) }} <span class="text-xs text-muted font-sans">{{ net.current.symbol }}</span></span>
          </div>
          <BarChart :points="feePoints" color="rgb(var(--c-brand))" :format="(v) => v.toFixed(4) + ' ' + net.current.symbol" />
        </div>
      </div>
      <div v-if="topTypes.length" data-testid="activity-types">
        <div class="eyebrow mb-2">{{ t('dashboard.topTypes') }}</div>
        <div class="flex flex-wrap gap-2">
          <div v-for="s in topTypes" :key="s.key" class="flex items-center gap-2 rounded-lg border hair px-2.5 py-1.5 text-xs" :data-testid="`activity-type-${s.key}`" :title="`${t('common.fee')}: ${fromUnits(s.fees, 8, 4)} ${net.current.symbol}`">
            <span class="rounded-md px-1.5 py-0.5 font-semibold" :class="toneClass[s.tone] ?? toneClass.neutral">{{ te(`txs.types.${s.key}`) ? t(`txs.types.${s.key}`) : s.key }}</span>
            <span class="tabular-nums font-semibold">{{ s.count.toLocaleString('en-US') }}</span>
            <span class="mono text-muted">{{ fromUnits(s.fees, 8, 2) }} {{ net.current.symbol }}</span>
          </div>
        </div>
      </div>
    </div>
  </Panel>
</template>
