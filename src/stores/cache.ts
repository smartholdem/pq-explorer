import { defineStore } from 'pinia'
import { shallowRef, ref, watch, computed } from 'vue'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type { Block, Transaction, Meta } from '@/api/types'
import { useNetworkStore } from './network'
import { useChainStore } from './chain'

const MAX_BLOCKS = 1000
const MAX_TXS = 1000
const PAGE = 100
const SAVE_DEBOUNCE = 1500

// In-memory cache (like the legacy explorer store) persisted to IndexedDB: blocks/transactions are immutable,
// only confirmations/finality are recomputed from the live tip when read.
export const useCacheStore = defineStore('cache', () => {
  const net = useNetworkStore()
  const chain = useChainStore()

  const blocksById = new Map<string, Block>()
  const blocksByHeight = new Map<number, Block>()
  const txById = new Map<string, Transaction>()
  const blockTxs = new Map<string, Transaction[]>()
  const memoStore = new Map<string, { at: number; value: any }>()
  const recent = shallowRef<Block[]>([]) // contiguous, newest first
  const latestTxs = shallowRef<Transaction[] | null>(null)
  const latestTxsLoading = shallowRef(false)
  const latestTxsError = shallowRef<Error | null>(null)
  const hydrated = ref(false)
  const restored = ref({ blocks: 0, txs: 0 })
  let filling: Promise<void> | null = null
  let hydration: Promise<void> = Promise.resolve()
  let saveTimer: number | undefined
  let lastTop = 0
  let lastTxLoad = 0

  // ---- persistence (IndexedDB, one namespace per network) ----
  const key = (k: string) => `sth:${net.currentId}:${k}`
  const save = async () => {
    try {
      await Promise.all([
        idbSet(key('recent'), recent.value),
        idbSet(key('txs'), [...txById.entries()]),
        idbSet(key('blockTxs'), [...blockTxs.entries()]),
        idbSet(key('latestTxs'), latestTxs.value?.filter((t) => t.blockId) ?? null),
      ])
    } catch { /* storage unavailable (private mode) – memory cache still works */ }
  }
  const scheduleSave = () => { window.clearTimeout(saveTimer); saveTimer = window.setTimeout(save, SAVE_DEBOUNCE) }
  const hydrate = async () => {
    hydrated.value = false
    try {
      const [r, t, bt, lt] = await Promise.all([
        idbGet<Block[]>(key('recent')), idbGet<[string, Transaction][]>(key('txs')),
        idbGet<[string, Transaction[]][]>(key('blockTxs')), idbGet<Transaction[] | null>(key('latestTxs')),
      ])
      t?.forEach(([id, tx]) => txById.set(id, tx))
      bt?.forEach(([id, list]) => blockTxs.set(id, list))
      // a window older than one fetch page can't be bridged contiguously to the live tip: keep blocks for lookups only
      const fresh = r?.length && Date.now() / 1000 - r[0].timestamp.unix < PAGE * net.current.blocktime
      if (fresh) mergeRecent(r!)
      else r?.forEach(putBlock)
      if (lt?.length && !latestTxs.value) latestTxs.value = lt.filter((t) => t.blockId)
      restored.value = { blocks: r?.length ?? 0, txs: t?.length ?? 0 }
    } catch { /* ignore corrupt/absent storage */ }
    hydrated.value = true
    // restored lists are a snapshot from the last visit: always refresh them from the node right away
    void loadLatestTxs(true)
  }
  const clearPersisted = async () => {
    await Promise.all(['recent', 'txs', 'blockTxs', 'latestTxs'].map((k) => idbDel(key(k)).catch(() => undefined)))
    reset()
    restored.value = { blocks: 0, txs: 0 }
    // refill from the live tip right away instead of waiting for the next block with transactions
    void syncTip(chain.metrics?.blocks)
    void loadLatestTxs(true)
  }

  const reset = () => {
    blocksById.clear(); blocksByHeight.clear(); txById.clear(); blockTxs.clear(); memoStore.clear()
    recent.value = []; latestTxs.value = null; latestTxsError.value = null
    lastTop = 0; lastTxLoad = 0
  }

  const trimMaps = () => {
    while (blocksById.size > MAX_BLOCKS + PAGE) {
      const oldest = blocksById.keys().next().value as string
      const b = blocksById.get(oldest)
      blocksById.delete(oldest)
      if (b) blocksByHeight.delete(b.height)
    }
    while (txById.size > MAX_TXS) txById.delete(txById.keys().next().value as string)
    while (blockTxs.size > 200) blockTxs.delete(blockTxs.keys().next().value as string)
  }

  const putBlock = (b: Block) => { blocksById.set(b.id, b); blocksByHeight.set(b.height, b) }
  const putTx = (t: Transaction) => { if (t.blockId) txById.set(t.id, t) }

  const live = <T extends { confirmations: number; finalized?: boolean }>(item: T, height: number): T => {
    const tip = chain.height
    const fin = chain.metrics?.finality?.finalizedHeight ?? 0
    if (!tip) return item
    return { ...item, confirmations: Math.max(0, tip - height), finalized: item.finalized || (fin > 0 && height <= fin) }
  }
  const liveBlock = (b: Block) => live(b, b.height)
  const liveTx = (t: Transaction) => {
    const blk = t.blockId ? blocksById.get(t.blockId) : undefined
    return blk ? live(t, blk.height) : t
  }

  // merge a descending, contiguous batch into `recent`
  const mergeRecent = (batch: Block[]) => {
    if (!batch.length) return
    const byH = new Map<number, Block>(recent.value.map((b) => [b.height, b]))
    batch.forEach((b) => { byH.set(b.height, b); putBlock(b) })
    const sorted = [...byH.values()].sort((a, b) => b.height - a.height)
    const out: Block[] = []
    for (const b of sorted) {
      if (out.length && out[out.length - 1].height !== b.height + 1) break // stop at first gap
      out.push(b)
    }
    recent.value = out.slice(0, MAX_BLOCKS)
    trimMaps()
    scheduleSave()
  }

  const syncTip = async (tipBlocks: Block[] | undefined) => {
    if (!tipBlocks?.length) return
    await hydration
    const top = recent.value[0]?.height ?? 0
    const newest = tipBlocks[0].height
    if (top && newest - top > tipBlocks.length) {
      // gap larger than the metrics window – fetch the missing range (≤ 100)
      try {
        const res = await net.api.blocks.list({ limit: PAGE, 'height.from': top + 1, 'height.to': newest })
        mergeRecent(res.data)
      } catch { /* keep what we have */ }
    }
    mergeRecent(tipBlocks)
  }

  // grow the contiguous window backwards until it holds ≥ n blocks (n ≤ MAX_BLOCKS)
  const ensureRecent = async (n: number) => {
    n = Math.min(n, MAX_BLOCKS)
    await hydration
    if (recent.value.length >= n) return
    if (filling) { await filling; if (recent.value.length >= n) return }
    filling = (async () => {
      while (recent.value.length < n) {
        const tail = recent.value[recent.value.length - 1]
        if (tail && tail.height <= 1) break
        const res = await net.api.blocks.list(tail ? { limit: PAGE, 'height.to': tail.height - 1 } : { limit: PAGE })
        if (!res.data.length) break
        mergeRecent(res.data)
        if (res.data.length < PAGE) break
      }
    })().finally(() => { filling = null })
    await filling
  }

  const recentPage = async (page: number, limit: number): Promise<{ data: Block[]; meta: Meta } | null> => {
    const offset = (page - 1) * limit
    if (offset + limit > MAX_BLOCKS) return null
    await ensureRecent(offset + limit)
    if (recent.value.length < offset + limit) return null
    const tip = recent.value[0].height
    return {
      data: recent.value.slice(offset, offset + limit).map(liveBlock),
      meta: { count: limit, totalCount: tip, pageCount: Math.ceil(tip / limit), next: page * limit < tip ? 'cache' : null, previous: page > 1 ? 'cache' : null },
    }
  }

  const getBlock = async (idOrHeight: string | number): Promise<Block> => {
    await hydration
    const cached = typeof idOrHeight === 'number' || /^\d+$/.test(String(idOrHeight))
      ? blocksByHeight.get(Number(idOrHeight))
      : blocksById.get(String(idOrHeight))
    if (cached) return liveBlock(cached)
    const res = await net.api.blocks.get(idOrHeight)
    putBlock(res.data); trimMaps(); scheduleSave()
    return liveBlock(res.data)
  }

  const getBlockTxs = async (block: Block, page: number, limit: number) => {
    if (block.transactions <= PAGE) {
      let list = blockTxs.get(block.id)
      if (!list) {
        list = (await net.api.blocks.transactions(block.id, { limit: PAGE })).data
        blockTxs.set(block.id, list); list.forEach(putTx); trimMaps(); scheduleSave()
      }
      const start = (page - 1) * limit
      return { data: list.slice(start, start + limit).map(liveTx), meta: { count: list.length, totalCount: list.length, pageCount: Math.max(1, Math.ceil(list.length / limit)), next: null, previous: null } as Meta }
    }
    const res = await net.api.blocks.transactions(block.id, { page, limit })
    res.data.forEach(putTx)
    return { data: res.data, meta: res.meta ?? undefined }
  }

  const getTx = async (id: string): Promise<Transaction> => {
    await hydration
    const cached = txById.get(id)
    if (cached) return liveTx(cached)
    const res = await net.api.transactions.get(id)
    putTx(res.data); trimMaps(); scheduleSave()
    return liveTx(res.data)
  }

  const loadLatestTxs = async (force = false) => {
    if (latestTxsLoading.value) return
    if (latestTxs.value && !force) return
    latestTxsLoading.value = true
    try {
      const [confirmed, pending] = await Promise.all([
        net.api.transactions.list({ limit: 15 }),
        (chain.metrics?.mempool.count ?? 0) > 0 ? net.api.transactions.unconfirmed({ limit: 5 }).catch(() => ({ data: [] as Transaction[] })) : Promise.resolve({ data: [] as Transaction[] }),
      ])
      confirmed.data.forEach(putTx)
      latestTxs.value = [...pending.data, ...confirmed.data].slice(0, 15)
      latestTxsError.value = null
      lastTxLoad = Date.now()
      scheduleSave()
    } catch (e: any) {
      latestTxsError.value = e
    } finally {
      latestTxsLoading.value = false
    }
  }

  // short-lived memo for paginated lists (back navigation without re-querying the node)
  const memo = async <T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> => {
    const hit = memoStore.get(`${net.currentId}:${key}`)
    if (hit && Date.now() - hit.at < ttlMs) return hit.value as T
    const value = await fetcher()
    memoStore.set(`${net.currentId}:${key}`, { at: Date.now(), value })
    if (memoStore.size > 200) memoStore.delete(memoStore.keys().next().value as string)
    return value
  }

  // live view is trustworthy only when the node answers and our window has caught up with its tip
  const synced = computed(() => chain.connection === 'ok' && !!recent.value[0] && chain.height > 0 && recent.value[0].height >= chain.height - 1)

  const TX_REFRESH_MS = 60_000
  watch(() => chain.metrics?.blocks?.[0]?.id, () => {
    const blocks = chain.metrics?.blocks
    void syncTip(blocks)
    const top = blocks?.[0]
    if (!top) return
    // every block that arrived since the last tick counts (a background tab may skip ticks), not just the top one
    const fresh = blocks!.filter((b) => b.height > lastTop)
    const unseenGap = lastTop > 0 && top.height - lastTop > blocks!.length
    const hasPending = latestTxs.value?.some((t) => !t.blockId) ?? false
    const stale = Date.now() - lastTxLoad > TX_REFRESH_MS
    lastTop = top.height
    if (fresh.some((b) => (b.transactions ?? 0) > 0) || unseenGap || (chain.metrics?.mempool.count ?? 0) > 0 || hasPending || stale) void loadLatestTxs(true)
  })
  watch(() => net.currentId, () => { reset(); hydration = hydrate() })
  hydration = hydrate()

  return { recent, synced, latestTxs, latestTxsLoading, latestTxsError, hydrated, restored, recentPage, ensureRecent, getBlock, getBlockTxs, getTx, loadLatestTxs, memo, liveTx, liveBlock, clearPersisted }
})
