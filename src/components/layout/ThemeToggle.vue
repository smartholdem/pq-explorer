<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
const ui = useUiStore()
</script>

<template>
  <button class="btn-ghost !p-2" @click="ui.toggleTheme()" :title="$t('theme.toggle')" data-testid="theme-toggle-btn">
    <Sun v-if="ui.theme === 'dark'" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </button>
</template>
