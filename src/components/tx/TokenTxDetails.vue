<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Flame } from 'lucide-vue-next'
import type { Transaction, TokenOrder } from '@/api/types'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useTokensStore } from '@/stores/tokens'
import { useQuery } from '@/composables/useQuery'
import DetailRow from '@/components/ui/DetailRow.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import Pill from '@/components/ui/Pill.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import TokenAmount from '@/components/tokens/TokenAmount.vue'
import OrderStatusPill from '@/components/tokens/OrderStatusPill.vue'
import { orderValue, pricePerToken, tokenAsset, tokenTxAmount } from '@/utils/token'

const props = defineProps<{ tx: Transaction }>()
const { t } = useI18n()
const net = useNetworkStore()
const chain = useChainStore()
const tokens = useTokensStore()
const a = computed(() => tokenAsset(props.tx) ?? {})
const id = computed<string | null>(() => a.value.id ?? null)
const tk = computed(() => tokens.get(id.value))
const kind = computed(() => ['init', 'transfer', 'mint', 'burn', 'meta', 'sell', 'buy', 'cancel'][props.tx.type] ?? null)
const amount = computed(() => tokenTxAmount(props.tx)?.toString() ?? '0')
const transfers = computed<{ recipientId: string; amount: string }[]>(() => a.value.transfers ?? [])
// sell → its own order (status); buy/cancel → the referenced order (price, seller, returned amount)
const orderId = computed<string | null>(() => (props.tx.type === 5 ? props.tx.id : a.value.orderId ?? null))
const order = useQuery<TokenOrder | null>(async () => (id.value && orderId.value && props.tx.blockId ? net.api.tokens.order(id.value, orderId.value) : { data: null }), [orderId])
const price = computed(() => (props.tx.type === 5 ? a.value.price : order.data.value?.price) ?? null)
const total = computed(() => (price.value ? orderValue(amount.value, price.value).toString() : null))
const initBurn = computed(() => chain.config?.constants?.tokenFees?.initBurn ?? null)
const meta = computed(() => a.value.meta ?? null)
const website = computed(() => (meta.value?.website && /^https?:\/\//i.test(meta.value.website) ? meta.value.website : null))
</script>

<template>
  <div data-testid="token-tx-details">
    <div v-if="kind" class="px-5 py-4 text-base leading-relaxed border-b hair bg-line/[0.03]" data-testid="token-tx-summary">
      <i18n-t :keypath="`tmarket.sum.${kind}`" tag="span" scope="global">
        <template #symbol><b>{{ tk?.symbol ?? '…' }}</b></template>
        <template #amount><b><TokenAmount :token-id="id" :value="amount" /></b></template>
        <template #supply><b><TokenAmount :token-id="id" :value="a.initialSupply" /></b></template>
        <template #cap><b v-if="a.supplyCap && a.supplyCap !== '0'"><TokenAmount :token-id="id" :value="a.supplyCap" /></b><b v-else>∞</b></template>
        <template #n><b>{{ transfers.length }}</b></template>
        <template #recipient><HashLink v-if="a.recipientId" :value="a.recipientId" :to="`/wallet/${a.recipientId}`" :head="6" :tail="4" :copy="false" /></template>
        <template #price><b class="text-brand"><Amount v-if="price" :value="pricePerToken(price, tk?.decimals ?? 0).toString()" /><span v-else>…</span></b></template>
        <template #total><b><Amount v-if="total" :value="total" /><span v-else>…</span></b></template>
        <template #seller><HashLink v-if="order.data.value" :value="order.data.value.seller" :to="`/wallet/${order.data.value.seller}`" :head="6" :tail="4" :copy="false" /><span v-else>…</span></template>
        <template #order><RouterLink v-if="orderId" :to="`/order/${orderId}`" class="link mono">{{ orderId.slice(0, 8) }}…</RouterLink></template>
        <template #returned><b><TokenAmount v-if="order.data.value" :token-id="id" :value="order.data.value.remaining" /><span v-else>…</span></b></template>
      </i18n-t>
    </div>
    <dl>
      <DetailRow :label="t('tmarket.token')">
        <RouterLink v-if="id" :to="`/token/${id}`" class="inline-flex items-center gap-2"><TokenLogo :token-key="id" :symbol="tk?.symbol" :size="22" /><span class="font-semibold link">{{ tk?.symbol ?? id.slice(0, 10) + '…' }}</span><span v-if="tk?.meta?.name" class="text-muted text-xs">{{ tk.meta.name }}</span></RouterLink>
        <HashLink v-if="id" class="ms-2" :value="id" :head="8" :tail="6" />
      </DetailRow>
      <DetailRow v-if="tokenTxAmount(tx) !== null" :label="tx.type === 0 ? t('tmarket.initialSupply') : t('common.amount')"><TokenAmount :token-id="id" :value="amount" /></DetailRow>

      <template v-if="tx.type === 0">
        <DetailRow :label="t('common.supplyCap')"><TokenAmount v-if="a.supplyCap && a.supplyCap !== '0'" :token-id="id" :value="a.supplyCap" /><span v-else>∞</span></DetailRow>
        <DetailRow :label="t('common.decimals')" mono>{{ a.decimals ?? tk?.decimals ?? '—' }}</DetailRow>
        <DetailRow :label="t('tmarket.flags')"><span class="inline-flex gap-1"><Pill v-if="tk?.mintable" tone="ok">{{ t('tokens.mintable') }}</Pill><Pill v-if="tk?.burnable" tone="brand">{{ t('tokens.burnable') }}</Pill><Pill v-if="tk && !tk.mintable" tone="neutral">{{ t('tokens.fixed') }}</Pill></span></DetailRow>
        <DetailRow v-if="initBurn" :label="t('tmarket.burnedFee')"><span class="inline-flex items-center gap-1.5 text-warn font-semibold" data-testid="token-init-burn"><Flame class="h-3.5 w-3.5" /><Amount :value="initBurn" /></span><span class="text-xs text-muted ms-2">{{ t('tmarket.burnedFeeHint') }} <Amount :value="tx.fee" :max-frac="2" /></span></DetailRow>
      </template>

      <DetailRow v-if="transfers.length" :label="`${t('common.recipients')} · ${transfers.length}`">
        <div class="max-h-72 overflow-auto divide-y hair" data-testid="token-transfers">
          <div v-for="(r, i) in transfers" :key="i" class="flex items-center justify-between gap-3 py-1.5">
            <HashLink :value="r.recipientId" :to="`/wallet/${r.recipientId}`" :head="12" :tail="8" />
            <TokenAmount :token-id="id" :value="r.amount" />
          </div>
        </div>
      </DetailRow>
      <DetailRow v-if="tx.type === 2 && a.recipientId" :label="t('common.recipient')"><HashLink :value="a.recipientId" :to="`/wallet/${a.recipientId}`" full /></DetailRow>
      <DetailRow v-if="a.memo" :label="t('txs.memo')"><span class="break-words whitespace-pre-wrap" data-testid="token-memo">{{ a.memo }}</span></DetailRow>

      <template v-if="tx.type >= 5 && tx.type <= 7">
        <DetailRow :label="t('tmarket.order')">
          <RouterLink v-if="orderId" :to="`/order/${orderId}`" class="link mono" data-testid="token-order-link">{{ orderId.slice(0, 16) }}…</RouterLink>
          <OrderStatusPill v-if="order.data.value" class="ms-2" :order="order.data.value" />
        </DetailRow>
        <DetailRow v-if="price" :label="t('tmarket.pricePer', { s: tk?.symbol ?? '' })"><Amount :value="pricePerToken(price, tk?.decimals ?? 0).toString()" /></DetailRow>
        <DetailRow v-if="total && tx.type !== 7" :label="tx.type === 6 ? t('tmarket.paid') : t('tmarket.total')"><Amount :value="total" /></DetailRow>
        <DetailRow v-if="tx.type !== 5 && order.data.value" :label="t('tmarket.seller')"><HashLink :value="order.data.value.seller" :to="`/wallet/${order.data.value.seller}`" full /></DetailRow>
        <DetailRow v-if="tx.type === 6" :label="t('tmarket.buyer')"><HashLink :value="tx.sender" :to="`/wallet/${tx.sender}`" full /></DetailRow>
        <DetailRow v-if="tx.type === 7 && order.data.value" :label="t('tmarket.returned')"><TokenAmount :token-id="id" :value="order.data.value.remaining" /></DetailRow>
      </template>

      <template v-if="tx.type === 4 && meta">
        <DetailRow v-if="meta.name" :label="t('common.name')"><span class="break-words">{{ meta.name }}</span></DetailRow>
        <DetailRow v-if="meta.description" :label="t('tmarket.description')"><span class="break-words whitespace-pre-wrap">{{ meta.description }}</span></DetailRow>
        <DetailRow v-if="website" :label="t('common.website')"><a :href="website" target="_blank" rel="noopener noreferrer nofollow" class="link break-all">{{ website }}</a></DetailRow>
        <DetailRow v-if="meta.logoType" :label="t('tokens.logo')"><TokenLogo v-if="id" :token-key="id" :symbol="tk?.symbol" :size="40" /><span class="text-xs text-muted ms-2 mono">{{ meta.logoType }}</span></DetailRow>
      </template>
    </dl>
  </div>
</template>
