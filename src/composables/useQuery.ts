import { ref, shallowRef, watch, onUnmounted, type WatchSource } from 'vue'
import type { ApiResponse, Meta } from '@/api/types'
import { useNetworkStore } from '@/stores/network'

export function useQuery<T>(fetcher: (signal: AbortSignal) => Promise<ApiResponse<T>>, deps: WatchSource[] = [], keepStale = false) {
  const net = useNetworkStore()
  const data = shallowRef<T | null>(null)
  const meta = shallowRef<Meta | null>(null)
  const loading = ref(true)
  const error = ref<Error | null>(null)
  let ctrl: AbortController | null = null

  const load = async () => {
    ctrl?.abort()
    ctrl = new AbortController()
    const mine = ctrl
    loading.value = true
    error.value = null
    try {
      const res = await fetcher(mine.signal)
      if (mine.signal.aborted) return
      data.value = res.data
      meta.value = res.meta ?? null
    } catch (e: any) {
      if (mine.signal.aborted) return
      error.value = e
      if (!keepStale) data.value = null
    } finally {
      if (!mine.signal.aborted) loading.value = false
    }
  }

  watch([() => net.currentId, ...deps], load, { immediate: true })
  onUnmounted(() => ctrl?.abort())
  return { data, meta, loading, error, reload: load }
}
