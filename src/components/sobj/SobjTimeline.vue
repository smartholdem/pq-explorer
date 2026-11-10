<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles, Pencil, Ban, ArrowRightLeft, Tag, ShoppingCart, ArrowRight } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import Panel from '@/components/ui/Panel.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import type { Transaction } from '@/api/types'
import { sobjAction, isUrlPointer, pointerHref } from '@/utils/sobj'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const cache = useCacheStore()
const PAGE = 100
const MAX_PAGES = 5

// the node has no per-object tx index yet: scan the (small) global SmartObject tx list and keep what references this object
const { data, loading, error, reload, meta } = useQuery(async () => {
  const out: Transaction[] = []
  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await net.api.transactions.list({ typeGroup: 2, type: 6, limit: PAGE, page })
    total = res.meta?.totalCount ?? total
    out.push(...res.data.filter((tx) => tx.id === props.id || tx.asset?.registrationId === props.id))
    if (res.data.length < PAGE) break
  }
  if (!out.some((tx) => tx.id === props.id)) {
    const reg = await cache.getTx(props.id).catch(() => null)
    if (reg) out.push(reg)
  }
  out.sort((a, b) => (b.timestamp?.unix ?? 0) - (a.timestamp?.unix ?? 0))
  return { data: out, meta: { count: out.length, totalCount: total, pageCount: 1, next: null, previous: null } }
}, [() => props.id])

const truncated = computed(() => (meta.value?.totalCount ?? 0) > PAGE * MAX_PAGES)
const ICONS = [Sparkles, Pencil, Ban, ArrowRightLeft, Tag, ShoppingCart]
const TONES = ['quantum', 'cyan', 'neutral', 'cyan', 'brand', 'ok'] as const
const ICON_TEXT: Record<string, string> = { quantum: 'text-quantum', cyan: 'text-cyan', neutral: 'text-muted', brand: 'text-brand', ok: 'text-ok' }
const actionOf = (tx: Transaction) => Number(tx.asset?.action ?? 0)
const isSellCancel = (tx: Transaction) => actionOf(tx) === 4 && BigInt(tx.asset?.price ?? 0) === 0n
const toneOf = (tx: Transaction) => (isSellCancel(tx) ? 'neutral' : TONES[actionOf(tx)] ?? 'neutral')
</script>

<template>
  <Panel :title="t('sobj.timeline')" :subtitle="truncated ? t('sobj.timelineTruncated', { n: PAGE * MAX_PAGES }) : t('sobj.timelineSub')" data-testid="sobj-timeline">
    <div v-if="loading" class="px-5 pb-5 space-y-3"><div v-for="i in 3" :key="i" class="skeleton h-10"></div></div>
    <StatePanel v-else-if="error" :error="error" @retry="reload" />
    <StatePanel v-else-if="!data?.length" :message="t('sobj.noEvents')" empty />
    <ol v-else class="px-5 pb-5 relative">
      <div class="absolute left-[2.1rem] top-2 bottom-6 w-px bg-line/15"></div>
      <li v-for="(tx, i) in data" :key="tx.id" class="relative flex gap-4 py-3 animate-rise" :style="{ animationDelay: `${Math.min(i, 8) * 40}ms` }" data-testid="sobj-event">
        <div class="relative z-10 h-8 w-8 rounded-full border hair bg-card flex items-center justify-center shrink-0" :class="ICON_TEXT[toneOf(tx)]">
          <component :is="ICONS[actionOf(tx)] ?? Sparkles" class="h-3.5 w-3.5" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <Pill :tone="toneOf(tx)" :data-testid="`sobj-event-${sobjAction(actionOf(tx))}`">{{ isSellCancel(tx) ? t('sobj.actions.cancelSell') : t(`sobj.actions.${sobjAction(actionOf(tx))}`, sobjAction(actionOf(tx)) ?? '') }}</Pill>
            <span v-if="tx.asset?.data?.name" class="font-semibold">{{ tx.asset.data.name }}</span>
            <template v-if="actionOf(tx) === 4 && !isSellCancel(tx)"><span class="text-muted text-xs">{{ t('common.price') }}</span><span class="font-semibold text-brand"><Amount :value="tx.asset?.price" /></span></template>
            <template v-if="actionOf(tx) === 5"><span class="text-muted text-xs">{{ t('sobj.boughtFor') }}</span><span class="font-semibold text-ok"><Amount :value="tx.amount" /></span></template>
            <template v-if="actionOf(tx) === 3 && tx.asset?.recipientId"><ArrowRight class="rtl:-scale-x-100 h-3.5 w-3.5 text-muted" /><HashLink :value="tx.asset.recipientId" :to="`/wallet/${tx.asset.recipientId}`" :head="8" :tail="6" :copy="false" /></template>
            <span class="ms-auto text-xs text-muted whitespace-nowrap"><TimeAgo :unix="tx.timestamp?.unix" /></span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{{ actionOf(tx) === 5 ? t('sobj.buyer') : t('common.sender') }}: <HashLink :value="tx.sender" :to="`/wallet/${tx.sender}`" :head="7" :tail="5" :copy="false" /></span>
            <span>tx: <HashLink :value="tx.id" :to="`/tx/${tx.id}`" :head="7" :tail="5" :copy="false" /></span>
            <span v-if="tx.blockId" class="mono">#{{ tx.blockId.slice(0, 6) }}…</span>
            <template v-if="actionOf(tx) === 1 && tx.asset?.data?.ntfryData">
              <a v-if="isUrlPointer(tx.asset.data.ntfryData)" :href="pointerHref(tx.asset.data.ntfryData)" target="_blank" rel="noopener" class="link break-all">{{ tx.asset.data.ntfryData }}</a>
              <span v-else class="break-all">{{ tx.asset.data.ntfryData }}</span>
            </template>
          </div>
        </div>
      </li>
    </ol>
  </Panel>
</template>
