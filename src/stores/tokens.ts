import { defineStore } from 'pinia'
import { reactive } from 'vue'
import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { Token } from '@/api/types'
import { useNetworkStore } from './network'

// token dictionary (symbol/decimals never change, meta/supply rarely): memory + IndexedDB, per network
export const useTokensStore = defineStore('tokens', () => {
  const net = useNetworkStore()
  const map = reactive(new Map<string, Token | null>())
  const pending = new Set<string>()
  const hydrated = new Set<string>()
  let saveTimer: number | undefined

  const k = (id: string) => `${net.currentId}:${id}`
  const save = () => {
    window.clearTimeout(saveTimer)
    saveTimer = window.setTimeout(() => {
      const prefix = `${net.currentId}:`
      const entries = [...map.entries()].filter(([key, v]) => v && key.startsWith(prefix)).map(([key, v]) => [key.slice(prefix.length), v])
      void idbSet(`sth:${net.currentId}:tokens`, entries).catch(() => undefined)
    }, 1000)
  }
  const hydrate = async () => {
    if (hydrated.has(net.currentId)) return
    hydrated.add(net.currentId)
    try {
      const rows = await idbGet<[string, Token][]>(`sth:${net.currentId}:tokens`)
      rows?.forEach(([id, tk]) => { if (!map.has(k(id))) { map.set(k(id), tk); map.set(k(tk.symbol), tk) } })
    } catch { /* storage unavailable */ }
  }

  const put = (tk: Token) => { map.set(k(tk.id), tk); map.set(k(tk.symbol), tk); save() }
  const load = async (id: string) => {
    if (pending.has(k(id))) return
    pending.add(k(id))
    try { put((await net.api.tokens.get(id)).data) } catch { map.set(k(id), null) } finally { pending.delete(k(id)) }
  }
  // reactive lookup by id or ticker; schedules a fetch on miss
  const get = (id: string | null | undefined): Token | null => {
    if (!id) return null
    void hydrate()
    if (!map.has(k(id))) void load(id)
    return map.get(k(id)) ?? null
  }
  return { get, put }
})
