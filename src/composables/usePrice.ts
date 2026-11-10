import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export interface Ticker {
  price: number
  change24h: number | null
  change7d?: number | null
  change30d?: number | null
  changeAll?: number | null
  high24h?: number | null
  low24h?: number | null
  since?: string | null
  updatedAt: string | null
}
export interface Sample { t: number; p: number }
export type Range = '24h' | '7d' | '1m' | 'all'
export const RANGES: Range[] = ['24h', '7d', '1m', 'all']
export const RANGE_LABEL: Record<Range, string> = { '24h': '24h', '7d': '7d', '1m': '1M', all: 'All' }
const RANGE_MS: Record<Range, number> = { '24h': 24 * 3_600_000, '7d': 7 * 24 * 3_600_000, '1m': 30 * 24 * 3_600_000, all: Infinity }

const BASE = 'https://exchange.smartholdem.io/xbts'
export const POOL_URL = 'https://trade.xbts.io/defi/pool/XBTSX.SHU'
const KEY = 'sth.ticker'
const SAMPLES_KEY = 'sth.ticker.samples'
const REFRESH_MS = 120_000
const HISTORY_TTL_MS = 5 * 60_000
const BUCKET_MS = 10 * 60_000
const KEEP_MS = 7 * 24 * 3_600_000

const readJson = <T>(key: string, fallback: T): T => {
  try { return (JSON.parse(localStorage.getItem(key) || 'null') as T) ?? fallback } catch { return fallback }
}

const fetchJson = async (path: string) => {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// /ticker (cached on the exchange server, with period changes) → falls back to the bare /pool price when unavailable
export const fetchTicker = async (): Promise<Ticker> => {
  try {
    const t = await fetchJson('/ticker/sth-usdt')
    if (typeof t.price === 'number' && t.price > 0) return { ...t, change24h: t.change24h ?? null, updatedAt: t.updatedAt ?? null }
  } catch { /* try legacy endpoint */ }
  const p = await fetchJson('/pool/sth-usdt')
  if (typeof p.price !== 'number' || !(p.price > 0)) throw new Error('bad price')
  return { price: p.price, change24h: null, updatedAt: new Date().toISOString() }
}

const ticker = ref<Ticker | null>(readJson<Ticker | null>(KEY, null))
const error = ref(false)
// price log this browser collected itself — fallback chart source while the exchange history is unavailable
const localSamples = ref<Sample[]>(readJson<Sample[]>(SAMPLES_KEY, []))
// server candles per range (close prices), refreshed lazily with a TTL
const serverSeries = ref<Partial<Record<Range, { at: number; points: Sample[]; change: number | null }>>>({})
let timer: ReturnType<typeof setInterval> | undefined
let subscribers = 0

const recordLocal = (p: number) => {
  const now = Date.now()
  const arr = localSamples.value.filter((s) => now - s.t <= KEEP_MS)
  const last = arr[arr.length - 1]
  if (last && Math.floor(last.t / BUCKET_MS) === Math.floor(now / BUCKET_MS)) arr[arr.length - 1] = { t: now, p }
  else arr.push({ t: now, p })
  localSamples.value = arr
  localStorage.setItem(SAMPLES_KEY, JSON.stringify(arr))
}

const loadHistory = async (range: Range) => {
  const cur = serverSeries.value[range]
  if (cur && Date.now() - cur.at < HISTORY_TTL_MS) return
  try {
    const h = await fetchJson(`/ticker/sth-usdt/history?range=${range}`)
    if (!Array.isArray(h.candles)) return
    const points = h.candles.filter((c: any) => typeof c.t === 'number' && typeof c.c === 'number').map((c: any) => ({ t: c.t, p: c.c }))
    serverSeries.value = { ...serverSeries.value, [range]: { at: Date.now(), points, change: typeof h.change === 'number' ? h.change : null } }
  } catch {
    serverSeries.value = { ...serverSeries.value, [range]: { at: Date.now(), points: [], change: null } }
  }
}

const refresh = async () => {
  try {
    ticker.value = await fetchTicker()
    error.value = false
    localStorage.setItem(KEY, JSON.stringify(ticker.value))
    recordLocal(ticker.value.price)
  } catch {
    error.value = true
  }
}

const localPoints = (range: Range) => {
  const from = Date.now() - RANGE_MS[range]
  return localSamples.value.filter((s) => s.t >= from)
}

// chart series: server candles when they exist, otherwise what this browser collected
export const pointsFor = (range: Range): Sample[] => {
  const srv = serverSeries.value[range]
  if (srv && srv.points.length >= 2) return srv.points
  return localPoints(range)
}

// % move over the window: server value, else derived from local samples when they reach back far enough
export const changeFor = (range: Range): number | null => {
  const fromTicker = range === '24h' ? ticker.value?.change24h : range === '7d' ? ticker.value?.change7d : range === '1m' ? ticker.value?.change30d : ticker.value?.changeAll
  if (typeof fromTicker === 'number') return fromTicker
  const srv = serverSeries.value[range]
  if (srv && srv.change !== null) return srv.change
  if (range === 'all') return null
  const pts = localPoints(range)
  const first = pts[0]
  const last = ticker.value?.price ?? pts[pts.length - 1]?.p
  if (!first || !last || first.p <= 0 || Date.now() - first.t < RANGE_MS[range] * 0.8) return null
  return Number((((last - first.p) / first.p) * 100).toFixed(2))
}

export const isServerSeries = (range: Range) => (serverSeries.value[range]?.points.length ?? 0) >= 2
const change24h = computed(() => changeFor('24h'))

// shared singleton: several instances (header chip, dashboard card, wallet rows) poll once
export function usePrice() {
  onMounted(() => { if (subscribers++ === 0) { void refresh(); timer = setInterval(refresh, REFRESH_MS) } })
  onBeforeUnmount(() => { if (--subscribers === 0) clearInterval(timer) })
  return { ticker, error, change24h, serverSeries, localSamples, loadHistory, refresh }
}

export const formatPrice = (p: number) => {
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return Number(p.toPrecision(4)).toString()
}

export const formatUsd = (v: number, precise = false) => {
  if (precise) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })
  if (v >= 1) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (v === 0) return '0.00'
  return Number(v.toPrecision(3)).toString()
}

// USD value of an STH amount in base units; null on testnet or while the price is unknown
export const usdOf = (value: string | number | bigint | null | undefined, decimals = 8, testnet = false): number | null => {
  if (testnet || !ticker.value || value === null || value === undefined) return null
  return (Number(value) / 10 ** decimals) * ticker.value.price
}

export const formatChange = (c: number | null) => (c === null ? '—' : `${c > 0 ? '+' : ''}${c.toFixed(2)}%`)
export const changeTone = (c: number | null) => (c === null || c === 0 ? 'text-muted' : c > 0 ? 'text-ok' : 'text-bad')
