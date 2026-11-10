<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useChainStore } from '@/stores/chain'
import { useUiStore } from '@/stores/ui'
import { useCacheStore } from '@/stores/cache'
import { setDayjsLocale } from '@/utils/format'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import PwaShell from '@/components/layout/PwaShell.vue'
import PullToRefresh from '@/components/layout/PullToRefresh.vue'
import ScrollTop from '@/components/layout/ScrollTop.vue'

const chain = useChainStore()
const ui = useUiStore()
useCacheStore()
watch(() => ui.locale, (l) => { void setDayjsLocale(l) }, { immediate: true })
onMounted(() => { chain.start(); void useCacheStore().ensureRecent(300) })
// pull-to-refresh: refetch chain tip + latest lists and remount the current view so every useQuery re-runs
const viewKey = ref(0)
const onRefresh = async (done: () => void) => {
  const cache = useCacheStore()
  await Promise.allSettled([chain.refresh(), cache.loadLatestTxs(true)])
  viewKey.value++
  setTimeout(done, 350)
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />
    <PwaShell />
    <PullToRefresh @refresh="onRefresh" />
    <ScrollTop />
    <main class="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page" mode="out-in">
          <component :is="Component" :key="route.fullPath + ':' + viewKey" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
  </div>
</template>
