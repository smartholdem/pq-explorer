<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNetworkStore } from '@/stores/network'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import BlocksTable from '@/components/blocks/BlocksTable.vue'
import Pagination from '@/components/ui/Pagination.vue'

const { t } = useI18n()
const net = useNetworkStore()
const cache = useCacheStore()
const page = ref(1)
const limit = ref(25)
const order = ref<'height:desc' | 'height:asc'>('height:desc')
const fromCache = ref(false)
const { data, meta, loading, error, reload } = useQuery(async () => {
  if (order.value === 'height:desc') {
    const hit = await cache.recentPage(page.value, limit.value)
    fromCache.value = Boolean(hit)
    if (hit) return hit
  }
  fromCache.value = false
  return net.api.blocks.list({ page: page.value, limit: limit.value, orderBy: order.value })
}, [page, limit, order])
// cache-served pages follow the live window, so new blocks appear as the tip moves
const rows = computed(() => {
  if (!fromCache.value) return data.value
  const offset = (page.value - 1) * limit.value
  return cache.recent.slice(offset, offset + limit.value).map(cache.liveBlock)
})
const liveMeta = computed(() => {
  if (!fromCache.value || !cache.recent.length) return meta.value
  const tip = cache.recent[0].height
  return { ...(meta.value ?? { count: limit.value, next: null, previous: null }), totalCount: tip, pageCount: Math.ceil(tip / limit.value) }
})
</script>

<template>
  <div data-testid="blocks-page">
    <PageHeader :title="t('blocks.title')" :subtitle="t('blocks.subtitle')">
      <span v-if="fromCache" class="text-[10px] eyebrow text-cyan/70" data-testid="blocks-from-cache">{{ t('dashboard.cached', { n: cache.recent.length }) }}</span>
      <select v-model="order" class="input !w-auto text-xs" data-testid="blocks-order">
        <option value="height:desc">{{ t('common.height') }} ↓</option>
        <option value="height:asc">{{ t('common.height') }} ↑</option>
      </select>
    </PageHeader>
    <Panel>
      <BlocksTable :blocks="rows" :loading="loading" :error="error" @retry="reload" />
      <Pagination :page="page" :meta="liveMeta" :limit="limit" :loading="loading" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
    </Panel>
  </div>
</template>
