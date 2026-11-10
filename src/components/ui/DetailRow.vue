<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
defineProps<{ label: string; mono?: boolean }>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 px-5 py-3.5 border-b hair last:border-0 row-hover" data-testid="detail-row">
    <dt class="eyebrow pt-0.5">{{ label }}</dt>
    <dd class="text-sm min-w-0 break-all" :class="mono && 'mono'"><slot /></dd>
  </div>
</template>
