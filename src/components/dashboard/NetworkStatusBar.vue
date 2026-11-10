<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, HardDrive, Trash2 } from 'lucide-vue-next'
import { useChainStore } from '@/stores/chain'
import { useNetworkStore } from '@/stores/network'
import { useCacheStore } from '@/stores/cache'
import { formatNumber, fromUnits } from '@/utils/format'
import { changeTone, formatChange, formatPrice, pointsFor, usePrice } from '@/composables/usePrice'
import PriceSparkline from '@/components/ui/PriceSparkline.vue'
import PriceCard from './PriceCard.vue'

const chain = useChainStore()
const net = useNetworkStore()
const cache = useCacheStore()
const cacheSize = computed(() => cache.recent.length)
const { ticker, change24h, serverSeries, localSamples, loadHistory } = usePrice()
const showPrice = ref(false)
onMounted(() => { if (!net.isTestnet) void loadHistory('24h') })
</script>

<template>
  <div class="card !rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs animate-rise" data-testid="network-status-bar">
    <span class="text-muted">{{ $t('common.height') }}: <RouterLink v-if="chain.height" :to="`/block/${chain.height}`" class="mono font-semibold text-cyan" data-testid="status-height">{{ formatNumber(chain.height) }}</RouterLink><span v-else class="mono">—</span></span>
    <span class="text-muted">{{ $t('network.switch') }}: <span class="font-semibold" :class="net.isTestnet ? 'text-warn' : 'text-quantum'" data-testid="status-network">{{ net.current.alias }}</span></span>
    <span class="text-muted">{{ $t('common.supply') }}: <span class="mono font-semibold text-cyan" data-testid="status-supply">{{ chain.supply ? fromUnits(chain.supply, 8, 0) : '—' }} {{ net.current.symbol }}</span></span>
    <span v-if="net.current.burnAddress" class="text-muted">{{ $t('dashboard.burned') }}: <RouterLink :to="`/wallet/${net.current.burnAddress}`" class="mono font-semibold text-warn" data-testid="status-burned">{{ chain.burned ? fromUnits(chain.burnedRounded, 8, 0) : '—' }} {{ net.current.symbol }}</RouterLink><span v-if="chain.metrics?.burn?.tokenInitBurn && chain.metrics.burn.tokenInitBurn !== '0'" class="text-muted text-[11px] ms-1" data-testid="status-burned-tokens">({{ $t('tmarket.burnedByTokens') }}: {{ fromUnits(chain.metrics.burn.tokenInitBurn, 8, 0) }})</span></span>
    <span class="text-muted">{{ $t('dashboard.circulating') }}: <span class="mono font-semibold text-ok" data-testid="status-circulating">{{ chain.circulating ? fromUnits(chain.circulating, 8, 0) : '—' }} {{ net.current.symbol }}</span></span>
    <button v-if="!net.isTestnet && ticker" type="button" class="sm:hidden text-muted inline-flex items-center gap-1.5 text-start" @click="showPrice = !showPrice" data-testid="status-price">
      {{ $t('price.label') }}: <span class="mono font-semibold text-fg">{{ formatPrice(ticker.price) }}</span><span class="mono font-semibold" :class="changeTone(change24h)" data-testid="status-price-change">{{ formatChange(change24h) }}</span>
      <PriceSparkline :points="(serverSeries, localSamples, pointsFor('24h'))" :height="14" :tooltip="false" class="w-12" />
      <ChevronDown class="h-3 w-3 transition-transform" :class="showPrice && 'rotate-180'" />
    </button>
    <PriceCard v-if="showPrice && !net.isTestnet" compact class="sm:hidden basis-full !p-2.5" data-testid="status-price-card" />
    <span class="ms-auto hidden md:inline-flex items-center gap-2 text-muted mono" data-testid="status-cache">
      <HardDrive class="h-3 w-3" />{{ $t('dashboard.cached', { n: cacheSize }) }}<span v-if="cache.restored.blocks" class="text-cyan/70" data-testid="status-cache-restored">· {{ $t('dashboard.restored', { b: cache.restored.blocks, t: cache.restored.txs }) }}</span>
      <button class="text-muted/70 hover:text-bad transition-colors" :title="$t('dashboard.clearCache')" @click="cache.clearPersisted()" data-testid="clear-cache-btn"><Trash2 class="h-3 w-3" /></button>
    </span>
  </div>
</template>
