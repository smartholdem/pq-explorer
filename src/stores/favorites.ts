import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useNetworkStore } from './network'

export type FavKind = 'wallet' | 'delegate'
export interface Favorite { kind: FavKind; id: string; label?: string; addedAt: number }

// pinned wallets/delegates live only in this browser (localStorage), keyed per network
export const useFavoritesStore = defineStore('favorites', () => {
  const net = useNetworkStore()
  const key = () => `sth.favorites.${net.currentId}`
  const load = (): Favorite[] => { try { return JSON.parse(localStorage.getItem(key()) ?? '[]') } catch { return [] } }
  const items = ref<Favorite[]>(load())
  watch(() => net.currentId, () => { items.value = load() })
  watch(items, (v) => localStorage.setItem(key(), JSON.stringify(v)), { deep: true })

  const has = (kind: FavKind, id: string) => items.value.some((f) => f.kind === kind && f.id === id)
  const toggle = (kind: FavKind, id: string, label?: string) => {
    if (has(kind, id)) items.value = items.value.filter((f) => !(f.kind === kind && f.id === id))
    else items.value = [{ kind, id, label, addedAt: Date.now() }, ...items.value]
  }
  const remove = (kind: FavKind, id: string) => toggle(kind, id)
  const wallets = computed(() => items.value.filter((f) => f.kind === 'wallet'))
  const delegates = computed(() => items.value.filter((f) => f.kind === 'delegate'))
  return { items, wallets, delegates, has, toggle, remove }
})
