<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useTokensStore } from '@/stores/tokens'
import { useQuery } from '@/composables/useQuery'
import type { TokenOrder, TokenTrade } from '@/api/types'
import Panel from '@/components/ui/Panel.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import TokenLogo from './TokenLogo.vue'
import TokenAmount from './TokenAmount.vue'
import OrderStatusPill from './OrderStatusPill.vue'
import { fillPct, pricePerToken, tsUnix } from '@/utils/token'

// open orders of a wallet + its sales: a TokenBuy is sent by the buyer, so sales come from trades filtered by seller
const props = defineProps<{ address: string; orders: TokenOrder[]; tokenIds: string[] }>()
const net = useNetworkStore()
const chain = useChainStore()
const tokens = useTokensStore()
const ids = computed(() => [...new Set([...props.tokenIds, ...props.orders.map((o) => o.tokenId)])].slice(0, 20))
const sales = useQuery<TokenTrade[]>(async () => {
  const lists = await Promise.all(ids.value.map((id) => net.api.tokens.trades(id, { limit: 100 }).then((r) => r.data.map((x) => ({ ...x, tokenId: id }))).catch(() => [])))
  return { data: lists.flat().filter((x) => x.seller === props.address).sort((a, b) => b.height - a.height) }
}, [() => ids.value.join(',')])
const dec = (id: string) => tokens.get(id)?.decimals ?? 0
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="wallet-token-market">
    <Panel :title="$t('tmarket.walletOrders')" :subtitle="orders.length ? $t('tmarket.walletOrdersSub', { n: orders.length }) : undefined">
      <div v-if="!orders.length" class="px-5 pb-5 text-sm text-muted">{{ $t('tmarket.noWalletOrders') }}</div>
      <div v-else class="divide-y hair" data-testid="wallet-orders">
        <RouterLink v-for="o in orders" :key="o.orderId" :to="`/order/${o.orderId}`" class="px-5 py-3 flex items-center gap-3 text-sm row-hover" data-testid="wallet-order-row">
          <TokenLogo :token-key="o.tokenId" :symbol="o.symbol" :size="28" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2"><TokenAmount :token-id="o.tokenId" :value="o.remaining" /><OrderStatusPill :order="o" /></div>
            <div class="text-[11px] text-muted">{{ $t('tmarket.at') }} <Amount :value="pricePerToken(o.price, dec(o.tokenId)).toString()" /> · {{ $t('tmarket.filled') }} {{ fillPct(o) }}%</div>
          </div>
          <Amount :value="o.total" :max-frac="2" />
        </RouterLink>
      </div>
    </Panel>
    <Panel :title="$t('tmarket.walletSales')" :subtitle="$t('tmarket.walletSalesSub')">
      <div v-if="sales.loading.value" class="px-5 pb-5 space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-8"></div></div>
      <div v-else-if="!sales.data.value?.length" class="px-5 pb-5 text-sm text-muted">{{ $t('tmarket.noSales') }}</div>
      <div v-else class="divide-y hair" data-testid="wallet-sales">
        <RouterLink v-for="s in sales.data.value" :key="s.txId" :to="`/tx/${s.txId}`" class="px-5 py-3 flex items-center gap-3 text-sm row-hover" data-testid="wallet-sale-row">
          <div class="min-w-0 flex-1">
            <TokenAmount :token-id="(s as any).tokenId" :value="s.amount" tone="out" />
            <div class="text-[11px] text-muted">{{ $t('tmarket.buyer') }} <HashLink :value="s.buyer" :head="5" :tail="4" :copy="false" /> · <TimeAgo :unix="tsUnix(s.timestamp, chain.epochUnix)" /></div>
          </div>
          <Amount :value="s.total" :max-frac="4" tone="in" />
        </RouterLink>
      </div>
    </Panel>
  </div>
</template>
