<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { AlertTriangle, Inbox } from 'lucide-vue-next'
defineProps<{ error?: Error | null; empty?: boolean; message?: string }>()
const emit = defineEmits<{ (e: 'retry'): void }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted" data-testid="state-panel">
    <template v-if="error">
      <AlertTriangle class="h-8 w-8 text-bad/80" />
      <div class="text-sm">{{ $t('common.error') }}</div>
      <div class="mono text-xs text-bad/80 max-w-md break-all">{{ error.message }}</div>
      <button class="btn-ghost text-xs" @click="emit('retry')" data-testid="retry-btn">{{ $t('common.retry') }}</button>
    </template>
    <template v-else>
      <Inbox class="h-8 w-8 opacity-60" />
      <div class="text-sm">{{ message ?? $t('common.empty') }}</div>
    </template>
  </div>
</template>
