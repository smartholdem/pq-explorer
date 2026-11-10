import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useCacheStore } from '@/stores/cache'
import { forgingOrder, roundOf, slotOf } from '@/utils/rounds'

export interface MissedSlot { slot: number; round: number; unix: number; afterHeight: number; publicKey: string; live?: boolean }

// A miss is an empty slot, not a long gap: between two chain-adjacent blocks every skipped slot s belongs
// to order[s % active] of the round of the next height (DPoS order is reshuffled per round, so a delegate's
// own blocks may legitimately be 1…2·active blocks apart).
export function useMissedSlots(windowBlocks = 1000) {
  const net = useNetworkStore()
  const chain = useChainStore()
  const cache = useCacheStore()
  const active = computed(() => chain.config?.constants?.activeDelegates ?? net.current.activeDelegates)
  const blocktime = computed(() => chain.config?.constants?.blocktime ?? net.current.blocktime)
  const epochUnix = computed(() => chain.epochUnix)

  const missed = shallowRef<MissedSlot[]>([])
  const forged = shallowRef<Map<string, number>>(new Map())
  const loading = ref(true)
  const error = ref<Error | null>(null)
  const coverage = shallowRef<{ from: number; to: number; rounds: number } | null>(null)
  const tipOrder = shallowRef<string[] | null>(null)
  let run = 0

  const compute = async () => {
    const mine = ++run
    try {
      await cache.ensureRecent(windowBlocks)
      const blocks = [...cache.recent].reverse() // ascending
      if (mine !== run || blocks.length < 2) return
      const n = active.value
      const rounds = new Set<number>()
      for (let i = 1; i < blocks.length; i++) rounds.add(roundOf(blocks[i].height, n))
      const tip = blocks[blocks.length - 1]
      rounds.add(roundOf(tip.height + 1, n))
      const orders = new Map<number, string[]>()
      const list = [...rounds]
      let next = 0
      const worker = async () => {
        while (next < list.length) {
          const r = list[next++]
          orders.set(r, await forgingOrder(net.api, net.currentId, r).catch(() => []))
        }
      }
      await Promise.all(Array.from({ length: 4 }, worker))
      if (mine !== run) return
      const out: MissedSlot[] = []
      const f = new Map<string, number>()
      for (let i = 1; i < blocks.length; i++) {
        const prev = blocks[i - 1], cur = blocks[i]
        f.set(cur.generator.publicKey, (f.get(cur.generator.publicKey) ?? 0) + 1)
        const s0 = slotOf(prev.timestamp.epoch, blocktime.value), s1 = slotOf(cur.timestamp.epoch, blocktime.value)
        if (s1 - s0 < 2) continue
        const order = orders.get(roundOf(cur.height, n)) ?? []
        if (!order.length) continue
        for (let s = s0 + 1; s < s1; s++) out.push({ slot: s, round: roundOf(cur.height, n), unix: epochUnix.value + s * blocktime.value, afterHeight: prev.height, publicKey: order[s % n] })
      }
      missed.value = out
      forged.value = f
      tipOrder.value = orders.get(roundOf(tip.height + 1, n)) ?? null
      coverage.value = { from: blocks[0].height, to: tip.height, rounds: rounds.size - 1 }
      error.value = null
    } catch (e: any) {
      if (mine === run) error.value = e
    } finally {
      if (mine === run) loading.value = false
    }
  }

  // slots being skipped right now (tip is older than one slot): culprits come from the order of round(tip + 1).
  // Blocks reach us with polling + propagation lag, so only slots that ended ≥ GRACE_SLOTS ago count as missed.
  const GRACE_SLOTS = 3
  const now = ref(Math.floor(Date.now() / 1000))
  const tick = window.setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 2000)
  onUnmounted(() => clearInterval(tick))
  const live = computed<MissedSlot[]>(() => {
    const tip = cache.recent[0]
    const order = tipOrder.value
    if (!tip || !order?.length || !cache.synced) return []
    const tipSlot = slotOf(tip.timestamp.epoch, blocktime.value)
    const nowSlot = slotOf(now.value - epochUnix.value, blocktime.value)
    const out: MissedSlot[] = []
    const round = roundOf(tip.height + 1, active.value)
    // bounded: only the last 3 rounds matter for "missing now"; a long stall must not grow this list without limit
    for (let s = Math.max(tipSlot + 1, nowSlot - 3 * active.value); s <= nowSlot - GRACE_SLOTS; s++) out.push({ slot: s, round, unix: epochUnix.value + s * blocktime.value, afterHeight: tip.height, publicKey: order[s % active.value], live: true })
    return out
  })

  const all = computed(() => [...missed.value, ...live.value])
  const byPk = computed(() => {
    const m = new Map<string, MissedSlot[]>()
    for (const x of all.value) { const l = m.get(x.publicKey) ?? []; l.push(x); m.set(x.publicKey, l) }
    return m
  })
  const roundSeconds = computed(() => active.value * blocktime.value)
  // misses inside the last `rounds` rounds – the "is it broken right now" signal
  const recentMissed = (pk: string, rounds = 3) => (byPk.value.get(pk) ?? []).filter((x) => x.unix >= now.value - rounds * roundSeconds.value).length
  // newest block forged by pk inside the window (live, updates with every tick)
  const lastForgedUnix = computed(() => {
    const m = new Map<string, number>()
    for (const b of cache.recent) if (!m.has(b.generator.publicKey)) m.set(b.generator.publicKey, b.timestamp.unix)
    return m
  })
  // still failing = missed recently AND has not forged a block since its latest miss; a delegate that forged again has recovered
  const stillMissing = (pk: string, rounds = 3) => {
    if (!cache.synced) return false
    const misses = (byPk.value.get(pk) ?? []).filter((x) => x.unix >= now.value - rounds * roundSeconds.value)
    if (!misses.length) return false
    const lastMiss = Math.max(...misses.map((x) => x.unix))
    return (lastForgedUnix.value.get(pk) ?? 0) < lastMiss
  }

  watch(() => [net.currentId, cache.recent[0]?.id], compute, { immediate: true })
  return { missed, live, all, byPk, forged, recentMissed, stillMissing, loading, error, coverage, active, blocktime, roundSeconds, reload: compute }
}
