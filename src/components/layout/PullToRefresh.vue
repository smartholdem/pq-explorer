<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshCw } from 'lucide-vue-next'

// native-feeling pull-to-refresh for touch devices: drag down from the very top, release past the threshold
const props = withDefaults(defineProps<{ threshold?: number; max?: number }>(), { threshold: 72, max: 120 })
const emit = defineEmits<{ (e: 'refresh', done: () => void): void }>()
const { t } = useI18n()
const pull = ref(0)
const refreshing = ref(false)
let startY = 0
let active = false
const armed = computed(() => pull.value >= props.threshold)
const progress = computed(() => Math.min(1, pull.value / props.threshold))

const onStart = (e: TouchEvent) => {
  if (refreshing.value || window.scrollY > 0) return
  startY = e.touches[0].clientY
  active = true
}
const onMove = (e: TouchEvent) => {
  if (!active || refreshing.value) return
  const dy = e.touches[0].clientY - startY
  if (dy <= 0 || window.scrollY > 0) { pull.value = 0; return }
  // rubber-band: resistance grows with distance
  pull.value = Math.min(props.max, dy * 0.55)
  if (pull.value > 8 && e.cancelable) e.preventDefault()
}
const onEnd = () => {
  if (!active) return
  active = false
  if (armed.value && !refreshing.value) {
    refreshing.value = true
    pull.value = props.threshold * 0.8
    let finished = false
    const done = () => { if (finished) return; finished = true; refreshing.value = false; pull.value = 0 }
    emit('refresh', done)
    setTimeout(done, 8000)
  } else pull.value = 0
}
onMounted(() => {
  window.addEventListener('touchstart', onStart, { passive: true })
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
  window.addEventListener('touchcancel', onEnd)
})
onBeforeUnmount(() => {
  window.removeEventListener('touchstart', onStart)
  window.removeEventListener('touchmove', onMove)
  window.removeEventListener('touchend', onEnd)
  window.removeEventListener('touchcancel', onEnd)
})
</script>

<template>
  <div class="md:hidden pointer-events-none fixed inset-x-0 top-[110px] z-40 flex justify-center" :style="{ transform: `translateY(${pull - 48}px)`, opacity: pull > 4 ? 1 : 0, transition: active ? 'none' : 'transform 200ms, opacity 200ms' }" data-testid="pull-indicator" :data-refreshing="refreshing ? 'true' : undefined">
    <div class="h-10 w-10 rounded-full card flex items-center justify-center shadow-glow" :class="armed || refreshing ? 'text-cyan border-cyan/40' : 'text-muted'">
      <RefreshCw class="h-4 w-4" :class="refreshing && 'animate-spin'" :style="refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }" />
    </div>
    <span class="sr-only">{{ refreshing ? t('pwa.refreshing') : armed ? t('pwa.release') : t('pwa.pull') }}</span>
  </div>
</template>
