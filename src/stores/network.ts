import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import mainnet from '../../networks/mainnet.json'
import testnet from '../../networks/testnet.json'
import { ApiClient } from '@/api/client'
import { createApi } from '@/api/endpoints'

export interface NetworkConfig {
  id: string
  title: string
  alias: string
  server: string
  nethash: string
  token: string
  symbol: string
  version: number
  addressPrefix: string
  activeDelegates: number
  blocktime: number
  epoch: string
  explorer: string
  burnAddress?: string
  delegateSources?: string[]
  knownWallets: string
}

export const NETWORKS: NetworkConfig[] = [mainnet, testnet]
const KEY = 'sth.network'

const resolveBase = (n: NetworkConfig) => {
  const proxy = import.meta.env.VITE_API_PROXY_BASE
  return proxy ? `${proxy.replace(/\/$/, '')}/api/proxy/${n.id}` : n.server
}

export const useNetworkStore = defineStore('network', () => {
  const saved = localStorage.getItem(KEY)
  const currentId = ref(NETWORKS.some((n) => n.id === saved) ? (saved as string) : NETWORKS[0].id)
  const current = computed(() => NETWORKS.find((n) => n.id === currentId.value) ?? NETWORKS[0])
  const client = computed(() => new ApiClient(resolveBase(current.value)))
  const api = computed(() => createApi(client.value))
  // extra read-only nodes whose Netfory view is merged with the primary one (each node only knows the delegates it has seen)
  const sourceApis = computed(() => {
    const proxy = import.meta.env.VITE_API_PROXY_BASE
    const extras = (current.value.delegateSources ?? []).map((url, i) =>
      createApi(new ApiClient(proxy ? `${proxy.replace(/\/$/, '')}/api/proxy-src/${current.value.id}/${i}` : url)))
    return [api.value, ...extras]
  })
  const isTestnet = computed(() => currentId.value !== 'mainnet')
  const usingProxy = Boolean(import.meta.env.VITE_API_PROXY_BASE)
  const knownWallets = ref<Record<string, string>>({})

  const loadKnownWallets = async () => {
    knownWallets.value = {}
    const url = current.value.knownWallets
    if (!url) return
    try {
      const res = await fetch(url)
      if (res.ok) knownWallets.value = (await res.json()) as Record<string, string>
    } catch { /* offline: labels are optional */ }
  }
  const walletLabel = (address: string | null | undefined) => (address ? knownWallets.value[address] ?? null : null)

  watch(currentId, (v) => { localStorage.setItem(KEY, v); void loadKnownWallets() }, { immediate: true })
  const switchTo = (id: string) => { if (NETWORKS.some((n) => n.id === id)) currentId.value = id }

  // per-peer client: direct http://ip:port/api locally, or via the restricted /api/peer proxy on hosted setups
  const peerApi = (ip: string, port: number) => {
    const proxy = import.meta.env.VITE_API_PROXY_BASE
    const base = proxy ? `${proxy.replace(/\/$/, '')}/api/peer/${current.value.id}/${ip}/${port}` : `http://${ip}:${port}/api`
    return createApi(new ApiClient(base, 8000))
  }

  return { currentId, current, client, api, sourceApis, peerApi, isTestnet, usingProxy, networks: NETWORKS, knownWallets, walletLabel, switchTo }
})
