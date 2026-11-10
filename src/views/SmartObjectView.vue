<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Store, UserRound, Box, Tag, ExternalLink, Coins } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useQuery } from '@/composables/useQuery'
import { ApiError } from '@/api/client'
import PageHeader from '@/components/ui/PageHeader.vue'
import ShareButton from '@/components/ui/ShareButton.vue'
import Panel from '@/components/ui/Panel.vue'
import DetailRow from '@/components/ui/DetailRow.vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import Pill from '@/components/ui/Pill.vue'
import ShipLink from '@/components/ui/ShipLink.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import SobjTimeline from '@/components/sobj/SobjTimeline.vue'
import { sobjTypeKey, sobjTone, isUrlPointer, pointerHref } from '@/utils/sobj'
import { formatNumber, fromUnits } from '@/utils/format'

const props = defineProps<{ id: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const { data: so, loading, error, reload } = useQuery(() => net.api.sobj.get(props.id), [() => props.id])
const notFound = computed(() => error.value instanceof ApiError && error.value.isNotFound)
const key = computed(() => (so.value ? sobjTypeKey(so.value.type) : 'app'))
const icon = computed(() => (key.value === 'delegate' ? UserRound : key.value === 'ticker' ? Store : Box))
const token = useQuery(async () => (so.value?.type === 5 ? net.api.tokens.get(so.value.id).catch(() => ({ data: null })) : { data: null }), [() => so.value?.id])
const pointer = computed(() => so.value?.data?.ntfryData ?? null)
</script>

<template>
  <div data-testid="sobj-page">
    <PageHeader :title="so?.data?.name ?? 'SmartObject'">
      <template #subtitle><span class="mono">{{ so?.id ?? id }}</span> · <ShipLink :n="13" />/<ShipLink :n="16" /></template>
      <template v-if="so">
        <Pill :tone="sobjTone(so.type)">{{ t(`sobj.types.${key}`) }} · {{ so.type }}/{{ so.subType }}</Pill>
        <Pill v-if="so.forSale" tone="brand" glow><Tag class="h-3 w-3" />{{ t('sobj.forSale') }}</Pill>
        <Pill v-if="so.isResigned" tone="neutral">{{ t('common.resigned') }}</Pill>
        <ShareButton :title="so.data.name" :subtitle="so.id" kind="SmartObject" :facts="[{ label: t('common.type'), value: `${t(`sobj.types.${key}`)} ${so.type}/${so.subType}` }, { label: t('common.owner'), value: so.address }, { label: t('common.price'), value: so.forSale && so.price ? `${fromUnits(so.price, 8, 2)} ${net.current.symbol}` : t('sobj.notForSale') }]" />
      </template>
    </PageHeader>

    <Panel v-if="loading" pad><div class="space-y-3 py-2"><div v-for="i in 6" :key="i" class="skeleton h-5" :style="{ width: 35 + i * 9 + '%' }"></div></div></Panel>
    <Panel v-else-if="error || !so"><StatePanel :error="notFound ? new Error(t('sobj.notFound')) : error" @retry="reload" /></Panel>

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <Panel class="xl:col-span-2" :title="t('common.details')">
        <div class="mx-5 mb-4 card !rounded-xl p-4 flex items-center gap-4" data-testid="sobj-hero">
          <TokenLogo v-if="key === 'ticker'" :token-key="so.id" :symbol="so.data.name" :size="56" />
          <div v-else class="h-14 w-14 rounded-full border hair bg-line/5 flex items-center justify-center shrink-0"><component :is="icon" class="h-6 w-6" :class="key === 'delegate' ? 'text-cyan' : 'text-quantum'" /></div>
          <div class="min-w-0 flex-1">
            <div class="font-display text-2xl font-semibold truncate" data-testid="sobj-name">{{ so.data.name }}</div>
            <div class="text-xs text-muted mt-0.5">{{ t(`sobj.typeDesc.${key}`) }}</div>
          </div>
          <div v-if="so.forSale && so.price" class="text-end shrink-0">
            <div class="eyebrow text-[10px] text-brand">{{ t('common.price') }}</div>
            <div class="font-display text-2xl font-semibold text-brand" data-testid="sobj-price"><Amount :value="so.price" /></div>
          </div>
        </div>
        <dl class="border-t hair">
          <DetailRow :label="t('common.id')" mono><HashLink :value="so.id" full /></DetailRow>
          <DetailRow :label="t('common.owner')" mono><HashLink :value="so.address" :to="`/wallet/${so.address}`" full /></DetailRow>
          <DetailRow :label="t('common.publicKey')" mono><HashLink :value="so.publicKey" full /></DetailRow>
          <DetailRow :label="t('sobj.registration')" mono><HashLink :value="so.id" :to="`/tx/${so.id}`" :head="16" :tail="12" /></DetailRow>
          <DetailRow :label="t('common.type')"><Pill :tone="sobjTone(so.type)">{{ t(`sobj.types.${key}`) }}</Pill><span class="mono text-xs text-muted ms-2">type {{ so.type }} · subType {{ so.subType }}</span></DetailRow>
          <DetailRow :label="t('sobj.pointer')" mono>
            <a v-if="pointer && isUrlPointer(pointer)" :href="pointerHref(pointer)" target="_blank" rel="noopener" class="link inline-flex items-center gap-1 break-all">{{ pointer }}<ExternalLink class="h-3 w-3" /></a>
            <span v-else-if="pointer" class="break-all">{{ pointer }}</span>
            <span v-else class="text-muted">—</span>
          </DetailRow>
          <DetailRow :label="t('common.status')">
            <span class="inline-flex flex-wrap gap-1">
              <Pill v-if="so.isResigned" tone="neutral">{{ t('common.resigned') }}</Pill>
              <Pill v-else tone="ok">{{ t('common.active') }}</Pill>
              <Pill v-if="so.forSale" tone="brand"><Tag class="h-3 w-3" />{{ t('sobj.forSale') }}</Pill>
            </span>
          </DetailRow>
        </dl>
      </Panel>

      <SobjTimeline class="xl:col-span-2" :id="so.id" />

      <div class="space-y-6 xl:col-start-3 xl:row-start-1 xl:row-span-2">
        <div v-if="key === 'ticker'" class="card p-5 animate-rise" data-testid="sobj-token-card">
          <div class="flex items-start justify-between"><div class="eyebrow">{{ t('sobj.tokenRegistry') }}</div><Coins class="h-4 w-4 text-brand/70" /></div>
          <div v-if="token.loading.value" class="skeleton h-8 mt-3"></div>
          <template v-else-if="token.data.value">
            <RouterLink :to="`/token/${token.data.value.id}`" class="mt-3 flex items-center gap-3 group" data-testid="sobj-token-link">
              <TokenLogo :token-key="token.data.value.id" :symbol="token.data.value.symbol" :size="36" />
              <div class="min-w-0"><div class="font-display text-lg font-semibold group-hover:text-cyan transition-colors">{{ token.data.value.symbol }}</div><div class="text-xs text-muted truncate">{{ token.data.value.meta?.name ?? '' }}</div></div>
            </RouterLink>
            <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt class="eyebrow text-[10px]">{{ t('common.supply') }}</dt><dd class="mono mt-0.5">{{ fromUnits(token.data.value.supply, token.data.value.decimals, 0) }}</dd></div>
              <div><dt class="eyebrow text-[10px]">{{ t('common.supplyCap') }}</dt><dd class="mono mt-0.5">{{ token.data.value.supplyCap ? fromUnits(token.data.value.supplyCap, token.data.value.decimals, 0) : '∞' }}</dd></div>
              <div><dt class="eyebrow text-[10px]">{{ t('tokens.decimals') }}</dt><dd class="mono mt-0.5">{{ token.data.value.decimals }}</dd></div>
              <div><dt class="eyebrow text-[10px]">{{ t('tokens.initHeight') }}</dt><dd class="mono mt-0.5">{{ formatNumber(token.data.value.initHeight) }}</dd></div>
            </dl>
            <RouterLink :to="`/token/${token.data.value.id}`" class="link text-xs mt-4 inline-block">{{ t('sobj.openToken') }} →</RouterLink>
          </template>
          <p v-else class="text-xs text-muted mt-3">{{ t('sobj.noTokenYet') }}</p>
        </div>
        <div class="card p-5 animate-rise" data-testid="sobj-about">
          <div class="eyebrow">{{ t('sobj.about') }}</div>
          <p class="text-xs text-muted mt-2 leading-relaxed">{{ t('sobj.aboutDesc') }}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs"><ShipLink :n="13" icon data-testid="ship-link-13-about" /><ShipLink :n="16" icon data-testid="ship-link-16-about" /><ShipLink v-if="key === 'ticker'" :n="14" icon data-testid="ship-link-14-about" /></div>
        </div>
      </div>
    </div>
  </div>
</template>
