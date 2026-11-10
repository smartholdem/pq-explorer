import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
import type { Transaction } from '@/api/types'
import { useNetworkStore } from './network'
import { useChainStore } from './chain'

export interface PendingTx extends Transaction { seenAt: number }
export interface LeftTx extends PendingTx { leftAt: number }

// Live mempool: refreshed on every chain tick (blocktime); tracks arrivals and departures
export const useMempoolStore = defineStore('mempool', () => {
  const net = useNetworkStore()
  const chain = useChainStore()
  const pending = shallowRef<PendingTx[]>([])
  const left = shallowRef<LeftTx[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const lastSync = ref(0)
  let inflight = false

  const refresh = async () => {
    if (inflight) return
    inflight = true
    loading.value = pending.value.length === 0 && lastSync.value === 0
    try {
      const count = chain.metrics?.mempool.count
      const data = count === 0 ? [] : (await net.api.transactions.unconfirmed({ limit: 100 })).data
      const now = Date.now()
      const prev = new Map(pending.value.map((t) => [t.id, t]))
      const next: PendingTx[] = data.map((t) => ({ ...t, seenAt: prev.get(t.id)?.seenAt ?? now }))
      const ids = new Set(next.map((t) => t.id))
      const gone = pending.value.filter((t) => !ids.has(t.id)).map((t) => ({ ...t, leftAt: now }))
      if (gone.length) left.value = [...gone, ...left.value].slice(0, 30)
      pending.value = next.sort((a, b) => b.seenAt - a.seenAt)
      error.value = null
      lastSync.value = now
    } catch (e: any) {
      error.value = e
    } finally {
      loading.value = false
      inflight = false
    }
  }

  watch(() => chain.updatedAt, () => void refresh())
  watch(() => net.currentId, () => { pending.value = []; left.value = []; lastSync.value = 0 })

  return { pending, left, loading, error, lastSync, refresh }
})
