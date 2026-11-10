<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ShoppingBag, TrendingUp, TrendingDown, Users, CandlestickChart } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useTokensStore } from '@/stores/tokens'
import { useQuery } from '@/composables/useQuery'
import { useTokenMarket, type ChartRange } from '@/composables/useTokenMarket'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import StatCard from '@/components/ui/StatCard.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import CandleChart from '@/components/tokens/CandleChart.vue'
import OrderBook from '@/components/tokens/OrderBook.vue'
import TradesTable from '@/components/tokens/TradesTable.vue'
import TxTable from '@/components/tx/TxTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { formatNumber } from '@/utils/format'
import { big, tokenIdOf } from '@/utils/token'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const tokens = useTokensStore()
const route = useRoute()
const router = useRouter()
const { data: tk, loading, error, reload } = useQuery(() => net.api.tokens.get(props.id), [() => props.id])
watch(tk, (v) => { if (v) tokens.put(v) })
const notFound = computed(() => error.value instanceof ApiError && error.value.isNotFound)

const side = ref<'holders' | 'market'>(route.query.tab === 'market' ? 'market' : 'holders')
watch(side, (v) => router.replace({ query: { ...route.query, tab: v === 'market' ? 'market' : undefined } }))
const page = ref(1)
const limit = ref(25)
const holders = useQuery(async () => (tk.value ? net.api.tokens.holders(tk.value.id, { page: page.value, limit: limit.value }) : { data: [] }), [() => tk.value?.id, page, limit])
const share = (b: string) => (tk.value && tk.value.supply !== '0' ? (Number((BigInt(b) * 10000n) / BigInt(tk.value.supply)) / 100).toFixed(2) + '%' : '—')
// escrow of open orders is not part of holders' balances → shown as a separate "In orders" row
const openOrders = useQuery(async () => (tk.value ? net.api.tokens.orders(tk.value.id, { page: 1, limit: 100 }) : { data: [] }), [() => tk.value?.id])
const inOrders = computed(() => (openOrders.data.value ?? []).reduce((s, o) => s + big(o.remaining), 0n))

const range = ref<ChartRange>('24h')
const m = useTokenMarket(() => tk.value, range)
const recentTx = useQuery(async () => (tk.value ? net.api.transactions.list({ typeGroup: 3, limit: 100 }) : { data: [] }), [() => tk.value?.id])
const tokenTxs = computed(() => (recentTx.data.value ?? []).filter((x) => tokenIdOf(x) === tk.value?.id))
const website = computed(() => (tk.value?.meta?.website && /^https?:\/\//i.test(tk.value.meta.website) ? tk.value.meta.website : null))
const ranges: ChartRange[] = ['24h', '7d', '30d', 'all']
</script>

<template>
  <div data-testid="token-page">
    <PageHeader :title="tk ? `${tk.symbol}${tk.meta?.name ? ' · ' + tk.meta.name : ''}` : t('nav.tokens')" :subtitle="tk?.id ?? id">
      <template v-if="tk">
        <Pill v-if="tk.mintable" tone="ok">{{ t('tokens.mintable') }}</Pill><Pill v-if="tk.burnable" tone="brand">{{ t('tokens.burnable') }}</Pill>
        <Pill v-if="tk.sobj?.forSale && tk.sobj.price" tone="brand" glow data-testid="token-sobj-sale"><ShoppingBag class="h-3 w-3" />{{ t('tmarket.sobjSaleShort') }} <Amount :value="tk.sobj.price" :max-frac="2" /></Pill>
      </template>
    </PageHeader>
    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 5" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 10 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !tk"><StatePanel :error="notFound ? new Error(t('tokens.notFound')) : error" @retry="reload" /></Panel>
    <div v-else class="space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard :label="t('tmarket.bestAsk')" tone="ok" :loading="m.best.loading.value && !m.best.data.value" :sub="t('tmarket.perToken', { s: tk.symbol })" data-testid="token-stat-best">
          <Amount v-if="m.bestPrice.value !== null" :value="m.bestPrice.value.toString()" /><span v-else class="text-muted text-base">{{ t('tmarket.noAsks') }}</span>
        </StatCard>
        <StatCard :label="t('tmarket.lastPrice')" tone="cyan" :loading="m.day.loading.value && !m.day.data.value" data-testid="token-stat-last">
          <span v-if="m.last.value !== null" class="mono">{{ m.last.value.toPrecision(6).replace(/\.?0+$/, '') }}<span class="text-muted text-[0.6em] ms-1">{{ net.current.symbol }}</span></span><span v-else class="text-muted text-base">—</span>
          <template #sub><span v-if="m.change.value !== null" class="inline-flex items-center gap-1" :class="m.change.value >= 0 ? 'text-ok' : 'text-bad'"><component :is="m.change.value >= 0 ? TrendingUp : TrendingDown" class="h-3 w-3" />{{ m.change.value >= 0 ? '+' : '' }}{{ m.change.value.toFixed(2) }}% · 24h</span></template>
        </StatCard>
        <StatCard :label="t('tmarket.volume24')" tone="brand" :loading="m.day.loading.value && !m.day.data.value" data-testid="token-stat-volume">
          <Amount :value="m.value.value.toString()" :max-frac="2" />
          <template #sub><Amount :value="m.volume.value.toString()" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="tk.symbol" /> · {{ t('tmarket.tradesN', { n: m.trades.value }) }}</template>
        </StatCard>
        <StatCard :label="t('common.supply')" tone="quantum" data-testid="token-stat-supply">
          <Amount :value="tk.supply" :decimals="tk.decimals" :max-frac="Math.min(tk.decimals, 2)" :symbol="null" />
          <template #sub>{{ t('tmarket.inOrders') }}: <Amount :value="inOrders.toString()" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="tk.symbol" /></template>
        </StatCard>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div class="xl:col-span-2 space-y-6 min-w-0">
          <Panel :title="t('common.details')">
            <div class="px-5 pb-4 flex items-center gap-4">
              <TokenLogo :token-key="tk.id" :symbol="tk.symbol" :size="56" />
              <div class="min-w-0"><div class="font-display text-2xl font-semibold">{{ tk.symbol }}</div><p v-if="tk.meta?.description" class="text-sm text-muted break-words" data-testid="token-description">{{ tk.meta.description }}</p></div>
            </div>
            <dl class="border-t hair">
              <DetailRow :label="t('common.id')" mono><HashLink :value="tk.id" full /></DetailRow>
              <DetailRow :label="t('common.supply')"><Amount :value="tk.supply" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="tk.symbol" /></DetailRow>
              <DetailRow :label="t('common.supplyCap')"><Amount v-if="tk.supplyCap && tk.supplyCap !== '0'" :value="tk.supplyCap" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="tk.symbol" /><span v-else>∞</span></DetailRow>
              <DetailRow :label="t('tmarket.inOrders')"><Amount :value="inOrders.toString()" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="tk.symbol" /></DetailRow>
              <DetailRow :label="t('common.decimals')" mono>{{ tk.decimals }}</DetailRow>
              <DetailRow :label="t('common.owner')"><HashLink :value="tk.owner" :to="`/wallet/${tk.owner}`" full /></DetailRow>
              <DetailRow :label="t('tokens.initHeight')" mono><RouterLink :to="`/block/${tk.initHeight}`" class="link">#{{ formatNumber(tk.initHeight) }}</RouterLink></DetailRow>
              <DetailRow v-if="website" :label="t('common.website')"><a :href="website" class="link break-all" target="_blank" rel="noopener noreferrer nofollow">{{ website }}</a></DetailRow>
              <DetailRow label="SmartObject">
                <span v-if="tk.sobj?.forSale && tk.sobj.price" class="text-brand font-semibold" data-testid="token-sobj-sale-row">{{ t('tmarket.sobjSale') }} <Amount :value="tk.sobj.price" /></span>
                <span v-else class="text-muted">{{ tk.sobj?.resigned ? t('common.resigned') : t('tmarket.sobjNotForSale') }}</span>
                <RouterLink :to="`/sobj/${tk.id}`" class="link text-xs ms-2">{{ t('tmarket.openObject') }} →</RouterLink>
              </DetailRow>
            </dl>
          </Panel>

          <Panel :title="t('tmarket.chart')" :subtitle="t('tmarket.chartSub', { s: tk.symbol, q: net.current.symbol })">
            <template #actions>
              <div class="flex rounded-xl border hair overflow-hidden text-xs font-semibold" data-testid="token-chart-range">
                <button v-for="r in ranges" :key="r" class="px-2.5 py-1 transition-colors" :class="range === r ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="range = r" :data-testid="`token-chart-${r}`">{{ r === 'all' ? t('tmarket.all') : r }}</button>
              </div>
            </template>
            <div class="px-5 pb-5">
              <div v-if="m.chart?.loading.value && !m.chart?.data.value" class="skeleton h-60"></div>
              <CandleChart v-else :candles="m.candles.value" :symbol="tk.symbol" :quote="net.current.symbol" />
            </div>
          </Panel>

          <Panel :title="t('tmarket.trades')"><TradesTable :token="tk" /></Panel>

          <Panel :title="t('tmarket.tokenTxs')" :subtitle="t('tmarket.tokenTxsSub')">
            <TxTable :txs="tokenTxs" :loading="recentTx.loading.value" :error="recentTx.error.value" :empty-message="t('tmarket.noTokenTxs')" @retry="recentTx.reload" />
          </Panel>
        </div>

        <Panel class="self-start xl:sticky xl:top-24">
          <div class="flex border-b hair text-sm font-semibold" data-testid="token-side-tabs">
            <button class="flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors border-b-2" :class="side === 'holders' ? 'border-cyan text-cyan' : 'border-transparent text-muted hover:text-fg'" @click="side = 'holders'" data-testid="token-tab-holders"><Users class="h-3.5 w-3.5" />{{ t('tokens.holders') }}</button>
            <button class="flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors border-b-2" :class="side === 'market' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-fg'" @click="side = 'market'" data-testid="token-tab-market"><CandlestickChart class="h-3.5 w-3.5" />{{ t('tmarket.marketTab') }}<span v-if="openOrders.data.value?.length" class="mono text-[10px] opacity-70">{{ openOrders.data.value.length }}</span></button>
          </div>
          <template v-if="side === 'holders'">
            <SkeletonRows v-if="holders.loading.value" :rows="8" :cols="2" />
            <StatePanel v-else-if="!holders.data.value?.length" empty />
            <div v-else class="divide-y hair" data-testid="token-holders">
              <div v-if="inOrders > 0n && page === 1" class="px-5 py-2.5 flex items-center gap-3 text-sm bg-brand/5" data-testid="token-holders-in-orders">
                <span class="w-6"></span><span class="text-brand font-semibold">{{ t('tmarket.inOrders') }}</span>
                <div class="ms-auto text-end"><Amount :value="inOrders.toString()" :decimals="tk.decimals" :max-frac="Math.min(tk.decimals, 2)" :symbol="null" /><div class="text-[11px] text-muted mono">{{ share(inOrders.toString()) }}</div></div>
              </div>
              <div v-for="(h, i) in holders.data.value" :key="h.address" class="px-5 py-2.5 flex items-center gap-3 text-sm">
                <span class="mono text-muted w-6 text-end">{{ (page - 1) * limit + i + 1 }}</span>
                <HashLink :value="h.address" :to="`/wallet/${h.address}`" :head="8" :tail="6" :copy="false" />
                <div class="ms-auto text-end"><Amount :value="h.balance" :decimals="tk.decimals" :symbol="null" :max-frac="Math.min(tk.decimals, 2)" /><div class="text-[11px] text-muted mono">{{ share(h.balance) }}</div></div>
              </div>
            </div>
            <Pagination :page="page" :meta="holders.meta.value" :limit="limit" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
          </template>
          <template v-else>
            <div class="px-5 py-3 flex items-center justify-between gap-3 text-sm border-b hair">
              <span class="eyebrow text-[10px]">{{ t('tmarket.bestAsk') }}</span>
              <span class="font-semibold text-ok" data-testid="token-market-best"><Amount v-if="m.bestPrice.value !== null" :value="m.bestPrice.value.toString()" /><span v-else class="text-muted">—</span></span>
            </div>
            <OrderBook :token="tk" />
          </template>
        </Panel>
      </div>
    </div>
  </div>
</template>
