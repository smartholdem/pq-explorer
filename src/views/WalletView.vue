<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Atom, ShieldCheck, ShieldOff, Lock as LockIcon, Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Boxes } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import type { Lock } from '@/api/types'
import { useQuery } from '@/composables/useQuery'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareButton from '@/components/ui/ShareButton.vue'
import FavoriteButton from '@/components/ui/FavoriteButton.vue'
import AddressQr from '@/components/ui/AddressQr.vue'
import Panel from '@/components/ui/Panel.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import UsdValue from '@/components/ui/UsdValue.vue'
import Pill from '@/components/ui/Pill.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import TxTable from '@/components/tx/TxTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import WalletTokenMarket from '@/components/tokens/WalletTokenMarket.vue'
import { useTokensStore } from '@/stores/tokens'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import { formatNumber, fromUnits } from '@/utils/format'
import { pqAlgorithmName } from '@/utils/tx'
import { sobjTypeKey, sobjTone } from '@/utils/sobj'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const tokensDict = useTokensStore()
const { data: w, loading, error, reload } = useQuery(() => net.api.wallets.get(props.id), [() => props.id])
const address = computed(() => w.value?.address ?? null)
const notFound = computed(() => error.value instanceof ApiError && error.value.isNotFound)

const tokens = useQuery(async (s) => (address.value ? net.api.wallets.tokens(address.value).catch(() => ({ data: [] })) : { data: [] }), [address])
const walletOrders = useQuery(async () => (address.value ? net.api.wallets.orders(address.value, { limit: 100 }).catch(() => ({ data: [] })) : { data: [] }), [address])
const openOrders = computed(() => (walletOrders.data.value ?? []).filter((o) => o.open))
// wallet token balances exclude units escrowed in its own open orders
const inOrdersBy = computed(() => openOrders.value.reduce((m, o) => m.set(o.tokenId, (m.get(o.tokenId) ?? 0n) + BigInt(o.remaining ?? 0)), new Map<string, bigint>()))
const issued = computed<string[]>(() => { const x = w.value?.attributes?.tokensIssued; return Array.isArray(x) ? x.map((v: any) => (typeof v === 'string' ? v : v?.id)).filter(Boolean) : x && typeof x === 'object' ? Object.keys(x) : [] })
const tokenIds = computed(() => [...new Set([...(tokens.data.value ?? []).map((tk) => tk.tokenId ?? tk.id ?? '').filter(Boolean), ...issued.value])])
const locks = useQuery(async (s) => (address.value ? net.api.wallets.locks(address.value, { limit: 50 }).catch(() => ({ data: [] })) : { data: [] }), [address])
const attrs = computed(() => w.value?.attributes ?? {})
const username = computed(() => w.value?.username ?? attrs.value.delegate?.username ?? null)
const isDelegate = computed(() => Boolean(w.value?.isDelegate || attrs.value.delegate))
const isResigned = computed(() => Boolean(w.value?.isResigned || attrs.value.delegate?.resigned))
const vote = computed<string | null>(() => w.value?.vote ?? attrs.value.vote ?? null)
const secondPublicKey = computed<string | null>(() => w.value?.secondPublicKey ?? attrs.value.secondPublicKey ?? null)
const delegate = useQuery(async () => (isDelegate.value && address.value ? net.api.delegates.get(address.value).catch(() => ({ data: null })) : { data: null }), [address, isDelegate])
const votedFor = useQuery(async () => (vote.value ? net.api.delegates.get(vote.value).catch(() => ({ data: null })) : { data: null }), [vote])

const kind = ref<'all' | 'sent' | 'received' | 'tokens'>('all')
const page = ref(1)
const limit = ref(25)
const txq = useQuery(async (s) => (!address.value ? { data: [] } : kind.value === 'tokens'
  ? net.api.transactions.list({ address: address.value, typeGroup: 3, page: page.value, limit: limit.value })
  : net.api.wallets.transactions(address.value, kind.value, { page: page.value, limit: limit.value })), [address, kind, page, limit])

const qs = computed(() => w.value?.quantumShield)
const qsState = computed(() => (qs.value?.active ? 'active' : qs.value?.committed ? 'committed' : 'none'))
const sobjects = computed(() => Object.entries(w.value?.attributes?.sobjects ?? {}))

// HTLC: direction relative to this wallet, humanised expiry (type 1 = epoch seconds, type 2 = block height)
const chain = useChainStore()
const epochUnix = computed(() => chain.epochUnix)
const lockList = computed(() => locks.data.value ?? [])
const activeLocks = computed(() => lockList.value.filter((l) => !l.isExpired))
const lockedTotal = computed(() => activeLocks.value.reduce((s, l) => s + BigInt(l.amount ?? 0), 0n))
const lockDir = (l: Lock) => (l.senderPublicKey === w.value?.publicKey ? 'out' : 'in')
const lockExpiryUnix = (l: Lock) => (l.expirationType === 1 ? epochUnix.value + l.expirationValue : null)
const lockBlocksLeft = (l: Lock) => (l.expirationType === 2 && chain.height ? l.expirationValue - chain.height : null)
</script>

<template>
  <div data-testid="wallet-page">
    <PageHeader :title="username ? `${t('wallet.title')} · ${username}` : t('wallet.title')" :subtitle="w?.address ?? id">
      <template v-if="w">
        <Pill v-if="isDelegate" tone="brand">{{ t('wallet.delegate') }}<span v-if="isResigned"> · {{ t('common.resigned') }}</span></Pill>
        <Pill v-if="qsState === 'active'" tone="ok" glow data-testid="wallet-qs-pill"><ShieldCheck class="h-3 w-3" />{{ t('wallet.qsActive') }}</Pill>
        <Pill v-else-if="qsState === 'committed'" tone="quantum" data-testid="wallet-qs-pill"><Atom class="h-3 w-3" />{{ t('wallet.qsCommitted') }}</Pill>
        <Pill v-if="qsState !== 'none' && qs?.algorithm !== undefined" tone="quantum" data-testid="wallet-qs-algo">{{ pqAlgorithmName(qs?.algorithm) }}</Pill>
        <a v-if="activeLocks.length" href="#htlc" class="contents" data-testid="wallet-htlc-pill"><Pill tone="warn"><LockIcon class="h-3 w-3" />{{ t('wallet.htlcN', activeLocks.length) }}</Pill></a>
        <a v-if="sobjects.length" href="#sobj" class="contents" data-testid="wallet-sobj-pill"><Pill tone="quantum"><Boxes class="h-3 w-3" />{{ sobjects.length }} SmartObjects</Pill></a>
        <FavoriteButton kind="wallet" :id="w.address" :label="username" />
        <AddressQr :address="w.address" :label="username" />
        <ShareButton :title="username ? `${username} · ${w.address}` : w.address" :subtitle="w.publicKey ?? undefined" :kind="t('wallet.title')" :facts="[{ label: t('common.balance'), value: `${fromUnits(w.balance, 8, 2)} ${net.current.symbol}` }, { label: t('wallet.quantum'), value: qsState === 'active' ? t('wallet.qsActive') : qsState === 'committed' ? t('wallet.qsCommitted') : t('wallet.qsNone') }]" />
      </template>
    </PageHeader>

    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 5" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 10 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !w"><StatePanel :error="notFound ? new Error(t('wallet.notFound')) : error" @retry="reload" /></Panel>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="card p-5 lg:col-span-2 animate-rise" data-testid="wallet-balance-card">
          <div class="flex items-start justify-between"><div class="eyebrow">{{ t('common.balance') }}</div><WalletIcon class="h-4 w-4 text-cyan/70" /></div>
          <div class="mt-2 font-display text-3xl md:text-4xl font-semibold tracking-tight"><Amount :value="w.balance" /></div>
          <div class="mt-1 text-sm" data-testid="wallet-balance-usd"><UsdValue :value="w.balance" /></div>
          <dl class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 text-sm">
            <div class="py-2 border-t hair"><dt class="eyebrow text-[10px]">{{ t('common.address') }}</dt><dd class="mt-1"><HashLink :value="w.address" full :head="16" :tail="12" /></dd></div>
            <div class="py-2 border-t hair"><dt class="eyebrow text-[10px]">{{ t('common.publicKey') }}</dt><dd class="mt-1"><HashLink :value="w.publicKey" :head="16" :tail="12" /></dd></div>
            <div class="py-2 border-t hair"><dt class="eyebrow text-[10px]">{{ t('common.nonce') }}</dt><dd class="mt-1 mono">{{ w.nonce }}</dd></div>
            <div class="py-2 border-t hair"><dt class="eyebrow text-[10px]">{{ t('common.vote') }}</dt>
              <dd class="mt-1" data-testid="wallet-vote">
                <template v-if="vote">
                  <RouterLink v-if="votedFor.data.value" :to="`/delegate/${votedFor.data.value.username}`" class="link font-semibold">{{ votedFor.data.value.username }}</RouterLink>
                  <HashLink v-else :value="vote" :to="`/wallet/${vote}`" :head="10" :tail="8" />
                </template>
                <span v-else class="text-muted">{{ t('wallet.notVoting') }}</span>
              </dd></div>
            <div v-if="secondPublicKey" class="py-2 border-t hair sm:col-span-2"><dt class="eyebrow text-[10px]">{{ t('wallet.secondPubKey') }}</dt><dd class="mt-1"><HashLink :value="secondPublicKey" full /></dd></div>
          </dl>
          <div v-if="delegate.data.value" class="mt-4 pt-4 border-t hair grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm" data-testid="wallet-delegate-stats">
            <div><div class="eyebrow text-[10px]">{{ t('common.rank') }}</div><RouterLink :to="`/delegate/${delegate.data.value.username}`" class="font-display text-xl font-semibold link" data-testid="wallet-delegate-link">#{{ delegate.data.value.rank }}</RouterLink></div>
            <div><div class="eyebrow text-[10px]">{{ t('common.votes') }}</div><div class="mono"><Amount :value="delegate.data.value.votes" :max-frac="0" :symbol="null" /></div></div>
            <div><div class="eyebrow text-[10px]">{{ t('delegates.produced') }}</div><div class="mono">{{ formatNumber(delegate.data.value.blocks.produced) }}</div></div>
            <div><div class="eyebrow text-[10px]">{{ t('delegates.forged') }}</div><div class="mono"><Amount :value="delegate.data.value.forged.total" :max-frac="0" /></div></div>
          </div>
        </div>

        <div class="card p-5 animate-rise" :class="qsState === 'active' && 'border-ok/40 shadow-[0_0_24px_rgba(34,230,120,0.18)]'" data-testid="wallet-quantum-card">
          <div class="flex items-start justify-between"><div class="eyebrow">{{ t('wallet.quantum') }}</div><Atom class="h-4 w-4" :class="qsState === 'active' ? 'text-ok' : qsState === 'committed' ? 'text-quantum' : 'text-muted'" /></div>
          <div class="mt-3">
            <Pill v-if="qsState === 'active'" tone="ok" glow><ShieldCheck class="h-3 w-3" />{{ t('wallet.qsActive') }}</Pill>
            <Pill v-else-if="qsState === 'committed'" tone="quantum"><Atom class="h-3 w-3" />{{ t('wallet.qsCommitted') }}</Pill>
            <Pill v-else tone="neutral"><ShieldOff class="h-3 w-3" />{{ t('wallet.qsNone') }}</Pill>
          </div>
          <p class="mt-3 text-xs text-muted leading-relaxed">
            {{ qsState === 'active' ? t('wallet.qsActiveDesc', { alg: pqAlgorithmName(qs?.algorithm) }) : qsState === 'committed' ? t('wallet.qsCommittedDesc', { h: formatNumber(qs?.height) }) : t('wallet.qsNoneDesc') }}
          </p>
          <dl v-if="qsState !== 'none'" class="mt-4 space-y-2 text-xs">
            <div v-if="qs?.algorithm !== undefined"><dt class="eyebrow text-[10px]">{{ t('common.algorithm') }}</dt><dd class="mono">{{ pqAlgorithmName(qs?.algorithm) }}</dd></div>
            <div v-if="qs?.commitment"><dt class="eyebrow text-[10px]">{{ t('wallet.commitment') }}</dt><dd class="mono break-all text-muted">{{ qs.commitment }}</dd></div>
            <div v-if="qs?.publicKey"><dt class="eyebrow text-[10px]">{{ t('common.publicKey') }} (PQ)</dt><dd><HashLink :value="qs.publicKey" :head="20" :tail="12" /></dd></div>
            <div v-if="qs?.since"><dt class="eyebrow text-[10px]">{{ t('wallet.since') }}</dt><dd class="mono">{{ formatNumber(qs.since) }}</dd></div>
          </dl>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel :title="t('wallet.tokens')">
          <div v-if="issued.length" class="px-5 pb-3 flex flex-wrap items-center gap-2 text-xs" data-testid="wallet-issued-tokens">
            <span class="text-muted">{{ t('tmarket.issued') }}:</span>
            <RouterLink v-for="id in issued" :key="id" :to="`/token/${id}`"><Pill tone="brand">{{ tokensDict.get(id)?.symbol ?? id.slice(0, 8) + '…' }}</Pill></RouterLink>
          </div>
          <div v-if="tokens.loading.value" class="px-5 pb-5 space-y-2"><div v-for="i in 3" :key="i" class="skeleton h-8"></div></div>
          <div v-else-if="!tokens.data.value?.length" class="px-5 pb-5 text-sm text-muted">{{ t('wallet.noTokens') }}</div>
          <div v-else class="divide-y hair" data-testid="wallet-tokens">
            <RouterLink v-for="tk in tokens.data.value" :key="tk.tokenId ?? tk.id ?? tk.symbol" :to="`/token/${tk.tokenId ?? tk.id ?? tk.symbol}`" class="flex items-center gap-3 px-5 py-3 row-hover">
              <TokenLogo :token-key="tk.tokenId ?? tk.id ?? tk.symbol" :symbol="tk.symbol" :size="32" />
              <div class="min-w-0 flex-1"><div class="font-semibold text-sm">{{ tk.symbol }}</div><div class="text-xs text-muted truncate">{{ tk.meta?.name ?? tokensDict.get(tk.tokenId ?? tk.id)?.meta?.name ?? tk.tokenId ?? tk.id }}</div></div>
              <div class="text-end">
                <Amount :value="tk.balance" :decimals="tk.decimals" :symbol="tk.symbol" :max-frac="tk.decimals" />
                <div v-if="inOrdersBy.get(tk.tokenId ?? tk.id ?? '')" class="text-[11px] text-brand" data-testid="wallet-token-in-orders">{{ t('tmarket.inOrders') }}: <Amount :value="inOrdersBy.get(tk.tokenId ?? tk.id ?? '')!.toString()" :decimals="tk.decimals" :max-frac="tk.decimals" :symbol="null" /></div>
              </div>
            </RouterLink>
          </div>
        </Panel>
        <Panel id="htlc" :title="t('wallet.locks')" :subtitle="activeLocks.length ? t('wallet.locksSub', { n: activeLocks.length }) : undefined">
          <template #actions><span v-if="activeLocks.length" class="text-xs mono text-warn" data-testid="wallet-locked-total"><Amount :value="lockedTotal.toString()" :max-frac="2" /></span></template>
          <div v-if="locks.loading.value" class="px-5 pb-5 space-y-2"><div v-for="i in 2" :key="i" class="skeleton h-8"></div></div>
          <div v-else-if="!lockList.length" class="px-5 pb-5 text-sm text-muted flex items-center gap-2"><LockIcon class="h-3.5 w-3.5 opacity-60" />{{ t('wallet.noLocks') }}</div>
          <div v-else class="divide-y hair" data-testid="wallet-locks">
            <div v-for="l in lockList" :key="l.lockId" class="px-5 py-3 flex items-center gap-3" :class="l.isExpired && 'opacity-60'" data-testid="wallet-lock-row">
              <div class="h-8 w-8 rounded-full border hair flex items-center justify-center shrink-0" :class="l.isExpired ? 'text-muted' : lockDir(l) === 'in' ? 'text-ok border-ok/30 bg-ok/5' : 'text-warn border-warn/30 bg-warn/5'">
                <ArrowDownLeft v-if="lockDir(l) === 'in'" class="h-4 w-4" /><ArrowUpRight v-else class="h-4 w-4" />
              </div>
              <div class="min-w-0 flex-1 text-xs">
                <div class="flex items-center gap-2"><HashLink :value="l.lockId" :to="`/tx/${l.lockId}`" :head="10" :tail="8" /><span class="text-muted">{{ lockDir(l) === 'in' ? t('wallet.lockIn') : t('wallet.lockOut') }}</span></div>
                <div class="text-muted mt-0.5 flex flex-wrap items-center gap-x-2">
                  <span>{{ lockDir(l) === 'in' ? t('common.from') : t('common.to') }} <HashLink :value="lockDir(l) === 'in' ? l.senderPublicKey : l.recipientId" :to="lockDir(l) === 'in' ? undefined : `/wallet/${l.recipientId}`" :head="8" :tail="6" :copy="false" /></span>
                  <span>· {{ t('wallet.expires') }}
                    <template v-if="lockExpiryUnix(l) !== null"><TimeAgo :unix="lockExpiryUnix(l)!" /></template>
                    <template v-else>#{{ formatNumber(l.expirationValue) }}<span v-if="lockBlocksLeft(l) !== null && lockBlocksLeft(l)! > 0" class="text-warn"> · {{ t('wallet.blocksLeft', { n: formatNumber(lockBlocksLeft(l)!) }) }}</span></template>
                  </span>
                  <span v-if="l.vendorField" class="truncate max-w-[200px]" :title="l.vendorField">· {{ l.vendorField }}</span>
                </div>
              </div>
              <Amount :value="l.amount" :max-frac="4" :tone="l.isExpired ? 'neutral' : lockDir(l)" />
              <Pill :tone="l.isExpired ? 'neutral' : 'warn'">{{ l.isExpired ? t('wallet.lockExpired') : t('wallet.lockActive') }}</Pill>
            </div>
          </div>
        </Panel>
      </div>

      <Panel v-if="sobjects.length" id="sobj" title="SmartObjects" :subtitle="t('wallet.sobjSub')">
        <div class="divide-y hair" data-testid="wallet-sobjects">
          <RouterLink v-for="[rid, so] in sobjects" :key="rid" :to="`/sobj/${rid}`" class="px-5 py-3 text-sm flex flex-wrap items-center gap-3 row-hover" data-testid="wallet-sobj-row">
            <Pill :tone="sobjTone((so as any).type)">{{ t(`sobj.types.${sobjTypeKey((so as any).type)}`) }}<span class="opacity-60 ms-1">{{ (so as any).type }}/{{ (so as any).subType ?? 0 }}</span></Pill>
            <span class="font-semibold">{{ (so as any).data?.name ?? '—' }}</span>
            <HashLink :value="rid" :head="10" :tail="6" :copy="false" />
            <Pill v-if="(so as any).resigned" tone="neutral">{{ t('common.resigned') }}</Pill>
            <span v-if="(so as any).price" class="ms-auto text-xs text-brand font-semibold">{{ t('sobj.forSale') }} · <Amount :value="(so as any).price" /></span>
          </RouterLink>
        </div>
      </Panel>

      <WalletTokenMarket v-if="openOrders.length || tokenIds.length" :address="w.address" :orders="openOrders" :token-ids="tokenIds" />

      <Panel :title="t('wallet.history')">
        <template #actions>
          <div class="flex rounded-xl border hair overflow-hidden text-xs font-semibold" data-testid="wallet-tx-kind">
            <button v-for="k in ['all', 'sent', 'received', 'tokens'] as const" :key="k" class="px-3 py-1.5 transition-colors" :class="kind === k ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-fg'" @click="kind = k; page = 1" :data-testid="`wallet-tx-${k}`">
              {{ k === 'all' ? t('common.all') : k === 'tokens' ? t('nav.tokens') : t(`wallet.${k}`) }}
            </button>
          </div>
        </template>
        <TxTable :txs="txq.data.value" :loading="txq.loading.value" :error="txq.error.value" :highlight="w.address" show-block @retry="txq.reload" />
        <Pagination :page="page" :meta="txq.meta.value" :limit="limit" :loading="txq.loading.value" @update:page="page = $event" @update:limit="limit = $event; page = 1" />
      </Panel>

    </div>
  </div>
</template>
