<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Star, Wallet as WalletIcon, Users, X, Atom, ShieldCheck, AlertTriangle, Activity } from 'lucide-vue-next'
import { useFavoritesStore, type Favorite } from '@/stores/favorites'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'
import { useMissedSlots } from '@/composables/useMissedSlots'
import type { Wallet, Delegate } from '@/api/types'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Pill from '@/components/ui/Pill.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import { formatNumber } from '@/utils/format'

const { t } = useI18n()
const fav = useFavoritesStore()
const net = useNetworkStore()
const chain = useChainStore()
const slots = useMissedSlots(300)
const active = computed(() => chain.config?.constants?.activeDelegates ?? net.current.activeDelegates)

const wallets = shallowRef<Map<string, Wallet | null>>(new Map())
const delegates = shallowRef<Map<string, Delegate | null>>(new Map())
const loading = ref(false)
let lastHeight = 0

// re-fetch pinned entities when the list changes and at most every ~5 blocks
const refresh = async () => {
  if (!fav.items.length) return
  loading.value = !wallets.value.size && !delegates.value.size
  const [w, d] = await Promise.all([
    Promise.all(fav.wallets.map((f) => net.api.wallets.get(f.id).then((r) => [f.id, r.data] as const).catch(() => [f.id, null] as const))),
    Promise.all(fav.delegates.map((f) => net.api.delegates.get(f.id).then((r) => [f.id, r.data] as const).catch(() => [f.id, null] as const))),
  ])
  wallets.value = new Map(w)
  delegates.value = new Map(d)
  loading.value = false
  lastHeight = chain.height ?? 0
}
watch(() => fav.items.map((f) => f.kind + f.id).join(','), refresh, { immediate: true })
watch(() => chain.height, (h) => { if (h && h - lastHeight >= 5) void refresh() })

const qsOf = (w: Wallet | null) => (w?.quantumShield?.active ? 'active' : w?.quantumShield?.committed ? 'committed' : 'none')
const missedOf = (d: Delegate | null) => (d && slots.coverage.value ? slots.recentMissed(d.publicKey) : 0)
const statusOf = (d: Delegate | null): 'checking' | 'standby' | 'resigned' | 'forging' | 'missing' => {
  if (!d) return 'checking'
  if (d.isResigned) return 'resigned'
  if (d.rank > active.value) return 'standby'
  if (!slots.coverage.value) return 'checking'
  return missedOf(d) > 0 && slots.stillMissing(d.publicKey) ? 'missing' : 'forging'
}
const labelOf = (f: Favorite, entity: Wallet | Delegate | null) => (entity as Wallet | null)?.username ?? (entity as Delegate | null)?.username ?? f.label
</script>

<template>
  <div data-testid="favorites-panel">
    <div v-if="!fav.items.length" class="flex flex-col items-center justify-center gap-3 py-12 text-center" data-testid="fav-empty">
      <div class="h-12 w-12 rounded-full border hair bg-warn/5 flex items-center justify-center"><Star class="h-5 w-5 text-warn/80" /></div>
      <div class="text-sm text-muted max-w-sm">{{ t('fav.emptyHint') }}</div>
      <div class="flex gap-2 text-xs"><RouterLink to="/delegates" class="btn-ghost">{{ t('nav.delegates') }}</RouterLink><RouterLink to="/wallets" class="btn-ghost">{{ t('nav.wallets') }}</RouterLink></div>
    </div>
    <template v-else>
      <div v-if="fav.delegates.length" data-testid="fav-delegates">
        <div class="px-5 pt-4 pb-2 eyebrow flex items-center gap-2"><Users class="h-3.5 w-3.5" />{{ t('fav.delegates') }} <span class="mono text-muted">{{ fav.delegates.length }}</span></div>
        <div class="divide-y hair">
          <div v-for="f in fav.delegates" :key="f.id" class="px-5 py-3 flex flex-wrap items-center gap-3 row-hover" data-testid="fav-delegate-row">
            <div class="min-w-[140px]">
              <RouterLink :to="`/delegate/${f.id}`" class="link font-display font-semibold" data-testid="fav-delegate-name">{{ f.id }}</RouterLink>
              <div class="text-[11px] text-muted mono" v-if="delegates.get(f.id)">#{{ delegates.get(f.id)!.rank }} · {{ delegates.get(f.id)!.production.approval.toFixed(2) }}%</div>
              <div v-else-if="loading" class="skeleton h-3 w-20 mt-1"></div>
            </div>
            <template v-if="delegates.get(f.id)">
              <Pill v-if="statusOf(delegates.get(f.id)!) === 'forging'" tone="ok" glow><Activity class="h-3 w-3" />{{ t('delegate.forging') }}</Pill>
              <span v-if="statusOf(delegates.get(f.id)!) === 'forging' && missedOf(delegates.get(f.id)!) > 0" class="text-[11px] text-warn">{{ t('delegate.recovered', { n: missedOf(delegates.get(f.id)!) }) }}</span>
              <Pill v-else-if="statusOf(delegates.get(f.id)!) === 'missing'" tone="bad" glow><AlertTriangle class="h-3 w-3" />{{ t('delegate.missing', { n: missedOf(delegates.get(f.id)!) }) }}</Pill>
              <Pill v-else-if="statusOf(delegates.get(f.id)!) === 'standby'" tone="neutral">{{ t('delegates.standby') }}</Pill>
              <Pill v-else-if="statusOf(delegates.get(f.id)!) === 'resigned'" tone="neutral">{{ t('common.resigned') }}</Pill>
              <Pill v-else tone="neutral"><span class="h-1.5 w-1.5 rounded-full bg-muted animate-pulseDot"></span>{{ t('delegates.checking') }}</Pill>
              <span class="text-xs text-muted ms-auto whitespace-nowrap">
                <template v-if="delegates.get(f.id)!.blocks.last">{{ t('delegates.lastBlock') }}: <RouterLink :to="`/block/${delegates.get(f.id)!.blocks.last!.height}`" class="link mono">#{{ formatNumber(delegates.get(f.id)!.blocks.last!.height) }}</RouterLink> · <TimeAgo :unix="delegates.get(f.id)!.blocks.last!.timestamp.unix" /></template>
              </span>
            </template>
            <Pill v-else-if="!loading" tone="warn">{{ t('delegate.notFound') }}</Pill>
            <button class="p-1 rounded-lg text-muted hover:text-bad transition-colors" :title="t('fav.remove')" @click="fav.remove('delegate', f.id)" data-testid="fav-remove"><X class="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
      <div v-if="fav.wallets.length" data-testid="fav-wallets">
        <div class="px-5 pt-4 pb-2 eyebrow flex items-center gap-2"><WalletIcon class="h-3.5 w-3.5" />{{ t('fav.wallets') }} <span class="mono text-muted">{{ fav.wallets.length }}</span></div>
        <div class="divide-y hair">
          <div v-for="f in fav.wallets" :key="f.id" class="px-5 py-3 flex flex-wrap items-center gap-3 row-hover" data-testid="fav-wallet-row">
            <div class="min-w-[200px]">
              <div v-if="labelOf(f, wallets.get(f.id) ?? null)" class="font-display font-semibold text-sm">{{ labelOf(f, wallets.get(f.id) ?? null) }}</div>
              <HashLink :value="f.id" :to="`/wallet/${f.id}`" :head="10" :tail="6" />
            </div>
            <template v-if="wallets.get(f.id)">
              <Pill v-if="qsOf(wallets.get(f.id)!) === 'active'" tone="ok"><ShieldCheck class="h-3 w-3" />{{ t('wallet.qsActive') }}</Pill>
              <Pill v-else-if="qsOf(wallets.get(f.id)!) === 'committed'" tone="quantum"><Atom class="h-3 w-3" />{{ t('wallet.qsCommitted') }}</Pill>
              <Pill v-if="wallets.get(f.id)!.isDelegate" tone="brand">{{ t('wallet.delegate') }}</Pill>
              <span class="ms-auto font-display font-semibold tabular-nums" data-testid="fav-wallet-balance"><Amount :value="wallets.get(f.id)!.balance" :max-frac="2" /></span>
              <span class="text-xs text-muted mono whitespace-nowrap">{{ t('common.nonce') }} {{ wallets.get(f.id)!.nonce }}</span>
            </template>
            <div v-else-if="loading" class="skeleton h-4 w-32 ms-auto"></div>
            <Pill v-else tone="warn" class="ms-auto">{{ t('wallet.notFound') }}</Pill>
            <button class="p-1 rounded-lg text-muted hover:text-bad transition-colors" :title="t('fav.remove')" @click="fav.remove('wallet', f.id)" data-testid="fav-remove"><X class="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
      <div class="px-5 py-3 text-[11px] text-muted border-t hair">{{ t('fav.localHint') }}</div>
    </template>
  </div>
</template>
