<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Boxes, Layers, Network, Cpu, Timer, Star } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'
import StatCard from '@/components/ui/StatCard.vue'
import Panel from '@/components/ui/Panel.vue'
import BlocksTable from '@/components/blocks/BlocksTable.vue'
import QuantumShieldCard from '@/components/dashboard/QuantumShieldCard.vue'
import FinalityCard from '@/components/dashboard/FinalityCard.vue'
import LatestTransactions from '@/components/dashboard/LatestTransactions.vue'
import ActivityChart from '@/components/dashboard/ActivityChart.vue'
import NetworkStatusBar from '@/components/dashboard/NetworkStatusBar.vue'
import PriceCard from '@/components/dashboard/PriceCard.vue'
import FavoritesPanel from '@/components/dashboard/FavoritesPanel.vue'
import { useFavoritesStore } from '@/stores/favorites'
import { useNetworkStore } from '@/stores/network'
import { usePrice } from '@/composables/usePrice'
import BlockPulse from '@/components/ui/BlockPulse.vue'
import { useCacheStore } from '@/stores/cache'
import { formatNumber, formatBytes, formatDuration } from '@/utils/format'

const { t } = useI18n()
const chain = useChainStore()
const net = useNetworkStore()
const { ticker } = usePrice()
// desktop: the price card takes the Node slot (node version/uptime remain in the Sync card); phones keep Node, price lives in the status bar
const showPrice = computed(() => !net.isTestnet && Boolean(ticker.value))
const cache = useCacheStore()
const m = computed(() => chain.metrics)
const loading = computed(() => !m.value)
const peers = computed(() => (m.value?.ntfry?.known ?? 0) + (m.value?.legacy?.alive ?? 0))
const blocks = computed(() => (cache.recent.length ? cache.recent.slice(0, 15).map(cache.liveBlock) : m.value?.blocks?.slice(0, 12) ?? null))
const fav = useFavoritesStore()
// pinned items come first: land on Favourites whenever the visitor has any
const tab = ref<'txs' | 'blocks' | 'favorites'>(fav.items.length ? 'favorites' : 'txs')
</script>

<template>
  <div class="space-y-6" data-testid="dashboard">
    <div class="flex items-start justify-between animate-rise">
      <div>
        <div class="eyebrow text-cyan/80 mb-1">{{ $t('app.tagline') }}</div>
        <h1 class="font-display text-3xl md:text-4xl font-semibold tracking-tight">{{ t('dashboard.title') }}</h1>
      </div>
      <div class="hidden sm:flex items-center gap-2 text-xs text-muted" data-testid="live-indicator">
        <BlockPulse :error="Boolean(chain.error)" />
        {{ chain.error ? $t('network.unreachable') : t('dashboard.live') }}
      </div>
    </div>

    <NetworkStatusBar />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard :label="t('dashboard.height')" tone="cyan" :loading="loading" :value="formatNumber(m?.chain.height)" :sub="m ? t('dashboard.lastBlock', { n: m.chain.lastBlockAge }) : ''" data-testid="stat-height">
        <template #icon><Boxes class="h-4 w-4 text-cyan/70" /></template>
      </StatCard>
      <StatCard :label="t('dashboard.mempool')" tone="brand" :loading="loading" :value="formatNumber(m?.mempool.count)" :sub="m ? t('dashboard.mempoolSub', { count: m.mempool.count, max: formatNumber(m.mempool.max), bytes: formatBytes(m.mempool.bytes) }) : ''" data-testid="stat-mempool">
        <template #icon><RouterLink to="/mempool" class="link" data-testid="stat-mempool-link"><Layers class="h-4 w-4 text-brand/70 hover:text-brand" /></RouterLink></template>
      </StatCard>
      <StatCard :label="t('dashboard.peers')" tone="ok" :loading="loading" :value="formatNumber(peers)" :sub="m ? t('dashboard.peersSub', { ntfry: m.ntfry?.known ?? 0, legacy: m.legacy?.alive ?? 0 }) : ''" data-testid="stat-peers">
        <template #icon><Network class="h-4 w-4 text-ok/70" /></template>
      </StatCard>
      <PriceCard v-if="showPrice" class="hidden sm:block" data-testid="stat-price" />
      <StatCard :label="t('dashboard.node')" tone="neutral" :loading="loading" :sub="m ? t('dashboard.uptime', { t: formatDuration(m.node.uptime) }) : ''" :class="showPrice && 'sm:hidden'" data-testid="stat-node">
        <template #icon><Cpu class="h-4 w-4 text-muted" /></template>
        <span class="text-xl md:text-2xl">PQ <span class="text-cyan">v{{ m?.node.version }}</span></span>
      </StatCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <QuantumShieldCard />
      <FinalityCard />
      <StatCard :label="t('dashboard.sync')" tone="cyan" :loading="loading" data-testid="stat-sync">
        <template #icon><Timer class="h-4 w-4 text-cyan/70" /></template>
        <span :class="m?.chain.syncing ? 'text-warn' : 'text-ok'">{{ m?.chain.syncing ? t('dashboard.behind', { n: m?.chain.behind }) : t('dashboard.synced') }}</span>
        <template #sub>
          <div class="space-y-0.5 mono">
            <div>{{ t('dashboard.blockTime') }}: {{ m?.chain.blockTime }}s · {{ t('dashboard.blocksPerMin', { n: m?.chain.blocksPerMin }) }}</div>
            <div v-if="m?.intake">{{ t('dashboard.intake', { ms: m.intake.avgDelayMs }) }}</div>
            <div v-if="m?.delegates">{{ t('dashboard.delegates') }}: {{ m.delegates.active }} · {{ t('dashboard.rustNodes', { rust: m.delegates.rust ?? 0, legacy: m.delegates.active - (m.delegates.rust ?? 0) }) }}</div>
            <div v-if="m && showPrice" class="hidden sm:block" data-testid="sync-node-line">{{ t('dashboard.node') }}: PQ v{{ m.node.version }} · {{ t('dashboard.uptime', { t: formatDuration(m.node.uptime) }) }}</div>
          </div>
        </template>
      </StatCard>
    </div>

    <ActivityChart />

    <Panel data-testid="latest-panel">
      <template #actions>
        <RouterLink v-if="tab !== 'favorites'" :to="tab === 'txs' ? '/transactions' : '/blocks'" class="link text-xs font-medium whitespace-nowrap" data-testid="latest-view-all">{{ t('common.viewAll') }} →</RouterLink>
      </template>
      <div class="px-5 -mt-1 flex gap-1 border-b hair" data-testid="latest-tabs">
        <button
          v-for="k in ['favorites', 'txs', 'blocks'] as const" :key="k"
          class="px-3 py-2.5 -mb-px border-b-2 text-sm transition-colors inline-flex items-center gap-1.5"
          :class="tab === k ? 'border-brand text-fg font-display font-semibold text-base' : 'border-transparent text-muted hover:text-fg'"
          @click="tab = k" :data-testid="`latest-tab-${k}`"
        ><Star v-if="k === 'favorites'" class="h-3.5 w-3.5" :class="fav.items.length ? 'text-warn fill-current' : ''" />{{ k === 'txs' ? t('dashboard.latestTxs') : k === 'blocks' ? t('dashboard.latestBlocks') : t('fav.title') }}<span v-if="k === 'favorites' && fav.items.length" class="mono text-[11px] rounded-md px-1.5 bg-warn/15 text-warn" data-testid="fav-count">{{ fav.items.length }}</span></button>
      </div>
      <FavoritesPanel v-if="tab === 'favorites'" />
      <LatestTransactions v-else-if="tab === 'txs'" />
      <BlocksTable v-else :blocks="blocks" :loading="loading" :error="chain.error ? new Error(chain.error) : null" @retry="chain.refresh()" />
    </Panel>
  </div>
</template>
