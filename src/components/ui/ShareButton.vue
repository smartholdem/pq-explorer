<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Share2, Link as LinkIcon, ClipboardCopy, Check, Send } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'

export interface ShareFact { label: string; value: string }
const props = defineProps<{ title: string; subtitle?: string; facts?: ShareFact[]; kind?: string }>()
const { t } = useI18n()
const net = useNetworkStore()
const open = ref(false)
const copied = ref<'link' | 'text' | null>(null)
const url = computed(() => window.location.href)
const summary = computed(() => [
  `${props.kind ? props.kind + ' · ' : ''}${props.title}`,
  props.subtitle ?? '',
  ...(props.facts ?? []).map((f) => `${f.label}: ${f.value}`),
  `${net.current.alias} · SmartHoldem PQ Explorer`,
  url.value,
].filter(Boolean).join('\n'))
const canNative = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

const copy = async (what: 'link' | 'text') => {
  try { await navigator.clipboard.writeText(what === 'link' ? url.value : summary.value); copied.value = what; setTimeout(() => (copied.value = null), 1500) } catch { /* clipboard blocked */ }
}
const native = () => navigator.share({ title: props.title, text: summary.value, url: url.value }).catch(() => undefined)
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') open.value = false }
window.addEventListener('keydown', onKey)
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// nicer link previews / tab titles per entity
const baseTitle = document.title
watch(() => props.title, (v) => { document.title = `${v} · SmartHoldem PQ Explorer` }, { immediate: true })
onBeforeUnmount(() => { document.title = baseTitle })
</script>

<template>
  <div class="relative">
    <button class="btn-ghost !py-1 text-xs" @click="open = !open" data-testid="share-btn" :aria-expanded="open"><Share2 class="h-3.5 w-3.5" />{{ t('share.share') }}</button>
    <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0 translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="open" class="absolute end-0 mt-2 w-80 card p-3 z-50 shadow-glow" data-testid="share-popover">
        <div class="rounded-xl border hair bg-bg2/60 p-3" data-testid="share-preview">
          <div class="flex items-center gap-2 mb-2"><img src="/logo.png" alt="" class="h-5 w-5 rounded-full" /><span class="eyebrow text-[10px]">{{ kind ?? 'SmartHoldem' }} · {{ net.current.alias }}</span></div>
          <div class="font-display font-semibold truncate" data-testid="share-preview-title">{{ title }}</div>
          <div v-if="subtitle" class="mono text-[11px] text-muted truncate">{{ subtitle }}</div>
          <dl v-if="facts?.length" class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <template v-for="f in facts" :key="f.label"><dt class="text-muted truncate">{{ f.label }}</dt><dd class="mono text-end truncate">{{ f.value }}</dd></template>
          </dl>
        </div>
        <div class="mt-3 grid gap-1.5 text-xs">
          <button class="btn-ghost justify-start !py-1.5" @click="copy('link')" data-testid="share-copy-link"><component :is="copied === 'link' ? Check : LinkIcon" class="h-3.5 w-3.5" :class="copied === 'link' && 'text-ok'" />{{ copied === 'link' ? t('common.copied') : t('share.copyLink') }}</button>
          <button class="btn-ghost justify-start !py-1.5" @click="copy('text')" data-testid="share-copy-text"><component :is="copied === 'text' ? Check : ClipboardCopy" class="h-3.5 w-3.5" :class="copied === 'text' && 'text-ok'" />{{ copied === 'text' ? t('common.copied') : t('share.copyCard') }}</button>
          <button v-if="canNative" class="btn-ghost justify-start !py-1.5" @click="native" data-testid="share-native"><Send class="h-3.5 w-3.5" />{{ t('share.native') }}</button>
        </div>
      </div>
    </Transition>
  </div>
</template>
