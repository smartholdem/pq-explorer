<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, Store, Boxes, Tag, Coins, CandlestickChart } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShipLink from '@/components/ui/ShipLink.vue'
import Panel from '@/components/ui/Panel.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SobjCard, { type SobjCardItem } from '@/components/sobj/SobjCard.vue'
import TokenMarketCard from '@/components/tokens/TokenMarketCard.vue'
import { fromUnits } from '@/utils/format'
import type { SObject, MarketOrder } from '@/api/types'

const { t } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()
const route = useRoute()
const router = useRouter()
const tab = ref<'tokens' | 'sobj'>(route.query.tab === 'sobj' ? 'sobj' : 'tokens')
watch(tab, (v) => router.replace({ query: { ...route.query, tab: v === 'tokens' ? undefined : v } }))
const sub = ref<'orders' | 'objects'>('orders')
const typeFilter = ref<'all' | 5 | 4 | 'app'>('all')
const q = ref('')
const page = ref(1)
const limit = ref(24)

// --- token market (SHIP-43): one card per token, each token has its own order book on /token/:id
const tokens = useQuery(() => net.api.tokens.list({ limit: 100 }))
const tm = computed(() => chain.config?.constants?.tokenMarket ?? null)
const tokenList = computed(() => (tokens.data.value ?? []).filter((tk) => !q.value || `${tk.symbol} ${tk.meta?.name ?? ''} ${tk.id}`.toLowerCase().includes(q.value.trim().toLowerCase())))

// --- whole SmartObject sales (SHIP-16)
const market = useQuery(() => net.api.ntfry.market({ limit: 100 }))
const objects = useQuery(() => net.api.sobj.list({ page: page.value, limit: limit.value }), [page, limit], true)
const matchType = (type: number) => typeFilter.value === 'all' || (typeFilter.value === 'app' ? type !== 4 && type !== 5 : type === typeFilter.value)
const matchQ = (name: string, owner: string) => !q.value || name.toLowerCase().includes(q.value.trim().toLowerCase()) || owner.toLowerCase().includes(q.value.trim().toLowerCase())
const orderItems = computed<SobjCardItem[]>(() => (market.data.value?.orders ?? [])
  .filter((o: MarketOrder) => matchType(o.type) && matchQ(o.name, o.owner))
  .map((o) => ({ id: o.id, name: o.name, type: o.type, subType: o.subType, owner: o.owner, price: o.price, forSale: true, token: o.token })))
const objectItems = computed<SobjCardItem[]>(() => (objects.data.value ?? [])
  .filter((s: SObject) => matchType(s.type) && matchQ(s.data?.name ?? '', s.address))
  .map((s) => ({ id: s.id, name: s.data?.name ?? '—', type: s.type, subType: s.subType, owner: s.address, price: s.price, forSale: s.forSale, resigned: s.isResigned })))
const items = computed(() => (sub.value === 'orders' ? orderItems.value : objectItems.value))
const sobjLoading = computed(() => (sub.value === 'orders' ? market.loading.value && !market.data.value : objects.loading.value && !objects.data.value))
const sobjError = computed(() => (sub.value === 'orders' ? market.error.value : objects.error.value))
const sobjReload = () => (sub.value === 'orders' ? market.reload() : objects.reload())
const orders = computed(() => market.data.value?.orders ?? [])
const floor = computed(() => (orders.value.length ? orders.value.reduce((m, o) => (BigInt(o.price) < m ? BigInt(o.price) : m), BigInt(orders.value[0].price)) : null))
const filters = [{ key: 'all', label: 'common.all' }, { key: 5, label: 'sobj.types.ticker' }, { key: 4, label: 'sobj.types.delegate' }, { key: 'app', label: 'sobj.types.app' }] as const
</script>

<template>
  <div data-testid="market-page">
    <PageHeader :title="t('tmarket.title')">
      <template #subtitle><i18n-t keypath="tmarket.subtitle" tag="span" scope="global"><template #ships><ShipLink :n="43" />/<ShipLink :n="16" /></template></i18n-t></template>
      <Pill v-if="tm" :tone="tm.enabled ? 'ok' : 'neutral'" data-testid="token-market-status">{{ tm.enabled ? t('common.active') : t('tmarket.notActive') }}</Pill>
    </PageHeader>

    <div class="flex flex-col md:flex-row md:items-center gap-3 mb-5">
      <div class="flex rounded-xl border hair overflow-hidden text-sm font-semibold" data-testid="market-tabs">
        <button class="px-4 py-2 transition-colors flex items-center gap-2" :class="tab === 'tokens' ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="tab = 'tokens'" data-testid="market-tab-tokens"><CandlestickChart class="h-3.5 w-3.5" />{{ t('tmarket.tabTokens') }} <span class="mono text-xs opacity-70">{{ tokens.data.value?.length ?? '' }}</span></button>
        <button class="px-4 py-2 transition-colors flex items-center gap-2" :class="tab === 'sobj' ? 'bg-quantum/15 text-quantum' : 'text-muted hover:text-fg'" @click="tab = 'sobj'" data-testid="market-tab-sobj"><Boxes class="h-3.5 w-3.5" />{{ t('tmarket.tabSobj') }} <span class="mono text-xs opacity-70">{{ orders.length || '' }}</span></button>
      </div>
      <label class="relative md:ms-auto flex-1 md:max-w-xs">
        <Search class="h-3.5 w-3.5 text-muted absolute start-3 top-1/2 -translate-y-1/2" />
        <input v-model="q" type="search" :placeholder="tab === 'tokens' ? t('tmarket.search') : t('sobj.search')" class="w-full rounded-xl border hair bg-transparent ps-8 pe-3 py-2 text-sm outline-none focus:border-cyan/40 transition-colors" data-testid="market-search" />
      </label>
    </div>

    <template v-if="tab === 'tokens'">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard :label="t('nav.tokens')" tone="cyan" :value="tokens.data.value?.length ?? '—'" :loading="tokens.loading.value && !tokens.data.value" data-testid="tm-stat-tokens"><template #icon><Coins class="h-4 w-4 text-cyan/70" /></template></StatCard>
        <StatCard :label="t('tmarket.feeSell')" tone="brand" :value="tm ? `${fromUnits(tm.fees?.sell, 8, 2)} ${net.current.symbol}` : '—'" :sub="tm ? t('tmarket.maxOpen', { n: tm.maxOpenOrders }) : ''" data-testid="tm-stat-sell"><template #icon><Tag class="h-4 w-4 text-brand/70" /></template></StatCard>
        <StatCard :label="t('tmarket.feeBuy')" tone="ok" :value="tm ? `${fromUnits(tm.fees?.buy, 8, 2)} ${net.current.symbol}` : '—'" data-testid="tm-stat-buy"><template #icon><Store class="h-4 w-4 text-ok/70" /></template></StatCard>
        <StatCard :label="t('tmarket.feeCancel')" tone="neutral" :value="tm ? `${fromUnits(tm.fees?.cancel, 8, 2)} ${net.current.symbol}` : '—'" data-testid="tm-stat-cancel"><template #icon><Store class="h-4 w-4 text-muted" /></template></StatCard>
      </div>
      <Panel v-if="tokens.loading.value && !tokens.data.value" pad><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2"><div v-for="i in 6" :key="i" class="skeleton h-48"></div></div></Panel>
      <Panel v-else-if="tokens.error.value"><StatePanel :error="tokens.error.value" @retry="tokens.reload" /></Panel>
      <Panel v-else-if="!tokenList.length"><StatePanel :message="q ? t('sobj.noMatch') : tm && !tm.enabled ? t('tmarket.inactiveHint') : t('tokens.noTokens')" empty /></Panel>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="token-market-grid">
        <TokenMarketCard v-for="tk in tokenList" :key="tk.id" :token="tk" />
      </div>
    </template>

    <template v-else>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard :label="t('sobj.openOrders')" tone="brand" :value="orders.length" :loading="market.loading.value && !market.data.value" data-testid="market-stat-orders"><template #icon><Tag class="h-4 w-4 text-brand/70" /></template></StatCard>
        <StatCard :label="t('sobj.floor')" tone="cyan" :value="floor !== null ? `${fromUnits(floor, 8, 2)} ${net.current.symbol}` : '—'" :loading="market.loading.value && !market.data.value" data-testid="market-stat-floor"><template #icon><Coins class="h-4 w-4 text-cyan/70" /></template></StatCard>
        <StatCard :label="t('sobj.registered')" tone="quantum" :value="objects.meta.value?.totalCount ?? objects.data.value?.length ?? '—'" :loading="objects.loading.value && !objects.data.value" :sub="t('sobj.registeredSub')" data-testid="market-stat-objects"><template #icon><Boxes class="h-4 w-4 text-quantum/70" /></template></StatCard>
        <StatCard :label="t('market.fees')" tone="neutral" :value="market.data.value ? `${fromUnits(market.data.value.fees.sell, 8, 0)} / ${fromUnits(market.data.value.fees.buy, 8, 0)} ${net.current.symbol}` : '—'" :loading="market.loading.value && !market.data.value" :sub="`${t('market.sell')} / ${t('market.buy')}`"><template #icon><Store class="h-4 w-4 text-muted" /></template></StatCard>
      </div>
      <div class="flex flex-wrap items-center gap-3 mb-5">
        <div class="flex rounded-xl border hair overflow-hidden text-xs font-semibold" data-testid="market-sobj-sub">
          <button class="px-3 py-2 transition-colors" :class="sub === 'orders' ? 'bg-brand/15 text-brand' : 'text-muted hover:text-fg'" @click="sub = 'orders'" data-testid="market-tab-orders">{{ t('sobj.orders') }}</button>
          <button class="px-3 py-2 transition-colors" :class="sub === 'objects' ? 'bg-quantum/15 text-quantum' : 'text-muted hover:text-fg'" @click="sub = 'objects'" data-testid="market-tab-objects">{{ t('sobj.allObjects') }}</button>
        </div>
        <div class="flex rounded-xl border hair overflow-hidden text-xs font-semibold" data-testid="market-type-filter">
          <button v-for="f in filters" :key="String(f.key)" class="px-3 py-2 transition-colors" :class="typeFilter === f.key ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="typeFilter = f.key" :data-testid="`market-filter-${f.key}`">{{ t(f.label) }}</button>
        </div>
        <span v-if="market.data.value" class="text-xs text-muted mono">{{ t('market.fees') }}: {{ t('market.sell') }} <Amount :value="market.data.value.fees.sell" /> · {{ t('market.buy') }} <Amount :value="market.data.value.fees.buy" /></span>
      </div>
      <Panel v-if="sobjLoading" pad><div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 py-2"><div v-for="i in 6" :key="i" class="skeleton h-36"></div></div></Panel>
      <Panel v-else-if="sobjError"><StatePanel :error="sobjError" @retry="sobjReload" /></Panel>
      <Panel v-else-if="!items.length"><StatePanel :message="sub === 'orders' ? (market.data.value?.active ? (q || typeFilter !== 'all' ? t('sobj.noMatch') : t('market.noOrders')) : t('market.inactive')) : (q || typeFilter !== 'all' ? t('sobj.noMatch') : t('sobj.noObjects'))" empty /></Panel>
      <template v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="market-orders"><SobjCard v-for="it in items" :key="it.id" :item="it" /></div>
        <Pagination v-if="sub === 'objects'" class="mt-4" :page="page" :meta="objects.meta.value" :limit="limit" :loading="objects.loading.value" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
      </template>
    </template>
  </div>
</template>
