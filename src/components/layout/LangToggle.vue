<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside, useMediaQuery } from '@vueuse/core'
import { Check, ChevronDown, Languages, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { LOCALES, type Locale } from '@/i18n'

const ui = useUiStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
// phones get a bottom sheet (teleported: the blurred header is a containing block for fixed children); desktop a 2-column dropdown
const mobile = useMediaQuery('(max-width: 639px)')
onClickOutside(root, () => { if (!mobile.value) open.value = false })
const pick = (l: Locale) => { ui.setLocale(l); open.value = false }
</script>

<template>
  <div ref="root" class="relative">
    <button class="btn-ghost !py-1.5 !px-2.5 text-xs font-semibold" :class="open && 'text-cyan border-cyan/40'" @click="open = !open" :aria-expanded="open" data-testid="lang-toggle" :title="$t('lang.title')">
      <Languages class="h-3.5 w-3.5" />
      <span class="uppercase">{{ ui.locale }}</span>
      <ChevronDown class="h-3.5 w-3.5 text-muted transition-transform" :class="open && 'rotate-180'" />
    </button>

    <Teleport to="body" :disabled="!mobile">
      <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-2 sm:-translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
        <div v-if="open" class="fixed inset-0 z-[70] sm:absolute sm:inset-auto sm:end-0 sm:top-full sm:mt-2 sm:z-50" data-testid="lang-menu">
          <div class="sm:hidden absolute inset-0 bg-black/60 backdrop-blur-sm" @click="open = false"></div>
          <div class="absolute inset-x-3 top-3 max-h-[85vh] overflow-y-auto card p-3 sm:static sm:w-[440px] sm:max-h-none sm:p-2" style="background: rgb(var(--c-card))" data-testid="lang-sheet">
            <div class="flex items-center justify-between px-1 pb-2 sm:hidden">
              <div class="eyebrow inline-flex items-center gap-1.5"><Languages class="h-3.5 w-3.5" />{{ $t('lang.title') }}</div>
              <button class="h-8 w-8 rounded-full border hair flex items-center justify-center text-muted" @click="open = false" data-testid="lang-close"><X class="h-4 w-4" /></button>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:gap-0.5">
              <button
                v-for="l in LOCALES" :key="l.code"
                class="flex items-center justify-between gap-2 text-start rounded-xl px-3 py-2.5 sm:py-2 text-sm transition-colors border sm:border-0 row-hover"
                :class="ui.locale === l.code ? 'bg-cyan/10 text-cyan border-cyan/40 font-semibold' : 'hair text-fg'"
                :lang="l.code" @click="pick(l.code)" :data-testid="`lang-${l.code}`"
              >
                <span class="truncate">{{ l.name }}</span>
                <Check v-if="ui.locale === l.code" class="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
