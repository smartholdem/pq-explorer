<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import Pill from '@/components/ui/Pill.vue'
import type { TokenOrder } from '@/api/types'
import { orderStatus, ORDER_TONE } from '@/utils/token'

const props = defineProps<{ order: Pick<TokenOrder, 'open' | 'filled' | 'amount'> }>()
const status = computed(() => orderStatus(props.order))
</script>

<template>
  <Pill :tone="ORDER_TONE[status]" :data-state="status" data-testid="order-status">{{ $t(`tmarket.status.${status}`) }}</Pill>
</template>
