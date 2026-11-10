import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Metrics, NodeConfiguration } from '@/api/types'
import { useNetworkStore } from './network'

export const useChainStore = defineStore('chain', () => {
  const net = useNetworkStore()
  const metrics = ref<Metrics | null>(null)
  const config = ref<NodeConfiguration | null>(null)
  const error = ref<string | null>(null)
  const updatedAt = ref(0)
  let timer: number | undefined
  let inflight = false

  // genesis epoch of the connected node (testnets restart with their own epoch): node config → any block's unix−epoch → network preset
  const epochUnix = computed(() => {
    const c = config.value?.constants?.epoch
    if (c && !Number.isNaN(Date.parse(c))) return Math.floor(Date.parse(c) / 1000)
    const b = metrics.value?.blocks?.[0]
    if (b) return b.timestamp.unix - b.timestamp.epoch
    return Math.floor(Date.parse(net.current.epoch) / 1000)
  })
  const height = computed(() => metrics.value?.chain.height ?? 0)
  const pqActive = computed(() => Boolean(config.value?.pq.active) || (metrics.value?.node.pqActive ?? 0) > 0)
  const supply = ref<string | null>(null)
  const burned = ref<string | null>(null)
  // burned shown rounded UP to whole STH so a partially burned coin is never hidden; circulating = supply − that
  const burnedRounded = computed(() => (burned.value ? ((BigInt(burned.value) + 99_999_999n) / 100_000_000n) * 100_000_000n : 0n))
  const circulating = computed(() => (supply.value ? (BigInt(supply.value) - burnedRounded.value).toString() : null))
  let ticks = 0

  // connection health: browser offline, node errors, or a sleeping tab whose last metrics are stale
  const online = ref(navigator.onLine)
  const now = ref(Date.now())
  window.addEventListener('online', () => { online.value = true; void refresh() })
  window.addEventListener('offline', () => { online.value = false })
  window.setInterval(() => { now.value = Date.now() }, 1000)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { now.value = Date.now(); void refresh() } })
  const connection = computed<'ok' | 'connecting' | 'offline'>(() => {
    if (!online.value) return 'offline'
    if (error.value || !updatedAt.value || now.value - updatedAt.value > 3 * net.current.blocktime * 1000) return 'connecting'
    return 'ok'
  })

  const loadSupply = async () => {
    try {
      const [bc, genesis, burn] = await Promise.all([
        net.api.blockchain(),
        net.api.blocks.get(1).catch(() => null),
        net.current.burnAddress ? net.api.wallets.get(net.current.burnAddress).catch(() => null) : Promise.resolve(null),
      ])
      // total supply is fixed at genesis (block 1 forged amount); node /blockchain supply is the fallback
      supply.value = genesis?.data.forged?.amount && genesis.data.forged.amount !== '0' ? genesis.data.forged.amount : bc.data.supply
      burned.value = burn?.data.balance ?? '0'
    } catch { /* optional */ }
  }

  const refresh = async () => {
    if (inflight) return
    inflight = true
    try {
      const res = await net.api.ntfry.metrics()
      metrics.value = res.data
      error.value = null
      updatedAt.value = Date.now()
      if (ticks++ % 8 === 0) void loadSupply()
    } catch (e: any) {
      error.value = e?.message ?? 'metrics unavailable'
    } finally {
      inflight = false
    }
  }
  const loadConfig = async () => {
    try { config.value = (await net.api.node.configuration()).data } catch { config.value = null }
  }

  const start = () => {
    stop()
    void refresh(); void loadConfig()
    timer = window.setInterval(refresh, net.current.blocktime * 1000)
  }
  const stop = () => { if (timer) window.clearInterval(timer); timer = undefined }

  watch(() => net.currentId, () => { metrics.value = null; config.value = null; supply.value = null; burned.value = null; ticks = 0; start() })

  return { metrics, connection, epochUnix, config, error, updatedAt, height, pqActive, supply, burned, burnedRounded, circulating, refresh, loadConfig, start, stop }
})
