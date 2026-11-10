<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { WifiOff, Loader2 } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'

const { t } = useI18n()
const chain = useChainStore()
</script>

<template>
  <Transition name="page">
    <div v-if="chain.connection !== 'ok'" class="absolute inset-x-0 top-full z-40 flex justify-center px-4 pt-3 pointer-events-none" data-testid="connection-banner" :data-state="chain.connection">
      <div class="pointer-events-auto inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xl"
        :class="chain.connection === 'offline' ? 'border-bad/40 bg-bad/15 text-bad' : 'border-warn/40 bg-warn/15 text-warn'">
        <WifiOff v-if="chain.connection === 'offline'" class="h-3.5 w-3.5" />
        <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
        <span data-testid="connection-banner-text">{{ chain.connection === 'offline' ? t('conn.offline') : t('conn.connecting') }}</span>
        <span class="hidden sm:inline font-normal opacity-80">· {{ t('conn.hint') }}</span>
      </div>
    </div>
  </Transition>
</template>
