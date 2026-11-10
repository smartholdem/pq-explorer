<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useNetworkStore } from '@/stores/network'
import { useQuery } from '@/composables/useQuery'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShipLink from '@/components/ui/ShipLink.vue'
import Panel from '@/components/ui/Panel.vue'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import { formatNumber } from '@/utils/format'

const { t } = useI18n()
const net = useNetworkStore()
const { data, loading, error, reload } = useQuery(() => net.api.tokens.list({ limit: 100 }))
</script>

<template>
  <div data-testid="tokens-page">
    <PageHeader :title="t('tokens.title')">
      <template #subtitle><i18n-t keypath="tokens.subtitle" tag="span" scope="global"><template #ships><ShipLink :n="14" />/<ShipLink :n="15" /></template></i18n-t></template>
    </PageHeader>
    <Panel>
      <SkeletonRows v-if="loading" :rows="6" :cols="5" />
      <StatePanel v-else-if="error" :error="error" @retry="reload" />
      <StatePanel v-else-if="!data?.length" :message="t('tokens.noTokens')" empty />
      <div v-else class="overflow-x-auto">
        <table v-card-table class="w-full min-w-[760px]" data-testid="tokens-table">
          <thead><tr><th class="th">{{ t('common.name') }}</th><th class="th">{{ t('common.id') }}</th><th class="th text-end">{{ t('common.supply') }}</th><th class="th">{{ t('common.owner') }}</th><th class="th">{{ t('common.status') }}</th><th class="th text-end">{{ t('tokens.initHeight') }}</th></tr></thead>
          <tbody>
            <tr v-for="tk in data" :key="tk.id" class="row-hover" data-testid="token-row">
              <td class="td">
                <RouterLink :to="`/token/${tk.id}`" class="flex items-center gap-3">
                  <TokenLogo :token-key="tk.id" :symbol="tk.symbol" :size="32" />
                  <div><div class="font-semibold link">{{ tk.symbol }}</div><div class="text-xs text-muted">{{ tk.meta?.name ?? '' }}</div></div>
                </RouterLink>
              </td>
              <td class="td"><HashLink :value="tk.id" :head="8" :tail="6" /></td>
              <td class="td text-end"><Amount :value="tk.supply" :decimals="tk.decimals" :symbol="tk.symbol" :max-frac="2" /><div v-if="tk.supplyCap" class="text-[11px] text-muted mono">/ <Amount :value="tk.supplyCap" :decimals="tk.decimals" :symbol="null" :max-frac="0" /></div></td>
              <td class="td"><HashLink :value="tk.owner" :to="`/wallet/${tk.owner}`" :head="8" :tail="6" :copy="false" /></td>
              <td class="td"><span class="inline-flex gap-1"><Pill v-if="tk.mintable" tone="ok">{{ t('tokens.mintable') }}</Pill><Pill v-if="tk.burnable" tone="brand">{{ t('tokens.burnable') }}</Pill><Pill v-if="!tk.mintable" tone="neutral">{{ t('tokens.fixed') }}</Pill></span></td>
              <td class="td text-end mono text-muted">{{ formatNumber(tk.initHeight) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  </div>
</template>
