<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search, ClipboardPaste, X, Clock, ScanLine } from 'lucide-vue-next'
import QrScanner from './QrScanner.vue'

const props = withDefaults(defineProps<{ expanded?: boolean; autofocus?: boolean }>(), { expanded: false, autofocus: false })
const emit = defineEmits<{ (e: 'done'): void }>()
const router = useRouter()
const q = ref('')
const input = ref<HTMLInputElement | null>(null)
const RECENT_KEY = 'sth.recent-search'
const recent = ref<string[]>(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'))
const remember = (v: string) => {
  recent.value = [v, ...recent.value.filter((x) => x !== v)].slice(0, 6)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
}
const go = (v: string) => {
  const t = v.trim()
  if (!t) return
  remember(t)
  router.push({ name: 'search', query: { q: t } })
  q.value = ''
  emit('done')
}
const submit = () => go(q.value)
const canPaste = typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'
const paste = async () => { try { const v = await navigator.clipboard.readText(); if (v.trim()) go(v) } catch { input.value?.focus() } }
const canScan = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
const scanning = ref(false)
const onScan = (v: string) => { scanning.value = false; go(v) }
const clearRecent = () => { recent.value = []; localStorage.removeItem(RECENT_KEY) }
onMounted(() => { if (props.autofocus) nextTick(() => input.value?.focus()) })
</script>

<template>
  <div>
    <form class="relative group" @submit.prevent="submit" data-testid="omnisearch-form">
      <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted group-focus-within:text-cyan transition-colors" />
      <input
        ref="input"
        v-model="q"
        type="search"
        enterkeyhint="search"
        class="input ps-10 rounded-full mono text-[13px] [&::-webkit-search-cancel-button]:hidden"
        :class="[expanded ? 'pe-24 h-11 text-sm' : 'pe-20', expanded && !q ? 'pe-44' : '']"
        :placeholder="$t('search.placeholder')"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        data-testid="omnisearch-input"
      />
      <div class="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button v-if="expanded && canScan && !q" type="button" class="btn-ghost !py-1.5 !px-2.5 !rounded-full text-xs" :title="$t('scan.title')" @click="scanning = true" data-testid="omnisearch-scan"><ScanLine class="h-3.5 w-3.5" /></button>
        <button v-if="expanded && canPaste && !q" type="button" class="btn-ghost !py-1.5 !px-2.5 !rounded-full text-xs" @click="paste" data-testid="omnisearch-paste"><ClipboardPaste class="h-3.5 w-3.5" /></button>
        <button v-if="q" type="button" class="p-1.5 rounded-full text-muted hover:text-fg" @click="q = ''; input?.focus()" data-testid="omnisearch-clear"><X class="h-3.5 w-3.5" /></button>
        <button type="submit" class="btn-primary !py-1.5 !px-3 !rounded-full text-xs" data-testid="omnisearch-submit">{{ $t('search.go') }}</button>
      </div>
    </form>
    <QrScanner v-if="scanning" @result="onScan" @close="scanning = false" />
    <div v-if="expanded" class="mt-3 space-y-3" data-testid="omnisearch-hints">
      <div v-if="recent.length" class="flex flex-wrap items-center gap-1.5">
        <span class="eyebrow text-[10px] inline-flex items-center gap-1 me-1"><Clock class="h-3 w-3" />{{ $t('search.recent') }}</span>
        <button v-for="r in recent" :key="r" type="button" class="mono text-[11px] rounded-full border hair px-2.5 py-1 text-fg/90 hover:border-cyan/40 hover:text-cyan transition-colors max-w-[60vw] truncate" @click="go(r)" data-testid="omnisearch-recent">{{ r }}</button>
        <button type="button" class="text-[11px] text-muted hover:text-bad ms-1" @click="clearRecent" data-testid="omnisearch-recent-clear">{{ $t('search.clearRecent') }}</button>
      </div>
      <p class="text-[11px] text-muted leading-relaxed">{{ $t('search.hint') }}</p>
    </div>
  </div>
</template>
