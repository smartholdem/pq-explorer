<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const show = ref(false)
const onScroll = () => { show.value = window.scrollY > 480 }
onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
const top = () => window.scrollTo({ top: 0, behavior: 'smooth' })
</script>

<template>
  <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0 scale-75" leave-active-class="transition duration-150" leave-to-class="opacity-0 scale-75">
    <button v-if="show" type="button" class="md:hidden fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-[80] h-11 w-11 rounded-full card !bg-[rgb(var(--c-bg2))] shadow-glow flex items-center justify-center text-cyan border-cyan/30 active:scale-95 transition-transform" aria-label="Scroll to top" @click="top" data-testid="scroll-top">
      <ArrowUp class="h-5 w-5" />
    </button>
  </Transition>
</template>
