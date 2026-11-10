<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Atom, ArrowRight, KeyRound } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useCacheStore } from '@/stores/cache'
import { useQuery } from '@/composables/useQuery'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareButton from '@/components/ui/ShareButton.vue'
import Panel from '@/components/ui/Panel.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import UsdValue from '@/components/ui/UsdValue.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import Pill from '@/components/ui/Pill.vue'
import FinalityBadge from '@/components/ui/FinalityBadge.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import TxTypeBadge from '@/components/tx/TxTypeBadge.vue'
import TxAssetView from '@/components/tx/TxAssetView.vue'
import TokenAmount from '@/components/tokens/TokenAmount.vue'
import { isTokenTx, tokenIdOf, tokenTxAmount, tokenTxRecipients } from '@/utils/token'
import { isQuantum, isMultiPayment, multiPaymentTotal, pqAlgorithmName, txKind } from '@/utils/tx'
import { formatNumber, fromUnits } from '@/utils/format'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const cache = useCacheStore()
const unconfirmed = ref(false)
const { data: tx, loading, error, reload } = useQuery(async () => {
  unconfirmed.value = false
  try { return { data: await cache.getTx(props.id) } } catch (e) {
    if (e instanceof ApiError && e.isNotFound) {
      const u = await net.api.transactions.unconfirmed({ limit: 100 }).catch(() => ({ data: [] as any[] }))
      const found = u.data.find((x: any) => x.id === props.id)
      if (found) { unconfirmed.value = true; return { data: found } }
    }
    throw e
  }
}, [() => props.id])

const quantum = computed(() => (tx.value ? isQuantum(tx.value) : false))
// confirmations/finality follow the live tip while the page stays open
const live = computed(() => (tx.value ? cache.liveTx(tx.value) : null))
const kind = computed(() => (tx.value ? txKind(tx.value) : null))
const amount = computed(() => (tx.value ? (isMultiPayment(tx.value) ? multiPaymentTotal(tx.value).toString() : tx.value.amount) : '0'))
const hasAsset = computed(() => tx.value?.asset && Object.keys(tx.value.asset).length > 0)
const showRaw = ref(false)
const notFound = computed(() => error.value instanceof ApiError && error.value.isNotFound)
</script>

<template>
  <div data-testid="transaction-page">
    <PageHeader :title="t('common.transaction')" :subtitle="tx?.id ?? id">
      <template v-if="tx">
        <TxTypeBadge :tx="tx" />
        <Pill v-if="unconfirmed" tone="warn">{{ t('txs.inMempool') }}</Pill>
        <FinalityBadge v-else :finalized="live?.finalized" :confirmations="live?.confirmations ?? 0" />
        <ShareButton :title="`${t('common.transaction')} ${tx.id.slice(0, 10)}…`" :subtitle="tx.id" :kind="t('common.transaction')" :facts="[{ label: t('common.amount'), value: `${fromUnits(amount, 8, 8)} ${net.current.symbol}` }, { label: t('common.fee'), value: `${fromUnits(tx.fee, 8, 8)} ${net.current.symbol}` }, { label: t('common.sender'), value: tx.sender }, { label: t('common.recipient'), value: tx.recipient ?? '—' }]" />
      </template>
    </PageHeader>

    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 7" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 8 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !tx"><StatePanel :error="notFound ? new Error(t('txs.notFound')) : error" @retry="reload" /></Panel>

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-6">
        <Panel :title="t('txs.overview')">
          <template #actions><button class="btn-ghost !py-1 text-xs" @click="showRaw = !showRaw" data-testid="tx-raw-toggle">{{ t('common.raw') }}</button></template>
          <div class="mx-5 mb-4 card !rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6" data-testid="tx-flow">
            <div class="min-w-0 flex-1">
              <div class="eyebrow mb-1">{{ t('common.sender') }}</div>
              <HashLink :value="tx.sender" :to="`/wallet/${tx.sender}`" :head="14" :tail="10" />
            </div>
            <ArrowRight class="rtl:-scale-x-100 h-5 w-5 text-cyan shrink-0 hidden sm:block" />
            <div class="min-w-0 flex-1">
              <div class="eyebrow mb-1">{{ t('common.recipient') }}</div>
              <HashLink v-if="tx.recipient" :value="tx.recipient" :to="`/wallet/${tx.recipient}`" :head="14" :tail="10" />
              <template v-else-if="isTokenTx(tx) && tokenTxRecipients(tx).length">
                <HashLink v-if="tokenTxRecipients(tx).length === 1" :value="tokenTxRecipients(tx)[0].recipientId" :to="`/wallet/${tokenTxRecipients(tx)[0].recipientId}`" :head="14" :tail="10" />
                <span v-else class="text-sm text-muted">{{ t('txs.recipientsCount', { n: tokenTxRecipients(tx).length }) }}</span>
              </template>
              <span v-else class="text-sm text-muted">{{ isMultiPayment(tx) ? t('txs.recipientsCount', { n: tx.asset?.payments?.length ?? 0 }) : '—' }}</span>
            </div>
            <div class="text-end shrink-0">
              <div class="eyebrow mb-1">{{ t('common.amount') }}</div>
              <div v-if="isTokenTx(tx)" class="font-display text-xl font-semibold" data-testid="tx-token-amount"><TokenAmount v-if="tokenTxAmount(tx) !== null" :token-id="tokenIdOf(tx)" :value="tokenTxAmount(tx)" /><span v-else class="text-muted">—</span></div>
              <template v-else>
                <div class="font-display text-xl font-semibold"><Amount :value="amount" /></div>
                <div class="text-xs mt-0.5" data-testid="tx-amount-usd"><UsdValue :value="amount" precise /></div>
              </template>
            </div>
          </div>
          <dl class="border-t hair">
            <DetailRow :label="t('common.id')" mono><HashLink :value="tx.id" full /></DetailRow>
            <DetailRow :label="t('common.block')" mono>
              <HashLink v-if="tx.blockId" :value="tx.blockId" :to="`/block/${tx.blockId}`" full />
              <span v-else class="text-warn">{{ t('txs.inMempool') }}</span>
            </DetailRow>
            <DetailRow :label="t('common.timestamp')" mono><template v-if="tx.timestamp"><TimeAgo :unix="tx.timestamp.unix" exact /> <span class="text-muted">· <TimeAgo :unix="tx.timestamp.unix" /></span></template><span v-else>—</span></DetailRow>
            <DetailRow :label="t('common.confirmations')" mono>{{ formatNumber(live?.confirmations ?? 0) }}</DetailRow>
            <DetailRow :label="t('common.fee')"><Amount :value="tx.fee" /> <span class="text-xs ms-2" data-testid="tx-fee-usd"><UsdValue :value="tx.fee" precise /></span></DetailRow>
            <DetailRow :label="t('common.type')">
              <TxTypeBadge :tx="tx" :show-quantum="false" />
              <span class="mono text-xs text-muted ms-2">{{ t('txs.typeGroup') }} {{ tx.typeGroup }} · {{ t('common.type').toLowerCase() }} {{ tx.type }} · v{{ tx.version }}</span>
            </DetailRow>
            <DetailRow :label="t('common.nonce')" mono>{{ tx.nonce }}</DetailRow>
            <DetailRow v-if="tx.vendorField" :label="t('common.vendorField')"><span class="break-words whitespace-pre-wrap">{{ tx.vendorField }}</span></DetailRow>
            <DetailRow :label="t('common.publicKey')" mono><HashLink :value="tx.senderPublicKey" full /></DetailRow>
          </dl>
          <pre v-if="showRaw" class="mono text-xs p-5 border-t hair overflow-auto max-h-96 text-muted" data-testid="tx-raw">{{ JSON.stringify(tx, null, 2) }}</pre>
        </Panel>

        <Panel v-if="hasAsset" :title="kind?.group === 'token' ? t('tmarket.tokenOp') : kind?.group === 'sobj' ? 'SmartObject' : t('common.asset')">
          <div class="border-t hair"><TxAssetView :tx="tx" /></div>
        </Panel>
      </div>

      <div class="space-y-6">
        <div class="card p-5 animate-rise" :class="quantum && 'border-quantum/40 shadow-[0_0_28px_rgba(167,139,250,0.18)]'" data-testid="tx-signatures">
          <div class="flex items-center justify-between">
            <div class="eyebrow">{{ t('common.signatures') }}</div>
            <Atom v-if="quantum" class="h-4 w-4 text-quantum" /><KeyRound v-else class="h-4 w-4 text-muted" />
          </div>
          <div class="mt-3">
            <Pill :tone="quantum ? 'quantum' : 'neutral'" :glow="quantum">{{ quantum ? t('txs.quantumTitle') : t('txs.classic') }}</Pill>
            <p v-if="quantum" class="text-xs text-muted mt-2 leading-relaxed">{{ t('txs.quantumDesc') }}</p>
          </div>
          <dl class="mt-4 space-y-3 text-xs">
            <div>
              <dt class="eyebrow text-[10px] mb-1">{{ t('txs.ecdsaSignature') }}</dt>
              <dd class="mono break-all text-muted">{{ tx.signature }}</dd>
            </div>
            <div v-if="tx.signSignature">
              <dt class="eyebrow text-[10px] mb-1">{{ t('txs.secondSignature') }}</dt>
              <dd class="mono break-all text-muted">{{ tx.signSignature }}</dd>
            </div>
            <div v-for="(s, i) in tx.secondSignatures ?? []" :key="i" class="rounded-xl border border-quantum/30 bg-quantum/5 p-3">
              <dt class="eyebrow text-[10px] mb-1 text-quantum">{{ t('txs.pqSignature') }} · {{ pqAlgorithmName(s.algorithm) }}</dt>
              <dd class="mono break-all text-muted max-h-40 overflow-auto">{{ s.signature }}</dd>
              <div class="mt-1 text-[10px] text-muted">{{ (s.signature?.length ?? 0) / 2 }} bytes</div>
            </div>
            <div v-if="tx.signatures?.length">
              <dt class="eyebrow text-[10px] mb-1">{{ t('txs.multisig') }} · {{ tx.signatures.length }}</dt>
              <dd v-for="(s, i) in tx.signatures" :key="i" class="mono break-all text-muted mb-1">{{ s }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  </div>
</template>
