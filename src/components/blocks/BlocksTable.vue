<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import HashLink from '@/components/ui/HashLink.vue'
import Amount from '@/components/ui/Amount.vue'
import TimeAgo from '@/components/ui/TimeAgo.vue'
import FinalityBadge from '@/components/ui/FinalityBadge.vue'
import SkeletonRows from '@/components/ui/SkeletonRows.vue'
import StatePanel from '@/components/ui/StatePanel.vue'
import type { Block } from '@/api/types'
import { formatNumber } from '@/utils/format'

defineProps<{ blocks: Block[] | null; loading: boolean; error?: Error | null; compact?: boolean }>()
const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="overflow-x-auto">
    <SkeletonRows v-if="loading && !blocks" :rows="10" :cols="6" />
    <StatePanel v-else-if="error" :error="error" @retry="emit('retry')" />
    <StatePanel v-else-if="!blocks?.length" empty />
    <table v-card-table v-else class="w-full" :class="compact ? 'min-w-[520px]' : 'min-w-[760px]'" data-testid="blocks-table">
      <thead>
        <tr>
          <th class="th">{{ $t('common.height') }}</th>
          <th v-if="!compact" class="th">{{ $t('common.id') }}</th>
          <th class="th">{{ $t('common.forgedBy') }}</th>
          <th class="th text-end">{{ $t('blocks.txCount') }}</th>
          <th class="th text-end">{{ $t('common.total') }}</th>
          <th v-if="!compact" class="th text-end">{{ $t('common.fee') }}</th>
          <th class="th">{{ $t('common.age') }}</th>
          <th class="th"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in blocks" :key="b.id" class="row-hover" data-testid="block-row">
          <td class="td card-title whitespace-nowrap"><RouterLink :to="`/block/${b.height}`" class="link mono font-semibold">{{ formatNumber(b.height) }}</RouterLink></td>
          <td v-if="!compact" class="td"><HashLink :value="b.id" :to="`/block/${b.id}`" :head="8" :tail="6" /></td>
          <td class="td">
            <RouterLink :to="`/delegate/${b.generator.username ?? b.generator.address}`" class="link font-medium">{{ b.generator.username ?? b.generator.address }}</RouterLink>
          </td>
          <td class="td text-end mono" :class="b.transactions ? 'text-fg font-semibold' : 'text-muted'">{{ b.transactions }}</td>
          <td class="td text-end"><Amount :value="b.forged.amount" :max-frac="2" /></td>
          <td v-if="!compact" class="td text-end text-muted"><Amount :value="b.forged.fee" :symbol="null" :max-frac="4" /></td>
          <td class="td text-muted whitespace-nowrap"><TimeAgo :unix="b.timestamp.unix" /></td>
          <td class="td text-end"><FinalityBadge :finalized="b.finalized" compact /></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
