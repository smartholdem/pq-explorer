<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { QrCode, Copy, Check, Download } from 'lucide-vue-next'
import QR from 'qrcode'

const props = defineProps<{ address: string; label?: string }>()
const { t } = useI18n()
const open = ref(false)
const src = ref('')
const copied = ref(false)
watch([() => props.address, open], async () => {
  if (!open.value) return
  src.value = await QR.toDataURL(props.address, { width: 480, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0b1a3a', light: '#ffffff' } })
})
const copy = async () => { try { await navigator.clipboard.writeText(props.address); copied.value = true; setTimeout(() => (copied.value = false), 1500) } catch { /* blocked */ } }
</script>

<template>
  <div class="relative">
    <button class="btn-ghost !py-1 text-xs" @click="open = !open" data-testid="qr-btn" :aria-expanded="open"><QrCode class="h-3.5 w-3.5" />QR</button>
    <Teleport to="body">
      <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" leave-active-class="transition duration-100" leave-to-class="opacity-0">
        <div v-if="open" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="open = false" data-testid="qr-modal">
          <div class="card w-full max-w-sm p-5 animate-rise">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0"><div class="eyebrow text-[10px]">{{ t('wallet.qrTitle') }}</div><div v-if="label" class="font-display font-semibold truncate">{{ label }}</div></div>
              <button class="text-muted hover:text-fg text-xs" @click="open = false" data-testid="qr-close">✕</button>
            </div>
            <div class="mt-4 rounded-2xl bg-white p-3 mx-auto w-fit shadow-card"><img v-if="src" :src="src" alt="QR" class="h-56 w-56 sm:h-64 sm:w-64 block" data-testid="qr-image" /><div v-else class="h-56 w-56 skeleton"></div></div>
            <div class="mt-4 mono text-[11px] break-all text-center text-fg/90" data-testid="qr-address">{{ address }}</div>
            <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
              <button class="btn-ghost justify-center" @click="copy" data-testid="qr-copy"><component :is="copied ? Check : Copy" class="h-3.5 w-3.5" :class="copied && 'text-ok'" />{{ copied ? t('common.copied') : t('common.copy') }}</button>
              <a :href="src" :download="`${address}.png`" class="btn-ghost justify-center" data-testid="qr-download"><Download class="h-3.5 w-3.5" />PNG</a>
            </div>
            <p class="mt-3 text-[11px] text-muted text-center">{{ t('wallet.qrHint') }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
