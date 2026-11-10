import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

// one shared PWA state: update availability, offline-ready, install prompt, connectivity
const needRefresh = ref(false)
const offlineReady = ref(false)
const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)
const installEvent = ref<(Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }) | null>(null)
const installed = ref(typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches)
let update: ((reload?: boolean) => Promise<void>) | null = null
let booted = false

export function usePwa() {
  if (!booted && typeof window !== 'undefined') {
    booted = true
    update = registerSW({ immediate: true, onNeedRefresh: () => (needRefresh.value = true), onOfflineReady: () => (offlineReady.value = true) })
    window.addEventListener('online', () => (online.value = true))
    window.addEventListener('offline', () => (online.value = false))
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent.value = e as typeof installEvent.value })
    window.addEventListener('appinstalled', () => { installed.value = true; installEvent.value = null })
  }
  const applyUpdate = () => update?.(true)
  const install = async () => {
    const ev = installEvent.value
    if (!ev) return
    await ev.prompt()
    const { outcome } = await ev.userChoice
    if (outcome === 'accepted') installEvent.value = null
  }
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !installed.value
  return { needRefresh, offlineReady, online, installEvent, installed, isIos, applyUpdate, install }
}
