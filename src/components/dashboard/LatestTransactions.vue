<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCacheStore } from '@/stores/cache'
import TxTable from '@/components/tx/TxTable.vue'

const { t } = useI18n()
const cache = useCacheStore()
onMounted(() => cache.loadLatestTxs())
</script>

<template>
  <div>
    <div v-if="cache.latestTxsLoading && !cache.latestTxs" class="px-5 py-2.5 text-xs text-muted border-b hair flex items-center gap-2" data-testid="latest-tx-slow-hint">
      <span class="h-1.5 w-1.5 rounded-full bg-warn animate-pulseDot"></span>{{ t('common.slowHint') }}
    </div>
    <TxTable :txs="cache.latestTxs" :loading="cache.latestTxsLoading && !cache.latestTxs" :error="cache.latestTxsError" @retry="cache.loadLatestTxs(true)" />
  </div>
</template>
