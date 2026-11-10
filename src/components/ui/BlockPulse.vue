<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { useChainStore } from '@/stores/chain'
// steady dot that emits a single slow ring each time a new block arrives (re-keyed by height)
defineProps<{ error?: boolean }>()
const chain = useChainStore()
</script>

<template>
  <span class="relative inline-flex h-2 w-2" data-testid="block-pulse">
    <span :key="chain.height" class="absolute inline-flex h-full w-full rounded-full animate-blockRing" :class="error ? 'bg-bad' : 'bg-ok'"></span>
    <span class="relative inline-flex h-2 w-2 rounded-full" :class="error ? 'bg-bad' : 'bg-ok'"></span>
  </span>
</template>
