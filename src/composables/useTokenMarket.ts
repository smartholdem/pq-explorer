import { computed, type Ref } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useQuery } from '@/composables/useQuery'
import type { Token, TokenCandle } from '@/api/types'
import type { Candle } from '@/components/tokens/CandleChart.vue'
import { big, pricePerToken, priceFloat, tsUnix } from '@/utils/token'

export type ChartRange = '24h' | '7d' | '30d' | 'all'
const RANGE: Record<ChartRange, ['hour' | 'day', number]> = { '24h': ['hour', 1], '7d': ['hour', 7], '30d': ['day', 30], all: ['day', 0] }

// best ask, 24h last/change/volume and OHLCV candles of one token (prices converted to STH per whole token)
export function useTokenMarket(token: () => Token | null, range?: Ref<ChartRange>) {
  const net = useNetworkStore()
  const chain = useChainStore()
  const id = () => token()?.id
  const empty = { data: [] as never[] }
  const best = useQuery(async () => (id() ? net.api.tokens.orders(id()!, { page: 1, limit: 1 }) : empty), [id])
  const day = useQuery(async () => (id() ? net.api.tokens.candles(id()!, 'hour', 1) : empty), [id])
  const chartQ = range ? useQuery(async () => (id() ? net.api.tokens.candles(id()!, ...RANGE[range.value]) : empty), [id, range]) : null

  const toCandles = (rows: TokenCandle[] | null): Candle[] => {
    const tk = token()
    if (!tk || !rows) return []
    const d = 10 ** tk.decimals
    return rows.map((r) => ({
      t: tsUnix(r.timestamp, chain.epochUnix), o: priceFloat(r.open, tk.decimals), h: priceFloat(r.high, tk.decimals),
      l: priceFloat(r.low, tk.decimals), c: priceFloat(r.close, tk.decimals), v: Number(r.volume) / d, n: r.trades ?? 0,
    }))
  }
  const dayCandles = computed(() => toCandles(day.data.value as TokenCandle[] | null))
  const candles = computed(() => toCandles((chartQ?.data.value ?? null) as TokenCandle[] | null))

  const bestOrder = computed(() => best.data.value?.[0] ?? null)
  const bestPrice = computed(() => (bestOrder.value && token() ? pricePerToken(bestOrder.value.price, token()!.decimals) : null))
  const last = computed(() => dayCandles.value.at(-1)?.c ?? null)
  const change = computed(() => {
    const c = dayCandles.value
    return c.length && c[0].o ? ((c[c.length - 1].c - c[0].o) / c[0].o) * 100 : null
  })
  const volume = computed(() => (day.data.value as TokenCandle[] | null)?.reduce((s, r) => s + big(r.volume), 0n) ?? 0n)
  const value = computed(() => (day.data.value as TokenCandle[] | null)?.reduce((s, r) => s + big(r.value), 0n) ?? 0n)
  const trades = computed(() => dayCandles.value.reduce((s, c) => s + c.n, 0))
  const spark = computed(() => dayCandles.value.map((c) => ({ t: c.t * 1000, p: c.c })))

  return { best, day, chart: chartQ, bestOrder, bestPrice, last, change, volume, value, trades, candles, spark }
}
