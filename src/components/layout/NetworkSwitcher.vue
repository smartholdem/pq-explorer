<script setup lang="ts">
import { ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown, Radio } from 'lucide-vue-next'
import { useNetworkStore } from '@/stores/network'
import { useChainStore } from '@/stores/chain'

const net = useNetworkStore()
const chain = useChainStore()
const open = ref(false)
const root = ref<HTMLElement | null>(null)
onClickOutside(root, () => (open.value = false))
const pick = (id: string) => { net.switchTo(id); open.value = false }
</script>

<template>
  <div ref="root" class="relative">
    <button class="btn-ghost !py-1.5 !px-3 text-xs" @click="open = !open" data-testid="network-switcher-btn" :title="$t('network.switch')">
      <span class="h-2 w-2 rounded-full" :class="chain.error ? 'bg-bad' : net.isTestnet ? 'bg-warn' : 'bg-ok'"></span>
      <span class="font-semibold">{{ net.current.title }}</span>
      <ChevronDown class="h-3.5 w-3.5 text-muted transition-transform" :class="open && 'rotate-180'" />
    </button>
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <div v-if="open" class="absolute end-0 mt-2 w-72 card p-1.5 z-50" data-testid="network-switcher-menu">
        <button
          v-for="n in net.networks" :key="n.id"
          class="w-full text-start rounded-xl px-3 py-2.5 row-hover flex items-start gap-3"
          :class="n.id === net.currentId && 'bg-cyan/10'"
          @click="pick(n.id)" :data-testid="`network-option-${n.id}`"
        >
          <Radio class="h-4 w-4 mt-0.5" :class="n.id === 'mainnet' ? 'text-ok' : 'text-warn'" />
          <div class="min-w-0">
            <div class="text-sm font-semibold">{{ n.title }}</div>
            <div class="mono text-[11px] text-muted truncate">{{ n.server }}</div>
          </div>
        </button>
        <div class="px-3 pt-2 pb-1 text-[10px] text-muted eyebrow">{{ net.usingProxy ? $t('network.proxied') : $t('network.direct') }}</div>
      </div>
    </Transition>
  </div>
</template>
