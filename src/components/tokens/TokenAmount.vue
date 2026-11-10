<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'
import { computed } from 'vue'
import Amount from '@/components/ui/Amount.vue'
import { useTokensStore } from '@/stores/tokens'

// token amount in smallest units → "123.45 COFFEE" using the token's own decimals (0…N)
const props = withDefaults(defineProps<{ tokenId: string | null | undefined; value: string | bigint | null | undefined; tone?: 'in' | 'out' | 'neutral'; showSymbol?: boolean; maxFrac?: number }>(), { tone: 'neutral', showSymbol: true })
const tokens = useTokensStore()
const tk = computed(() => tokens.get(props.tokenId))
</script>

<template>
  <Amount v-if="tk" :value="value === null || value === undefined ? '0' : String(value)" :decimals="tk.decimals" :max-frac="maxFrac ?? tk.decimals" :symbol="showSymbol ? tk.symbol : null" :tone="tone" data-testid="token-amount" />
  <span v-else class="skeleton inline-block h-4 w-16 rounded align-middle" data-testid="token-amount-loading"></span>
</template>
