<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
withDefaults(defineProps<{ rows?: number; cols?: number }>(), { rows: 6, cols: 4 })
</script>

<template>
  <div class="divide-y hair" data-testid="skeleton-rows">
    <div v-for="r in rows" :key="r" class="grid gap-4 px-4 py-3.5" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }">
      <div v-for="c in cols" :key="c" class="skeleton h-4" :style="{ width: `${55 + ((r * c * 37) % 40)}%` }"></div>
    </div>
  </div>
</template>
