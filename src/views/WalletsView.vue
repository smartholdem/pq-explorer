<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNetworkStore } from '@/stores/network'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import Panel from '@/components/ui/Panel.vue'
import Pagination from '@/components/ui/Pagination.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import UsdValue from '@/components/ui/UsdValue.vue'
import Pill from '@/components/ui/Pill.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { fromUnits } from '@/utils/format'

const { t } = useI18n()
const net = useNetworkStore()
const page = ref(1)
const limit = ref(25)
const { data, meta, loading, error, reload } = useQuery(() => net.api.wallets.top({ page: page.value, limit: limit.value }), [page, limit])
const supply = useQuery(() => net.api.blockchain())
const share = (b: string) => {
  const s = supply.data.value?.supply
  if (!s || s === '0') return null
  return ((Number(BigInt(b) * 10000n / BigInt(s)) / 100).toFixed(2)) + '%'
}
</script>

<template>
  <div data-testid="wallets-page">
    <PageHeader :title="t('wallet.top')" :subtitle="t('wallet.topSubtitle')">
      <div v-if="supply.data.value" class="text-xs text-muted mono">{{ t('common.supply') }}: <span class="text-fg">{{ fromUnits(supply.data.value.supply, 8, 0) }} {{ net.current.symbol }}</span></div>
    </PageHeader>
    <Panel>
      <div class="overflow-x-auto">
        <SkeletonRows v-if="loading && !data" :rows="10" :cols="4" />
        <StatePanel v-else-if="error" :error="error" @retry="reload" />
        <table v-card-table v-else class="w-full min-w-[640px]" data-testid="wallets-table">
          <thead><tr><th class="th w-12">#</th><th class="th">{{ t('common.address') }}</th><th class="th">{{ t('common.status') }}</th><th class="th text-end">{{ t('common.balance') }}</th><th class="th text-end">{{ t('wallet.share') }}</th></tr></thead>
          <tbody>
            <tr v-for="(w, i) in data" :key="w.address" class="row-hover" data-testid="wallet-row">
              <td class="td mono text-muted">{{ (page - 1) * limit + i + 1 }}</td>
              <td class="td card-title"><HashLink :value="w.address" :to="`/wallet/${w.address}`" :head="12" :tail="8" /><span v-if="w.username" class="ms-2 text-xs font-semibold text-brand">{{ w.username }}</span></td>
              <td class="td">
                <span class="inline-flex gap-1.5">
                  <Pill v-if="w.isDelegate" tone="brand">{{ t('wallet.delegate') }}</Pill>
                  <Pill v-if="w.quantumShield?.active" tone="ok" glow>PQ</Pill>
                  <Pill v-else-if="w.quantumShield?.committed" tone="quantum">PQ</Pill>
                </span>
              </td>
              <td class="td text-end"><Amount :value="w.balance" :max-frac="2" /><div class="text-[11px] leading-tight" data-testid="wallet-row-usd"><UsdValue :value="w.balance" /></div></td>
              <td class="td text-end mono text-muted">{{ share(w.balance) ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination :page="page" :meta="meta" :limit="limit" :loading="loading" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
    </Panel>
  </div>
</template>
