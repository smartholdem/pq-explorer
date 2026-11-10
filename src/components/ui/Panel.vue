<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
defineProps<{ title?: string; subtitle?: string; to?: string; pad?: boolean }>()
</script>

<template>
  <section class="card overflow-hidden animate-rise" data-testid="panel">
    <header v-if="title || $slots.actions" class="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
      <div>
        <h2 class="font-display font-semibold text-base md:text-lg tracking-tight">{{ title }}</h2>
        <p v-if="subtitle" class="text-xs text-muted mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <RouterLink v-if="to" :to="to" class="link text-xs font-medium whitespace-nowrap" data-testid="panel-view-all">{{ $t('common.viewAll') }} →</RouterLink>
      </div>
    </header>
    <div :class="pad && 'px-5 pb-5'"><slot /></div>
  </section>
</template>
