<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw, WifiOff, Download, X, Share } from 'lucide-vue-next'
import { usePwa } from '@/composables/usePwa'

const { t } = useI18n()
const pwa = usePwa()
const offlineToast = ref(false)
watch(pwa.offlineReady, (v) => { if (v) { offlineToast.value = true; setTimeout(() => (offlineToast.value = false), 4000) } })
const installDismissed = ref(localStorage.getItem('sth.install-dismissed') === '1')
const dismissInstall = () => { installDismissed.value = true; localStorage.setItem('sth.install-dismissed', '1') }
const iosHint = ref(false)
</script>

<template>
  <div>
    <div v-if="!pwa.online.value" class="bg-warn/15 text-warn text-xs text-center py-1.5 px-4 flex items-center justify-center gap-2 border-b border-warn/30" data-testid="offline-banner"><WifiOff class="h-3.5 w-3.5" />{{ t('pwa.offline') }}</div>
    <Teleport to="body">
      <div class="fixed inset-x-0 bottom-0 z-[90] pointer-events-none flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition duration-150" leave-to-class="opacity-0">
          <div v-if="pwa.needRefresh.value" class="pointer-events-auto card px-4 py-3 flex items-center gap-3 text-sm shadow-glow" data-testid="pwa-update">
            <RefreshCw class="h-4 w-4 text-cyan" /><span>{{ t('pwa.updateReady') }}</span>
            <button class="btn-primary !py-1 !px-3 text-xs" @click="pwa.applyUpdate()" data-testid="pwa-update-btn">{{ t('pwa.reload') }}</button>
          </div>
        </Transition>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition duration-150" leave-to-class="opacity-0">
          <div v-if="offlineToast" class="pointer-events-auto card px-4 py-2 text-xs text-muted" data-testid="pwa-offline-ready">{{ t('pwa.offlineReady') }}</div>
        </Transition>
        <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 translate-y-2" leave-active-class="transition duration-150" leave-to-class="opacity-0">
          <div v-if="(pwa.installEvent.value || pwa.isIos) && !pwa.installed.value && !installDismissed" class="pointer-events-auto card px-4 py-3 flex items-center gap-3 text-sm md:hidden shadow-glow w-full max-w-sm" data-testid="pwa-install">
            <img src="/icon-192.png" alt="" class="h-9 w-9 rounded-xl" />
            <div class="min-w-0 flex-1"><div class="font-display font-semibold text-sm">{{ t('pwa.installTitle') }}</div><div class="text-[11px] text-muted truncate">{{ t('pwa.installSub') }}</div></div>
            <button v-if="pwa.installEvent.value" class="btn-primary !py-1.5 !px-3 text-xs" @click="pwa.install()" data-testid="pwa-install-btn"><Download class="h-3.5 w-3.5" />{{ t('pwa.install') }}</button>
            <button v-else class="btn-ghost !py-1.5 !px-3 text-xs" @click="iosHint = !iosHint" data-testid="pwa-ios-btn"><Share class="h-3.5 w-3.5" /></button>
            <button class="text-muted hover:text-fg" @click="dismissInstall" data-testid="pwa-install-dismiss"><X class="h-4 w-4" /></button>
          </div>
        </Transition>
        <div v-if="iosHint" class="pointer-events-auto card px-4 py-3 text-xs text-muted max-w-sm" data-testid="pwa-ios-hint">{{ t('pwa.iosHint') }}</div>
      </div>
    </Teleport>
  </div>
</template>
