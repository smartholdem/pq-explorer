<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ExternalLink, Search, X } from 'lucide-vue-next'
import OmniSearch from './OmniSearch.vue'
import NetworkSwitcher from './NetworkSwitcher.vue'
import PriceTicker from './PriceTicker.vue'
import ThemeToggle from './ThemeToggle.vue'
import LangToggle from './LangToggle.vue'
import BlockPulse from '@/components/ui/BlockPulse.vue'
import { useChainStore } from '@/stores/chain'
import { useNetworkStore } from '@/stores/network'
import { formatNumber } from '@/utils/format'
import ConnectionBanner from './ConnectionBanner.vue'

const chain = useChainStore()
const net = useNetworkStore()
const route = useRoute()
// phones: the inline search does not fit next to the controls → a search icon opens a full-width panel under the header
const mobileSearch = ref(false)
watch(() => route.fullPath, () => { mobileSearch.value = false })
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') mobileSearch.value = false }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
const nav = ['dashboard', 'blocks', 'transactions', 'mempool', 'wallets', 'delegates', 'tokens', 'market'] as const
const paths: Record<string, string> = { dashboard: '/', blocks: '/blocks', transactions: '/transactions', mempool: '/mempool', wallets: '/wallets', delegates: '/delegates', tokens: '/tokens', market: '/market' }
</script>

<template>
  <header class="sticky top-0 z-50 border-b hair" style="background: var(--glass); backdrop-filter: blur(20px)" data-testid="app-header">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
      <div class="h-16 flex items-center gap-4">
        <RouterLink to="/" class="flex items-center gap-3 shrink-0" data-testid="logo-link">
          <img src="/logo.png" alt="SmartHoldem" class="h-9 w-9 rounded-full" />
          <div class="leading-tight hidden sm:block">
            <div class="font-display font-semibold text-[15px] tracking-tight">{{ $t('app.name') }}</div>
            <div class="eyebrow text-[10px] text-cyan/80">{{ $t('app.sub') }}</div>
          </div>
        </RouterLink>

        <div class="hidden md:block flex-1 min-w-0 max-w-2xl mx-auto"><OmniSearch /></div>
        <div class="flex-1 md:hidden"></div>

        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="md:hidden h-10 w-10 rounded-full border hair flex items-center justify-center transition-colors" :class="mobileSearch ? 'bg-cyan/15 text-cyan border-cyan/40' : 'text-muted hover:text-fg'" :aria-label="$t('search.open')" :aria-expanded="mobileSearch" @click="mobileSearch = !mobileSearch" data-testid="mobile-search-toggle">
            <component :is="mobileSearch ? X : Search" class="h-4 w-4" />
          </button>
          <div v-if="chain.height" class="hidden lg:flex items-center gap-2 mono text-xs text-muted pe-2" data-testid="header-height">
            <BlockPulse :error="Boolean(chain.error)" />#{{ formatNumber(chain.height) }}
          </div>
          <PriceTicker v-if="!net.isTestnet" class="hidden sm:block" />
          <NetworkSwitcher />
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
      <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
        <div v-if="mobileSearch" class="md:hidden pb-3" data-testid="mobile-search-panel"><OmniSearch expanded autofocus @done="mobileSearch = false" /></div>
      </Transition>
      <nav class="flex gap-1 -mb-px overflow-x-auto no-scrollbar" data-testid="main-nav">
        <RouterLink
          v-for="n in nav" :key="n" :to="paths[n]"
          class="px-3 py-2.5 text-sm text-muted border-b-2 border-transparent hover:text-fg transition-colors whitespace-nowrap"
          active-class="!text-fg !border-brand"
          :exact-active-class="n === 'dashboard' ? '!text-fg !border-brand' : ''"
          :data-testid="`nav-${n}`"
        >{{ $t(`nav.${n}`) }}<span v-if="n === 'mempool' && (chain.metrics?.mempool.count ?? 0) > 0" class="ms-1.5 inline-flex items-center justify-center rounded-full bg-warn/20 text-warn text-[10px] font-bold px-1.5 min-w-[18px]" data-testid="nav-mempool-count">{{ chain.metrics?.mempool.count }}</span></RouterLink>
        <a
          href="https://planet.smartholdem.io/" target="_blank" rel="noopener"
          class="px-3 py-2.5 text-sm text-muted border-b-2 border-transparent hover:text-fg transition-colors whitespace-nowrap inline-flex items-center gap-1"
          data-testid="nav-visualization"
        >{{ $t('nav.visualization') }}<ExternalLink class="h-3 w-3 opacity-60" /></a>
      </nav>
    </div>
    <ConnectionBanner />
  </header>
</template>
