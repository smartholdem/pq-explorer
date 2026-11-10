<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
withDefaults(defineProps<{ tone?: 'neutral' | 'cyan' | 'brand' | 'ok' | 'warn' | 'bad' | 'quantum'; glow?: boolean }>(), { tone: 'neutral', glow: false })
const tones: Record<string, string> = {
  neutral: 'bg-line/10 text-muted',
  cyan: 'bg-cyan/12 text-cyan border border-cyan/25',
  brand: 'bg-brand/12 text-brand border border-brand/25',
  ok: 'bg-ok/12 text-ok border border-ok/25',
  warn: 'bg-warn/12 text-warn border border-warn/25',
  bad: 'bg-bad/12 text-bad border border-bad/25',
  quantum: 'bg-quantum/12 text-quantum border border-quantum/30',
}
</script>

<template>
  <span class="pill" :class="[tones[tone], glow && tone === 'ok' && 'shadow-[0_0_14px_rgba(34,230,120,0.35)]', glow && tone === 'quantum' && 'shadow-[0_0_14px_rgba(167,139,250,0.35)]']">
    <slot />
  </span>
</template>
