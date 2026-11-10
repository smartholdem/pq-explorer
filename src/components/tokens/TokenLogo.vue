<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { ref } from 'vue'
import { useNetworkStore } from '@/stores/network'
const props = withDefaults(defineProps<{ tokenKey: string; symbol?: string; size?: number }>(), { size: 28 })
const net = useNetworkStore()
const failed = ref(false)
</script>

<template>
  <div class="shrink-0 rounded-full overflow-hidden border hair bg-line/5 flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }" data-testid="token-logo">
    <img v-if="!failed" :src="net.api.tokens.logoUrl(tokenKey)" :alt="symbol ?? tokenKey" class="h-full w-full object-cover" loading="lazy" @error="failed = true" />
    <span v-else class="font-display font-bold text-cyan" :style="{ fontSize: `${size * 0.42}px` }">{{ (symbol ?? tokenKey).slice(0, 2).toUpperCase() }}</span>
  </div>
</template>
