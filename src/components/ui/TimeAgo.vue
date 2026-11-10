<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { timeAgo, formatDate } from '@/utils/format'
import { useUiStore } from '@/stores/ui'

const props = defineProps<{ unix: number | undefined; exact?: boolean }>()
const ui = useUiStore()
const tick = ref(0)
let t: number | undefined
onMounted(() => { t = window.setInterval(() => tick.value++, 10_000) })
onUnmounted(() => t && clearInterval(t))
const rel = computed(() => { void tick.value; void ui.locale; return timeAgo(props.unix) })
</script>

<template>
  <time class="whitespace-nowrap" :title="formatDate(unix)" data-testid="time-ago">{{ exact ? formatDate(unix) : rel }}</time>
</template>
