<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Store, UserRound, Box, Tag } from 'lucide-vue-next'
import Pill from '@/components/ui/Pill.vue'
import Amount from '@/components/ui/Amount.vue'
import HashLink from '@/components/ui/HashLink.vue'
import TokenLogo from '@/components/tokens/TokenLogo.vue'
import { sobjTypeKey, sobjTone } from '@/utils/sobj'

export interface SobjCardItem { id: string; name: string; type: number; subType: number; owner: string; price?: string | null; forSale?: boolean; resigned?: boolean; token?: { symbol: string; name?: string; supply?: string; decimals?: number } | null }
const props = defineProps<{ item: SobjCardItem }>()
const { t } = useI18n()
const key = computed(() => sobjTypeKey(props.item.type))
const icon = computed(() => (key.value === 'delegate' ? UserRound : key.value === 'ticker' ? Store : Box))
</script>

<template>
  <RouterLink :to="`/sobj/${item.id}`" class="card card-hover p-5 animate-rise flex flex-col gap-4 group relative overflow-hidden" :class="item.forSale && 'border-brand/30'" data-testid="sobj-card">
    <div v-if="item.forSale" class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand/70 to-transparent"></div>
    <div class="flex items-start gap-3">
      <TokenLogo v-if="key === 'ticker'" :token-key="item.id" :symbol="item.name" :size="44" />
      <div v-else class="h-11 w-11 rounded-full border hair bg-line/5 flex items-center justify-center shrink-0"><component :is="icon" class="h-4.5 w-4.5" :class="key === 'delegate' ? 'text-cyan' : 'text-quantum'" /></div>
      <div class="min-w-0 flex-1">
        <div class="font-display text-lg font-semibold truncate group-hover:text-cyan transition-colors" data-testid="sobj-card-name">{{ item.name }}</div>
        <div class="mt-1 flex flex-wrap items-center gap-1.5">
          <Pill :tone="sobjTone(item.type)">{{ t(`sobj.types.${key}`) }}</Pill>
          <span class="mono text-[11px] text-muted">{{ item.type }}/{{ item.subType }}</span>
          <Pill v-if="item.resigned" tone="neutral">{{ t('common.resigned') }}</Pill>
        </div>
        <div v-if="item.token?.name" class="text-xs text-muted mt-1 truncate">{{ item.token.name }}</div>
      </div>
    </div>
    <div class="mt-auto flex items-end justify-between gap-3">
      <div class="min-w-0"><div class="eyebrow text-[10px]">{{ t('common.owner') }}</div><HashLink :value="item.owner" :to="`/wallet/${item.owner}`" :head="8" :tail="6" :copy="false" /></div>
      <div v-if="item.forSale && item.price" class="text-end shrink-0">
        <div class="eyebrow text-[10px] text-brand flex items-center justify-end gap-1"><Tag class="h-3 w-3" />{{ t('sobj.forSale') }}</div>
        <div class="font-display text-lg font-semibold text-brand" data-testid="sobj-card-price"><Amount :value="item.price" /></div>
      </div>
      <span v-else class="text-[11px] text-muted">{{ t('sobj.notForSale') }}</span>
    </div>
  </RouterLink>
</template>
