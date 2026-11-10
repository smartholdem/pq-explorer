<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { ArrowRight } from 'lucide-vue-next'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import UsdHint from '@/components/ui/UsdHint.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import FinalityBadge from '@/components/ui/FinalityBadge.vue'
import Pill from '@/components/ui/Pill.vue'
import TxTypeBadge from './TxTypeBadge.vue'
import TokenAmount from '@/components/tokens/TokenAmount.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import type { Transaction } from '@/api/types'
import { isMultiPayment, multiPaymentTotal } from '@/utils/tx'
import { isTokenTx, tokenIdOf, tokenTxAmount, tokenTxRecipients } from '@/utils/token'
import { useChainStore } from '@/stores/chain'
import { useCacheStore } from '@/stores/cache'

defineProps<{ txs: Transaction[] | null; loading: boolean; error?: Error | null; highlight?: string; emptyMessage?: string; showBlock?: boolean; compact?: boolean }>()
const emit = defineEmits<{ (e: 'retry'): void }>()
const chain = useChainStore()
const cache = useCacheStore()
// live confirmations when the block is in the local window, otherwise what the node reported
const conf = (tx: Transaction) => cache.liveTx(tx).confirmations ?? tx.confirmations ?? 0
// legacy-format rows have no `finalized`; derive it from confirmations vs the SHIP-35 finalized height
const isFinal = (tx: Transaction) => {
  if (tx.finalized !== undefined) return tx.finalized
  const fin = chain.metrics?.finality?.finalizedHeight ?? 0
  return fin > 0 && chain.height > 0 && chain.height - (tx.confirmations ?? 0) <= fin
}
const displayAmount = (tx: Transaction) => (isMultiPayment(tx) ? multiPaymentTotal(tx).toString() : tx.amount)
const tokenDir = (tx: Transaction, hl?: string) => {
  if (!hl) return 'neutral'
  if (tokenTxRecipients(tx).some((r) => r.recipientId === hl)) return 'in'
  return tx.sender === hl && (tx.type === 1 || tx.type === 3 || tx.type === 5) ? 'out' : 'neutral'
}
const dir = (tx: Transaction, hl?: string) => {
  if (!hl || displayAmount(tx) === '0') return 'neutral'
  if (tx.sender === hl && tx.recipient !== hl) return 'out'
  return tx.recipient === hl ? 'in' : 'neutral'
}
</script>

<template>
  <div class="overflow-x-auto">
    <SkeletonRows v-if="loading && !txs" :rows="8" :cols="5" />
    <StatePanel v-else-if="error" :error="error" @retry="emit('retry')" />
    <StatePanel v-else-if="!txs?.length" :message="emptyMessage" empty />
    <table v-card-table v-else class="w-full" :class="compact ? 'min-w-[560px]' : 'min-w-[820px]'" data-testid="tx-table">
      <thead>
        <tr>
          <th class="th">{{ $t('common.id') }}</th>
          <th class="th">{{ $t('common.type') }}</th>
          <th class="th">{{ $t('common.from') }} → {{ $t('common.to') }}</th>
          <th v-if="showBlock" class="th">{{ $t('common.block') }}</th>
          <th v-if="!compact" class="th">{{ $t('txs.memo') }}</th>
          <th class="th text-end">{{ $t('common.amount') }}</th>
          <th v-if="!compact" class="th text-end">{{ $t('common.fee') }}</th>
          <th v-if="!compact" class="th">{{ $t('common.age') }}</th>
          <th class="th"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tx in txs" :key="tx.id" class="row-hover" data-testid="tx-row">
          <td class="td card-title"><HashLink :value="tx.id" :to="`/tx/${tx.id}`" :head="compact ? 6 : 8" :tail="4" :copy="!compact" /></td>
          <td class="td"><TxTypeBadge :tx="tx" /></td>
          <td class="td">
            <div class="flex items-center gap-2 min-w-0">
              <HashLink :value="tx.sender" :to="`/wallet/${tx.sender}`" :head="5" :tail="4" :copy="false" />
              <ArrowRight class="rtl:-scale-x-100 h-3.5 w-3.5 text-muted shrink-0" />
              <HashLink v-if="tx.recipient" :value="tx.recipient" :to="`/wallet/${tx.recipient}`" :head="5" :tail="4" :copy="false" />
              <template v-else-if="isTokenTx(tx) && tokenTxRecipients(tx).length">
                <HashLink v-if="tokenTxRecipients(tx).length === 1" :value="tokenTxRecipients(tx)[0].recipientId" :to="`/wallet/${tokenTxRecipients(tx)[0].recipientId}`" :head="5" :tail="4" :copy="false" />
                <span v-else class="text-muted text-xs" data-testid="tx-token-recipients">{{ $t('txs.recipientsCount', { n: tokenTxRecipients(tx).length }) }}</span>
              </template>
              <span v-else class="text-muted text-xs">{{ isMultiPayment(tx) ? $t('txs.recipientsCount', { n: tx.asset?.payments?.length ?? 0 }) : '—' }}</span>
            </div>
          </td>
          <td v-if="showBlock" class="td"><HashLink :value="tx.blockId" :to="`/block/${tx.blockId}`" :head="6" :tail="4" :copy="false" /></td>
          <td v-if="!compact" class="td text-xs text-muted max-w-[200px]"><span class="block truncate" :title="tx.vendorField ?? ''" data-testid="tx-memo">{{ tx.vendorField ?? '' }}</span></td>
          <td v-if="isTokenTx(tx)" class="td text-end" data-testid="tx-token-amount"><TokenAmount v-if="tokenTxAmount(tx) !== null" :token-id="tokenIdOf(tx)" :value="tokenTxAmount(tx)" :tone="tokenDir(tx, highlight)" /><span v-else class="text-muted">—</span></td>
          <td v-else class="td text-end"><UsdHint :value="displayAmount(tx)"><Amount :value="displayAmount(tx)" :tone="dir(tx, highlight)" /></UsdHint></td>
          <td v-if="!compact" class="td text-end text-muted"><Amount :value="tx.fee" :symbol="null" :max-frac="4" /></td>
          <td v-if="!compact" class="td text-muted whitespace-nowrap"><TimeAgo :unix="tx.timestamp?.unix" /></td>
          <td class="td text-end">
            <Pill v-if="!tx.blockId" tone="warn" data-testid="mempool-badge">{{ $t('txs.mempool') }}</Pill>
            <FinalityBadge v-else :finalized="isFinal(tx)" :confirmations="conf(tx)" compact />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
