<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { SearchX } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { guessSearch } from '@/utils/search'
import Panel from '@/components/ui/Panel.vue'

const route = useRoute()
const router = useRouter()
const net = useNetworkStore()
const { t } = useI18n()
const searching = ref(true)
const q = ref('')

const tryGet = async (fn: () => Promise<any>) => { try { const r = await fn(); return r?.data ?? null } catch { return null } }

const resolve = async (raw: string) => {
  const api = net.api
  const v = raw.trim()
  const kind = guessSearch(v)
  const attempts: (() => Promise<string | null>)[] = []
  const block = () => tryGet(() => api.blocks.get(v)).then((b) => (b ? `/block/${b.id}` : null))
  const tx = () => tryGet(() => api.transactions.get(v)).then((x) => (x ? `/tx/${x.id}` : null))
  const wallet = () => tryGet(() => api.wallets.get(v)).then((w) => (w ? `/wallet/${w.address}` : null))
  const token = () => tryGet(() => api.tokens.get(v)).then((x) => (x ? `/token/${x.id}` : null))
  const delegate = () => tryGet(() => api.delegates.get(v)).then((d) => (d ? `/wallet/${d.address}` : null))
  const sobj = () => tryGet(() => api.sobj.get(v)).then((s) => (s ? `/sobj/${s.id}` : null))
  // SmartObject names are unique per type; prefer an exact (case-insensitive) match, else the first hit
  const sobjByName = () => api.sobj.byName(v).then((r) => {
    const list = r.data ?? []
    const hit = list.find((s) => s.data?.name?.toLowerCase() === v.toLowerCase()) ?? list[0]
    return hit ? `/sobj/${hit.id}` : null
  }).catch(() => null)
  switch (kind) {
    case 'height': attempts.push(block); break
    case 'hash': attempts.push(tx, block, token, sobj); break
    case 'address': case 'publicKey': attempts.push(wallet); break
    case 'ticker': attempts.push(token, delegate, wallet, sobjByName); break
    case 'username': attempts.push(delegate, wallet, token, sobjByName); break
    default: attempts.push(wallet, delegate, token, sobjByName)
  }
  for (const a of attempts) { const r = await a(); if (r) return r }
  return null
}

watch(() => route.query.q, async (val) => {
  q.value = String(val ?? '')
  if (!q.value) { searching.value = false; return }
  searching.value = true
  const target = await resolve(q.value)
  if (target) router.replace(target)
  else searching.value = false
}, { immediate: true })
</script>

<template>
  <div class="max-w-2xl mx-auto pt-10" data-testid="search-page">
    <Panel pad>
      <div v-if="searching" class="py-10 text-center" data-testid="search-loading">
        <div class="mx-auto h-10 w-10 rounded-full border-2 border-cyan/30 border-t-cyan animate-spin"></div>
        <div class="mt-4 text-sm text-muted">{{ t('search.searching') }}</div>
        <div class="mono text-xs text-muted/70 mt-1 break-all">{{ q }}</div>
      </div>
      <div v-else class="py-10 text-center" data-testid="search-not-found">
        <SearchX class="mx-auto h-10 w-10 text-muted/60" />
        <div class="mt-4 text-sm">{{ t('search.notFound') }}</div>
        <div class="mono text-sm text-brand mt-1 break-all">{{ q }}</div>
        <p class="mt-4 text-xs text-muted">{{ t('search.hint') }}</p>
      </div>
    </Panel>
  </div>
</template>
