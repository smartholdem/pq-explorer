<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { X, SwitchCamera } from 'lucide-vue-next'
import jsQR from 'jsqr'

const emit = defineEmits<{ (e: 'result', value: string): void; (e: 'close'): void }>()
const { t } = useI18n()
const video = ref<HTMLVideoElement | null>(null)
const error = ref<string | null>(null)
let stream: MediaStream | null = null
let raf = 0
let facing: 'environment' | 'user' = 'environment'
const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d', { willReadFrequently: true })!
// native detector on Chrome/Android, jsQR everywhere else
const Detector = (window as any).BarcodeDetector as (new (o: { formats: string[] }) => { detect(src: CanvasImageSource): Promise<{ rawValue: string }[]> }) | undefined
const detector = Detector ? new Detector({ formats: ['qr_code'] }) : null

// accept "sth:ADDR", "ADDR?amount=…", explorer URLs and plain values
const extract = (raw: string) => {
  const v = raw.trim()
  const m = v.match(/(?:^|[/:=])([A-Za-z0-9]{34})(?![A-Za-z0-9])/)
  if (m) return m[1]
  try { const u = new URL(v); return u.pathname.split('/').filter(Boolean).pop() ?? v } catch { return v.replace(/^[a-z]+:/i, '').split('?')[0] }
}

const stop = () => { cancelAnimationFrame(raf); stream?.getTracks().forEach((tr) => tr.stop()); stream = null }
const tick = async () => {
  const v = video.value
  if (!v || v.readyState < 2) { raf = requestAnimationFrame(tick); return }
  let value: string | null = null
  if (detector) {
    const codes = await detector.detect(v).catch(() => [])
    value = codes[0]?.rawValue ?? null
  } else {
    canvas.width = v.videoWidth; canvas.height = v.videoHeight
    ctx.drawImage(v, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    value = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
  }
  if (value) { stop(); emit('result', extract(value)); return }
  raf = requestAnimationFrame(tick)
}
const start = async () => {
  stop(); error.value = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false })
    video.value!.srcObject = stream
    await video.value!.play()
    raf = requestAnimationFrame(tick)
  } catch (e: any) { error.value = e?.name === 'NotAllowedError' ? t('scan.denied') : t('scan.unavailable') }
}
const flip = () => { facing = facing === 'environment' ? 'user' : 'environment'; void start() }
onMounted(start)
onBeforeUnmount(stop)
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[100] bg-black/90 flex flex-col" data-testid="qr-scanner">
      <div class="flex items-center justify-between p-4 text-white">
        <div class="font-display font-semibold">{{ t('scan.title') }}</div>
        <div class="flex gap-2">
          <button class="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center" @click="flip" :title="t('scan.flip')" data-testid="qr-scanner-flip"><SwitchCamera class="h-4 w-4" /></button>
          <button class="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center" @click="emit('close')" data-testid="qr-scanner-close"><X class="h-4 w-4" /></button>
        </div>
      </div>
      <div class="relative flex-1 overflow-hidden">
        <video ref="video" class="absolute inset-0 h-full w-full object-cover" playsinline muted></video>
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="h-64 w-64 rounded-3xl border-2 border-cyan/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"></div>
        </div>
        <div v-if="error" class="absolute inset-x-4 bottom-6 rounded-xl bg-bad/20 border border-bad/40 text-bad text-sm p-3 text-center" data-testid="qr-scanner-error">{{ error }}</div>
        <div v-else class="absolute inset-x-4 bottom-6 text-center text-xs text-white/80">{{ t('scan.hint') }}</div>
      </div>
    </div>
  </Teleport>
</template>
