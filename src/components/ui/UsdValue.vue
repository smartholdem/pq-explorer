<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import { formatUsd, usdOf, usePrice } from '@/composables/usePrice'
import { useNetworkStore } from '@/stores/network'

// "≈ 12.34 USD" for an STH amount in base units (8 decimals); mainnet only, hidden until a price is known. `precise` → up to 8 decimals (fees)
const props = withDefaults(defineProps<{ value: string | number | bigint | null | undefined; decimals?: number; precise?: boolean }>(), { decimals: 8, precise: false })
const net = useNetworkStore()
const { ticker } = usePrice()
const usd = computed(() => (ticker.value, usdOf(props.value, props.decimals, net.isTestnet)))
</script>

<template>
  <span v-if="usd !== null" class="mono tabular-nums whitespace-nowrap text-muted" data-testid="usd-value">≈ {{ formatUsd(usd, precise) }} <span class="text-[0.85em]">USD</span></span>
</template>
