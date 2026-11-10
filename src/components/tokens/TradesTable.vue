<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { ref } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useQuery } from '@/composables/useQuery'
import type { Token } from '@/api/types'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { pricePerToken, tsUnix } from '@/utils/token'

const props = defineProps<{ token: Token }>()
const net = useNetworkStore()
const chain = useChainStore()
const page = ref(1)
const limit = ref(25)
const q = useQuery(() => net.api.tokens.trades(props.token.id, { page: page.value, limit: limit.value }), [() => props.token.id, page, limit])
</script>

<template>
  <div class="overflow-x-auto" data-testid="trades-table">
    <SkeletonRows v-if="q.loading.value && !q.data.value" :rows="6" :cols="5" />
    <StatePanel v-else-if="q.error.value" :error="q.error.value" @retry="q.reload" />
    <StatePanel v-else-if="!q.data.value?.length" :message="$t('tmarket.noTrades')" empty />
    <table v-else v-card-table class="w-full min-w-[720px]">
      <thead><tr>
        <th class="th">{{ $t('common.transaction') }}</th><th class="th">{{ $t('tmarket.buyer') }} ← {{ $t('tmarket.seller') }}</th>
        <th class="th text-end">{{ $t('common.amount') }}</th><th class="th text-end">{{ $t('tmarket.pricePer', { s: token.symbol }) }}</th>
        <th class="th text-end">{{ $t('tmarket.total') }}</th><th class="th">{{ $t('common.age') }}</th>
      </tr></thead>
      <tbody>
        <tr v-for="tr in q.data.value" :key="tr.txId" class="row-hover" data-testid="trade-row">
          <td class="td card-title"><HashLink :value="tr.txId" :to="`/tx/${tr.txId}`" :head="6" :tail="4" :copy="false" /><RouterLink :to="`/order/${tr.orderId}`" class="block text-[11px] link">{{ $t('tmarket.order') }} {{ tr.orderId.slice(0, 8) }}…</RouterLink></td>
          <td class="td text-xs"><HashLink :value="tr.buyer" :to="`/wallet/${tr.buyer}`" :head="5" :tail="4" :copy="false" /> ← <HashLink :value="tr.seller" :to="`/wallet/${tr.seller}`" :head="5" :tail="4" :copy="false" /></td>
          <td class="td text-end"><Amount :value="tr.amount" :decimals="token.decimals" :max-frac="token.decimals" :symbol="token.symbol" /></td>
          <td class="td text-end"><Amount :value="pricePerToken(tr.price, token.decimals).toString()" /></td>
          <td class="td text-end font-semibold"><Amount :value="tr.total" :max-frac="4" /></td>
          <td class="td text-muted whitespace-nowrap"><TimeAgo :unix="tsUnix(tr.timestamp, chain.epochUnix)" /></td>
        </tr>
      </tbody>
    </table>
    <Pagination v-if="q.data.value?.length" :page="page" :meta="q.meta.value" :limit="limit" :loading="q.loading.value" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
  </div>
</template>
