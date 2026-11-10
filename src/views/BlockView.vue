<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareButton from '@/components/ui/ShareButton.vue'
import Panel from '@/components/ui/Panel.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import FinalityBadge from '@/components/ui/FinalityBadge.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import TxTable from '@/components/tx/TxTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { formatNumber } from '@/utils/format'
import type { Transaction } from '@/api/types'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const cache = useCacheStore()
const { data: block, loading, error, reload } = useQuery(async () => ({ data: await cache.getBlock(props.id) }), [() => props.id])
const page = ref(1)
const limit = ref(25)
const blockId = computed(() => block.value?.id ?? null)
const txq = useQuery(async () => (block.value ? cache.getBlockTxs(block.value, page.value, limit.value) : { data: [] as Transaction[] }), [blockId, page, limit])
const showRaw = ref(false)
</script>

<template>
  <div data-testid="block-page">
    <PageHeader :title="`${t('common.block')} ${block ? '#' + formatNumber(block.height) : ''}`" :subtitle="block?.id">
      <template v-if="block">
        <RouterLink :to="`/block/${block.height - 1}`" class="btn-ghost text-xs" :class="block.height <= 1 && 'pointer-events-none opacity-40'" data-testid="block-prev"><ChevronLeft class="rtl:-scale-x-100 h-4 w-4" />{{ formatNumber(block.height - 1) }}</RouterLink>
        <RouterLink :to="`/block/${block.height + 1}`" class="btn-ghost text-xs" data-testid="block-next">{{ formatNumber(block.height + 1) }}<ChevronRight class="rtl:-scale-x-100 h-4 w-4" /></RouterLink>
        <ShareButton :title="`${t('common.block')} #${formatNumber(block.height)}`" :subtitle="block.id" :kind="t('common.block')" :facts="[{ label: t('common.forgedBy'), value: block.generator.username ?? block.generator.address }, { label: t('common.transactions'), value: String(block.transactions) }, { label: t('common.timestamp'), value: block.timestamp.human }]" />
      </template>
    </PageHeader>

    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 6" :key="i" class="skeleton h-5" :style="{ width: 40 + i * 8 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !block"><StatePanel :error="error?.message?.includes('404') || !block ? new Error(t('blocks.notFound')) : error" @retry="reload" /></Panel>

    <template v-else>
      <Panel :title="t('common.details')">
        <template #actions>
          <FinalityBadge :finalized="block.finalized" />
          <button class="btn-ghost !py-1 text-xs" @click="showRaw = !showRaw" data-testid="block-raw-toggle">{{ t('common.raw') }}</button>
        </template>
        <dl class="border-t hair">
          <DetailRow :label="t('common.height')" mono>{{ formatNumber(block.height) }}</DetailRow>
          <DetailRow :label="t('common.id')" mono><HashLink :value="block.id" full /></DetailRow>
          <DetailRow :label="t('common.timestamp')" mono><TimeAgo :unix="block.timestamp.unix" exact /> <span class="text-muted">· <TimeAgo :unix="block.timestamp.unix" /></span></DetailRow>
          <DetailRow :label="t('common.forgedBy')">
            <RouterLink :to="`/wallet/${block.generator.username ?? block.generator.address}`" class="link font-semibold">{{ block.generator.username ?? block.generator.address }}</RouterLink>
            <span class="mono text-xs text-muted ms-2">{{ block.generator.address }}</span>
          </DetailRow>
          <DetailRow :label="t('common.transactions')" mono>{{ block.transactions }}</DetailRow>
          <DetailRow :label="t('common.total')"><Amount :value="block.forged.amount" /></DetailRow>
          <DetailRow :label="t('common.fee')"><Amount :value="block.forged.fee" /></DetailRow>
          <DetailRow :label="t('common.reward')"><Amount :value="block.forged.reward" /></DetailRow>
          <DetailRow :label="t('common.confirmations')" mono>{{ formatNumber(block.confirmations) }}</DetailRow>
          <DetailRow :label="t('common.previousBlock')" mono><HashLink v-if="block.previous" :value="block.previous" :to="`/block/${block.previous}`" full /><span v-else>—</span></DetailRow>
          <DetailRow :label="t('common.payloadHash')" mono><HashLink :value="block.payload.hash" full /> <span class="text-muted">({{ block.payload.length }} B)</span></DetailRow>
          <DetailRow :label="t('common.version')" mono>{{ block.version }}</DetailRow>
          <DetailRow :label="t('common.signature')" mono><HashLink :value="block.signature" :head="24" :tail="16" /></DetailRow>
          <DetailRow v-if="block.pqSignature" :label="t('txs.pqSignature')" mono><HashLink :value="block.pqSignature" :head="24" :tail="16" /></DetailRow>
        </dl>
        <pre v-if="showRaw" class="mono text-xs p-5 border-t hair overflow-auto max-h-96 text-muted" data-testid="block-raw">{{ JSON.stringify(block, null, 2) }}</pre>
      </Panel>

      <Panel class="mt-6" :title="t('blocks.inBlock')" :subtitle="`${block.transactions} ${t('common.txs')}`">
        <TxTable :txs="txq.data.value" :loading="txq.loading.value" :error="txq.error.value" :empty-message="t('blocks.empty')" @retry="txq.reload" />
        <Pagination v-if="block.transactions > limit" :page="page" :meta="txq.meta.value" :limit="limit" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
      </Panel>
    </template>
  </div>
</template>
