<script setup lang="ts">
import { computed } from 'vue'
import { Chrome, Download, Github } from 'lucide-vue-next'

const ua = navigator.userAgent
const isAndroid = /android/i.test(ua)
const isMobile = isAndroid || /iphone|ipad|ipod/i.test(ua)
// desktop → Chrome Web Store extension; Android → latest APK release on GitHub; iOS has no build yet
const wallet = computed(() => isAndroid
  ? { href: 'https://github.com/smartholdem/core-wallet/releases/latest', key: 'footer.installWallet', icon: Download, id: 'android' }
  : isMobile ? null
  : { href: 'https://chromewebstore.google.com/detail/smartholdem-wallet-sth/eocmgmhopmnkihfbipjifphjicfginbn', key: 'footer.installExtension', icon: Chrome, id: 'desktop' })
</script>

<template>
  <footer class="border-t hair mt-12" data-testid="app-footer">
    <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-4 md:items-center justify-between text-xs text-muted">
      <div class="flex items-center gap-3">
        <img src="/logo.png" alt="" class="h-6 w-6 rounded-full opacity-80" />
        <span>{{ $t('footer.rights') }} · {{ new Date().getFullYear() }}</span>
      </div>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 mono">
        <a v-if="wallet" class="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 text-brand hover:bg-brand/20 px-3 py-1.5 font-semibold transition-colors" :href="wallet.href" target="_blank" rel="noopener" :data-testid="`footer-wallet-${wallet.id}`">
          <component :is="wallet.icon" class="h-3.5 w-3.5" />{{ $t(wallet.key) }}
        </a>
        <a class="link inline-flex items-center gap-1.5" href="https://github.com/smartholdem/sth-core-pq" target="_blank" rel="noopener" data-testid="footer-source"><Github class="h-3.5 w-3.5" />{{ $t('footer.source') }}</a>
      </div>
    </div>
  </footer>
</template>
