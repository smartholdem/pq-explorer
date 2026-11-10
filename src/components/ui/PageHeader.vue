<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
defineProps<{ title: string; subtitle?: string }>()
</script>

<template>
  <div class="relative z-20 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 animate-rise" data-testid="page-header">
    <div>
      <h1 class="font-display text-2xl md:text-3xl font-semibold tracking-tight">{{ title }}</h1>
      <p v-if="subtitle || $slots.subtitle" class="text-sm text-muted mt-1 max-w-2xl"><slot name="subtitle">{{ subtitle }}</slot></p>
    </div>
    <div v-if="$slots.default" class="flex items-center gap-2 flex-wrap"><slot /></div>
  </div>
</template>
