<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
defineProps<{ label: string; value?: string | number | null; sub?: string | null; tone?: 'cyan' | 'brand' | 'ok' | 'quantum' | 'neutral'; loading?: boolean }>()
const accents: Record<string, string> = { cyan: 'from-cyan/60', brand: 'from-brand/60', ok: 'from-ok/60', quantum: 'from-quantum/60', neutral: 'from-line/20' }
</script>

<template>
  <div class="card card-hover relative p-5 overflow-hidden animate-rise" data-testid="stat-card">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r to-transparent" :class="accents[tone ?? 'neutral']"></div>
    <div class="flex items-start justify-between gap-3">
      <div class="eyebrow">{{ label }}</div>
      <slot name="icon" />
    </div>
    <div v-if="loading" class="skeleton h-8 w-2/3 mt-3"></div>
    <div v-else class="mt-2 font-display text-2xl md:text-[28px] font-semibold tracking-tight tabular-nums truncate" data-testid="stat-value"><slot>{{ value ?? '—' }}</slot></div>
    <div v-if="sub || $slots.sub" class="mt-1.5 text-xs text-muted truncate"><slot name="sub">{{ sub }}</slot></div>
  </div>
</template>
