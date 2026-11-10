<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed, ref } from 'vue'
import { formatUsd, usdOf, usePrice } from '@/composables/usePrice'
import { useNetworkStore } from '@/stores/network'

// wraps an amount: hover / tap shows "≈ X USD" bubble (mainnet only, needs a price)
const props = withDefaults(defineProps<{ value: string | number | bigint | null | undefined; decimals?: number }>(), { decimals: 8 })
const net = useNetworkStore()
const { ticker } = usePrice()
const usd = computed(() => (ticker.value, usdOf(props.value, props.decimals, net.isTestnet)))
const pinned = ref(false)
</script>

<template>
  <span v-if="usd === null"><slot /></span>
  <span v-else class="relative inline-block group" :class="pinned && 'is-pinned'" tabindex="0" role="button" :aria-label="`≈ ${formatUsd(usd)} USD`" @click.stop="pinned = !pinned" @blur="pinned = false" @keydown.enter.prevent="pinned = !pinned" data-testid="usd-hint">
    <span class="cursor-help underline decoration-dotted decoration-line/40 underline-offset-4"><slot /></span>
    <span
      class="pointer-events-none absolute end-0 bottom-full mb-1.5 z-30 card !rounded-lg px-2 py-1 text-[11px] mono whitespace-nowrap text-fg opacity-0 translate-y-0.5 transition duration-100 group-hover:opacity-100 group-hover:translate-y-0 group-focus:opacity-100 group-focus:translate-y-0 [.is-pinned>&]:opacity-100 [.is-pinned>&]:translate-y-0"
      data-testid="usd-hint-bubble"
    >≈ {{ formatUsd(usd) }} <span class="text-muted">USD</span></span>
  </span>
</template>
