<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNetworkStore } from '@/stores/network'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import TxTable from '@/components/tx/TxTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import { CORE_TYPES, TOKEN_TYPES, txKind } from '@/utils/tx'
import TypeSelect, { type SelectGroup } from '@/components/ui/TypeSelect.vue'

const { t } = useI18n()
const net = useNetworkStore()
const cache = useCacheStore()
const page = ref(1)
const limit = ref(25)
// filter value: 'all' | 'g<typeGroup>' | '<typeGroup>:<type>' | 'quantum'; mirrored in ?type= so filtered views are shareable
const route = useRoute()
const router = useRouter()
const group = ref<string>(typeof route.query.type === 'string' ? route.query.type : 'all')
watch(group, (v) => router.replace({ query: { ...route.query, type: v === 'all' ? undefined : v } }))
const filters = computed<{ version?: number; typeGroup?: number; type?: number }>(() => {
  const v = group.value
  if (v === 'quantum') return { version: 3 }
  if (v.startsWith('g')) return { typeGroup: Number(v.slice(1)) }
  if (v.includes(':')) { const [g, t] = v.split(':'); return { typeGroup: Number(g), type: Number(t) } }
  return {}
})
const typeOptions = [
  { group: 1, label: 'txs.filterGroup.core', types: Object.keys(CORE_TYPES).map(Number) },
  { group: 3, label: 'txs.filterGroup.token', types: Object.keys(TOKEN_TYPES).map(Number) },
  { group: 2, label: 'txs.filterGroup.sobj', types: [6] },
]
const selectGroups = computed<SelectGroup[]>(() => [
  { options: [{ value: 'all', label: t('txs.filterGroup.all') }, { value: 'quantum', label: t('txs.filterGroup.quantum') }] },
  ...typeOptions.map((og) => ({
    label: t(og.label),
    options: [
      { value: `g${og.group}`, label: t('txs.filterGroup.allIn', { g: t(og.label) }) },
      ...og.types.map((ty) => ({ value: `${og.group}:${ty}`, label: t(`txs.types.${txKind({ typeGroup: og.group, type: ty }).key}`), indent: true })),
    ],
  })),
])
const { data, meta, loading, error, reload } = useQuery(
  () => cache.memo(`txs:${page.value}:${limit.value}:${group.value}`, 60_000, () => net.api.transactions.list({ page: page.value, limit: limit.value, ...filters.value })),
  [page, limit, group],
)
</script>

<template>
  <div data-testid="transactions-page">
    <PageHeader :title="t('txs.title')" :subtitle="t('txs.subtitle')">
      <TypeSelect v-model="group" :groups="selectGroups" testid="tx-group-filter" @update:model-value="page = 1" />
    </PageHeader>
    <Panel>
      <div v-if="loading && !data" class="px-5 py-3 text-xs text-muted border-b hair flex items-center gap-2" data-testid="slow-hint">
        <span class="h-1.5 w-1.5 rounded-full bg-warn animate-pulseDot"></span>{{ t('common.slowHint') }}
      </div>
      <TxTable :txs="data" :loading="loading" :error="error" show-block @retry="reload" />
      <Pagination :page="page" :meta="meta" :limit="limit" :loading="loading" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
    </Panel>
  </div>
</template>
