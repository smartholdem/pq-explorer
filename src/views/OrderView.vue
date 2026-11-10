<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowRight } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useCacheStore } from '@/stores/cache'
import { useTokensStore } from '@/stores/tokens'
import { useQuery } from '@/composables/useQuery'
import { ApiError } from '@/api/client'
import type { TokenOrder, TokenTrade, Transaction } from '@/api/types'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import OrderStatusPill from '@/components/tokens/OrderStatusPill.vue'
import { formatNumber } from '@/utils/format'
import { fillPct, orderStatus, pricePerToken, tokenIdOf, tsUnix } from '@/utils/token'

// orderId = id of the TokenSell transaction; the tx gives the token, the token gives the order record
const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()
const cache = useCacheStore()
const tokens = useTokensStore()
const q = useQuery<{ order: TokenOrder; sell: Transaction }>(async () => {
  const sell = await cache.getTx(props.id)
  const tokenId = tokenIdOf(sell)
  if (!tokenId || sell.type !== 5) throw new Error(t('tmarket.notAnOrder'))
  const order = (await net.api.tokens.order(tokenId, props.id)).data
  return { data: { order, sell } }
}, [() => props.id])
const o = computed(() => q.data.value?.order ?? null)
const tk = computed(() => tokens.get(o.value?.tokenId))
const dec = computed(() => o.value?.decimals ?? tk.value?.decimals ?? 0)
const sym = computed(() => o.value?.symbol ?? tk.value?.symbol ?? '')
const status = computed(() => (o.value ? orderStatus(o.value) : null))

const trades = useQuery(async () => (o.value ? net.api.tokens.trades(o.value.tokenId, { limit: 100 }) : { data: [] as TokenTrade[] }), [() => o.value?.orderId])
const tradeBy = computed(() => new Map((trades.data.value ?? []).filter((x) => x.orderId === props.id).map((x) => [x.txId, x])))
const cancel = useQuery(async () => {
  if (!o.value || status.value !== 'cancelled') return { data: null }
  const res = await net.api.transactions.list({ typeGroup: 3, type: 7, address: o.value.seller, limit: 100 }).catch(() => ({ data: [] as Transaction[] }))
  return { data: res.data.find((x) => x.asset?.token?.orderId === props.id) ?? null }
}, [() => o.value?.orderId, status])
const notFound = computed(() => q.error.value instanceof ApiError && q.error.value.isNotFound)
</script>

<template>
  <div data-testid="order-page">
    <PageHeader :title="o ? `${t('tmarket.order')} · ${sym}` : t('tmarket.order')" :subtitle="id">
      <OrderStatusPill v-if="o" :order="o" />
    </PageHeader>
    <Panel v-if="q.loading.value" pad><div class="space-y-3 py-2"><div v-for="i in 5" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 10 + '%' }"></div></div></Panel>
    <Panel v-else-if="q.error.value || !o"><StatePanel :error="notFound ? new Error(t('tmarket.orderNotFound')) : q.error.value" @retry="q.reload" /></Panel>
    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <Panel>
          <div class="p-5 flex flex-col sm:flex-row sm:items-center gap-5" data-testid="order-summary">
            <RouterLink :to="`/token/${o.tokenId}?tab=market`" class="flex items-center gap-3 shrink-0"><TokenLogo :token-key="o.tokenId" :symbol="sym" :size="48" /><div><div class="font-display text-xl font-semibold link">{{ sym }}</div><div class="text-xs text-muted">{{ tk?.meta?.name ?? '' }}</div></div></RouterLink>
            <div class="sm:ms-auto sm:text-end">
              <div class="eyebrow text-[10px]">{{ t('tmarket.pricePer', { s: sym }) }}</div>
              <div class="font-display text-3xl font-semibold text-brand" data-testid="order-price"><Amount :value="pricePerToken(o.price, dec).toString()" /></div>
            </div>
          </div>
          <div class="px-5 pb-5">
            <div class="flex justify-between text-xs text-muted mb-1.5"><span>{{ t('tmarket.filled') }} {{ fillPct(o) }}%</span><span><Amount :value="o.filled" :decimals="dec" :max-frac="dec" :symbol="null" /> / <Amount :value="o.amount" :decimals="dec" :max-frac="dec" :symbol="sym" /></span></div>
            <div class="h-2 rounded-full bg-line/10 overflow-hidden" data-testid="order-progress"><div class="h-full transition-[width] duration-500" :class="status === 'filled' ? 'bg-ok' : status === 'cancelled' ? 'bg-muted' : 'bg-warn'" :style="{ width: `${fillPct(o)}%` }"></div></div>
          </div>
          <dl class="border-t hair">
            <DetailRow :label="t('tmarket.seller')"><HashLink :value="o.seller" :to="`/wallet/${o.seller}`" full /></DetailRow>
            <DetailRow :label="t('tmarket.amount')"><Amount :value="o.amount" :decimals="dec" :max-frac="dec" :symbol="sym" /></DetailRow>
            <DetailRow :label="t('tmarket.filled')"><Amount :value="o.filled" :decimals="dec" :max-frac="dec" :symbol="sym" /></DetailRow>
            <DetailRow :label="status === 'cancelled' ? t('tmarket.returned') : t('tmarket.remaining')"><Amount :value="o.remaining" :decimals="dec" :max-frac="dec" :symbol="sym" /></DetailRow>
            <DetailRow v-if="o.open" :label="t('tmarket.remainingValue')"><Amount :value="o.total" /></DetailRow>
            <DetailRow :label="t('tmarket.created')" mono><RouterLink :to="`/block/${o.height}`" class="link">#{{ formatNumber(o.height) }}</RouterLink> · <RouterLink :to="`/tx/${o.orderId}`" class="link">TokenSell</RouterLink></DetailRow>
            <DetailRow v-if="o.closed" :label="t('tmarket.closed')" mono><RouterLink :to="`/block/${o.closed}`" class="link">#{{ formatNumber(o.closed) }}</RouterLink>
              <template v-if="cancel.data.value"> · <RouterLink :to="`/tx/${cancel.data.value.id}`" class="link" data-testid="order-cancel-link">TokenCancel</RouterLink></template>
            </DetailRow>
          </dl>
        </Panel>
      </div>
      <Panel :title="t('tmarket.fills')" :subtitle="t('tmarket.fillsSub', { n: o.fills?.length ?? 0 })">
        <StatePanel v-if="!o.fills?.length" :message="t('tmarket.noFills')" empty />
        <div v-else class="divide-y hair" data-testid="order-fills">
          <RouterLink v-for="f in o.fills" :key="f" :to="`/tx/${f}`" class="px-5 py-3 flex items-center gap-3 text-sm row-hover" data-testid="order-fill-row">
            <div class="min-w-0 flex-1">
              <HashLink :value="f" :head="8" :tail="6" :copy="false" />
              <div v-if="tradeBy.get(f)" class="text-[11px] text-muted flex items-center gap-1">{{ t('tmarket.buyer') }} <HashLink :value="tradeBy.get(f)!.buyer" :head="5" :tail="4" :copy="false" /> · <TimeAgo :unix="tsUnix(tradeBy.get(f)!.timestamp, chain.epochUnix)" /></div>
            </div>
            <div v-if="tradeBy.get(f)" class="text-end text-xs">
              <Amount :value="tradeBy.get(f)!.amount" :decimals="dec" :max-frac="dec" :symbol="sym" />
              <div class="text-muted"><Amount :value="tradeBy.get(f)!.total" :max-frac="4" /></div>
            </div>
            <ArrowRight v-else class="rtl:-scale-x-100 h-4 w-4 text-muted" />
          </RouterLink>
        </div>
      </Panel>
    </div>
  </div>
</template>
