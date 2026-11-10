<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import Pill from '@/components/ui/Pill.vue'
import TokenTxDetails from './TokenTxDetails.vue'
import type { Transaction } from '@/api/types'
import { txKind } from '@/utils/tx'
import { sobjAction, sobjTone, sobjTypeKey, isUrlPointer, pointerHref } from '@/utils/sobj'

const props = defineProps<{ tx: Transaction }>()
const { t } = useI18n()
const kind = computed(() => txKind(props.tx))
const asset = computed(() => props.tx.asset ?? {})
const votes = computed<string[]>(() => asset.value.votes ?? [])
const payments = computed<{ recipientId: string; amount: string }[]>(() => asset.value.payments ?? [])
const token = computed(() => asset.value.token ?? asset.value.tokenTransfer ?? asset.value.tokenInit ?? asset.value.tokenMint ?? asset.value.tokenBurn ?? asset.value.tokenMeta ?? null)
// SHIP-13 assets come flat ({type, subType, action, data, registrationId, price, recipientId}); legacy wrappers are nested
const sobj = computed(() => asset.value.sobj ?? asset.value.smartObject ?? asset.value.sobjRegistration ?? asset.value.sobjUpdate ?? (kind.value.group === 'sobj' && (asset.value.data || asset.value.type !== undefined) ? asset.value : null))
const delegate = computed(() => asset.value.delegate ?? null)
const lock = computed(() => asset.value.lock ?? null)
const claim = computed(() => asset.value.claim ?? null)
const refund = computed(() => asset.value.refund ?? null)
const generic = computed(() => {
  if (sobj.value === asset.value) return null
  const known = ['votes', 'payments', 'token', 'tokenTransfer', 'tokenInit', 'tokenMint', 'tokenBurn', 'tokenMeta', 'sobj', 'smartObject', 'sobjRegistration', 'sobjUpdate', 'delegate', 'lock', 'claim', 'refund']
  const rest = Object.fromEntries(Object.entries(asset.value).filter(([k]) => !known.includes(k)))
  return Object.keys(rest).length ? rest : null
})
const voteEntries = computed(() => votes.value.map((v) => ({ op: v.startsWith('-') ? 'unvote' : 'vote', target: v.replace(/^[+-]/, '') })))
</script>

<template>
  <dl data-testid="tx-asset">
    <DetailRow v-if="voteEntries.length" :label="t('common.vote')">
      <div v-for="v in voteEntries" :key="v.target" class="flex items-center gap-2 py-0.5">
        <Pill :tone="v.op === 'vote' ? 'ok' : 'warn'">{{ v.op === 'vote' ? t('txs.voteFor') : t('txs.unvote') }}</Pill>
        <HashLink :value="v.target" :to="`/wallet/${v.target}`" :head="14" :tail="10" />
      </div>
    </DetailRow>

    <DetailRow v-if="payments.length" :label="`${t('common.payments')} · ${payments.length}`">
      <div class="max-h-72 overflow-auto -mx-1 px-1 divide-y hair">
        <div v-for="(p, i) in payments" :key="i" class="flex items-center justify-between gap-3 py-1.5">
          <HashLink :value="p.recipientId" :to="`/wallet/${p.recipientId}`" :head="12" :tail="8" />
          <Amount :value="p.amount" />
        </div>
      </div>
    </DetailRow>

    <DetailRow v-if="delegate" :label="t('wallet.delegate')">
      <RouterLink :to="`/wallet/${delegate.username}`" class="link font-semibold">{{ delegate.username }}</RouterLink>
    </DetailRow>

    <TokenTxDetails v-if="kind.group === 'token' && asset.token" :tx="tx" />
    <template v-else-if="token">
      <DetailRow :label="t('txs.tokenId')" mono>
        <HashLink v-if="token.tokenId || token.id" :value="token.tokenId ?? token.id" :to="`/token/${token.tokenId ?? token.id}`" :head="12" :tail="8" />
        <span v-if="token.symbol" class="ms-2 font-semibold">{{ token.symbol }}</span>
      </DetailRow>
      <DetailRow v-if="token.recipients?.length" :label="`${t('common.recipients')} · ${token.recipients.length}`">
        <div class="divide-y hair">
          <div v-for="(r, i) in token.recipients" :key="i" class="flex items-center justify-between gap-3 py-1.5">
            <HashLink :value="r.recipientId ?? r.address" :to="`/wallet/${r.recipientId ?? r.address}`" :head="12" :tail="8" />
            <Amount :value="r.amount" :decimals="token.decimals ?? 8" :symbol="token.symbol ?? null" />
          </div>
        </div>
      </DetailRow>
      <DetailRow v-if="token.amount && !token.recipients" :label="t('common.amount')"><Amount :value="token.amount" :decimals="token.decimals ?? 8" :symbol="token.symbol ?? null" /></DetailRow>
      <DetailRow v-if="token.supply" :label="t('common.supply')"><Amount :value="token.supply" :decimals="token.decimals ?? 8" :symbol="token.symbol ?? null" /></DetailRow>
      <DetailRow v-if="token.meta" :label="t('common.details')" mono><pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(token.meta, null, 2) }}</pre></DetailRow>
    </template>

    <template v-if="lock">
      <DetailRow :label="t('wallet.secretHash')" mono><HashLink :value="lock.secretHash" full /></DetailRow>
      <DetailRow :label="t('wallet.expires')" mono>{{ lock.expiration?.type === 1 ? 'epoch ' : 'height ' }}{{ lock.expiration?.value }}</DetailRow>
    </template>
    <DetailRow v-if="claim" :label="t('txs.types.htlcClaim')" mono>
      <div>lock: <HashLink :value="claim.lockTransactionId" :to="`/tx/${claim.lockTransactionId}`" /></div>
      <div class="text-muted">secret: {{ claim.unlockSecret }}</div>
    </DetailRow>
    <DetailRow v-if="refund" :label="t('txs.types.htlcRefund')" mono>lock: <HashLink :value="refund.lockTransactionId" :to="`/tx/${refund.lockTransactionId}`" /></DetailRow>

    <template v-if="sobj">
      <DetailRow :label="kind.key === 'smartObject' ? 'SmartObject' : t('common.asset')">
        <span class="inline-flex flex-wrap items-center gap-1.5">
          <Pill v-if="sobjAction(sobj.action)" :tone="sobj.action === 2 ? 'neutral' : sobj.action === 4 ? 'brand' : sobj.action === 5 ? 'ok' : 'quantum'">{{ t(`sobj.actions.${sobjAction(sobj.action)}`, sobjAction(sobj.action) ?? '') }}</Pill>
          <Pill v-if="sobj.type !== undefined" :tone="sobjTone(sobj.type)">{{ t(`sobj.types.${sobjTypeKey(sobj.type)}`) }}<span class="opacity-60 ms-1">{{ sobj.type }}/{{ sobj.subType ?? 0 }}</span></Pill>
          <span v-if="sobj.data?.name" class="font-semibold">{{ sobj.data.name }}</span>
        </span>
      </DetailRow>
      <DetailRow :label="t('sobj.object')" mono><HashLink :value="sobj.registrationId ?? tx.id" :to="`/sobj/${sobj.registrationId ?? tx.id}`" :head="16" :tail="12" /></DetailRow>
      <DetailRow v-if="sobj.recipientId" :label="t('common.recipient')" mono><HashLink :value="sobj.recipientId" :to="`/wallet/${sobj.recipientId}`" :head="14" :tail="10" /></DetailRow>
      <DetailRow v-if="sobj.price" :label="t('common.price')"><Amount :value="sobj.price" /></DetailRow>
      <DetailRow v-if="sobj.data?.ntfryData" :label="t('sobj.pointer')" mono>
        <a v-if="isUrlPointer(sobj.data.ntfryData)" :href="pointerHref(sobj.data.ntfryData)" target="_blank" rel="noopener" class="link break-all">{{ sobj.data.ntfryData }}</a>
        <span v-else class="break-all">{{ sobj.data.ntfryData }}</span>
      </DetailRow>
    </template>

    <DetailRow v-if="generic" :label="t('common.asset')" mono>
      <pre class="text-xs whitespace-pre-wrap">{{ JSON.stringify(generic, null, 2) }}</pre>
    </DetailRow>
  </dl>
</template>
