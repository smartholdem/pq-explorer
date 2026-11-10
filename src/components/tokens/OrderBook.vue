<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { ref } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useQuery } from '@/composables/useQuery'
import type { Token } from '@/api/types'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Pagination from '@/components/ui/Pagination.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { pricePerToken, orderValue, fillPct } from '@/utils/token'

// open sell orders of one token, cheapest first (best price = first row)
const props = defineProps<{ token: Token }>()
const net = useNetworkStore()
const page = ref(1)
const limit = ref(25)
const q = useQuery(() => net.api.tokens.orders(props.token.id, { page: page.value, limit: limit.value }), [() => props.token.id, page, limit])
</script>

<template>
  <div data-testid="order-book">
    <SkeletonRows v-if="q.loading.value && !q.data.value" :rows="6" :cols="3" />
    <StatePanel v-else-if="q.error.value" :error="q.error.value" @retry="q.reload" />
    <StatePanel v-else-if="!q.data.value?.length" :message="$t('tmarket.noOrders')" empty />
    <template v-else>
      <div class="grid grid-cols-[1fr_auto_auto] gap-x-3 px-5 py-2 text-[10px] eyebrow border-b hair">
        <span>{{ $t('tmarket.pricePer', { s: token.symbol }) }}</span><span class="text-end">{{ $t('tmarket.remaining') }}</span><span class="text-end">{{ $t('tmarket.total') }}</span>
      </div>
      <RouterLink v-for="(o, i) in q.data.value" :key="o.orderId" :to="`/order/${o.orderId}`" class="relative grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-5 py-2 text-sm row-hover border-b hair" data-testid="order-book-row">
        <span class="absolute inset-y-0 end-0 bg-brand/5 pointer-events-none" :style="{ width: `${100 - fillPct(o)}%` }"></span>
        <span class="relative min-w-0">
          <span class="font-semibold" :class="i === 0 && page === 1 ? 'text-ok' : 'text-brand'"><Amount :value="pricePerToken(o.price, token.decimals).toString()" /></span>
          <span class="block text-[11px] text-muted"><HashLink :value="o.seller" :head="5" :tail="4" :copy="false" /><span v-if="fillPct(o) > 0" class="ms-1 text-warn">· {{ fillPct(o) }}%</span></span>
        </span>
        <span class="relative text-end"><Amount :value="o.remaining" :decimals="token.decimals" :max-frac="token.decimals" :symbol="null" /></span>
        <span class="relative text-end text-muted"><Amount :value="orderValue(o.remaining, o.price).toString()" :max-frac="4" :symbol="null" /></span>
      </RouterLink>
      <Pagination :page="page" :meta="q.meta.value" :limit="limit" :loading="q.loading.value" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
    </template>
  </div>
</template>
