<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { fromUnits } from '@/utils/format'
import { useNetworkStore } from '@/stores/network'

const props = withDefaults(defineProps<{ value: string | number | bigint | null | undefined; decimals?: number; symbol?: string | null; maxFrac?: number; tone?: 'in' | 'out' | 'neutral' }>(), { decimals: 8, symbol: undefined, maxFrac: 8, tone: 'neutral' })
const net = useNetworkStore()
const text = computed(() => fromUnits(props.value, props.decimals, props.maxFrac))
const sym = computed(() => (props.symbol === null ? '' : props.symbol ?? net.current.symbol))
</script>

<template>
  <span class="mono tabular-nums whitespace-nowrap" :class="{ 'text-ok': tone === 'in', 'text-brand': tone === 'out' }" data-testid="amount">
    <span v-if="tone === 'in'">+</span><span v-else-if="tone === 'out'">−</span>{{ text }}<span v-if="sym" class="text-muted text-[0.85em] ms-1">{{ sym }}</span>
  </span>
</template>
