<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
const props = defineProps<{ value: string }>()
const done = ref(false)
const copy = async () => {
  try { await navigator.clipboard.writeText(props.value) } catch { /* ignore */ }
  done.value = true
  setTimeout(() => (done.value = false), 1200)
}
</script>

<template>
  <button class="inline-flex p-1 rounded-md text-muted hover:text-cyan hover:bg-cyan/10 transition-colors" @click.stop.prevent="copy" :title="$t('common.copy')" data-testid="copy-btn">
    <Check v-if="done" class="h-3.5 w-3.5 text-ok" />
    <Copy v-else class="h-3.5 w-3.5" />
  </button>
</template>
