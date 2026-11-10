<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Tag } from 'lucide-vue-next'
import CopyButton from './CopyButton.vue'
import { truncateMiddle } from '@/utils/format'
import { useNetworkStore } from '@/stores/network'

const props = withDefaults(defineProps<{
  value: string | null | undefined
  to?: string | null
  label?: string | null
  head?: number
  tail?: number
  full?: boolean
  copy?: boolean
  mono?: boolean
}>(), { head: 8, tail: 6, full: false, copy: true, mono: true, to: null, label: null })

const net = useNetworkStore()
const known = computed(() => net.walletLabel(props.value))
const text = computed(() => props.label ?? (props.full ? props.value ?? '—' : truncateMiddle(props.value, props.head, props.tail)))
</script>

<template>
  <span class="inline-flex items-center gap-1 min-w-0 max-w-full" :class="mono && !known && 'mono'">
    <template v-if="known">
      <RouterLink v-if="to && value" :to="to" class="link inline-flex items-center gap-1 font-semibold truncate" :title="value ?? ''" data-testid="known-wallet-link">
        <Tag class="h-3 w-3 text-brand shrink-0" />{{ known }}
      </RouterLink>
      <span v-else class="inline-flex items-center gap-1 font-semibold truncate" :title="value ?? ''" data-testid="known-wallet-label"><Tag class="h-3 w-3 text-brand shrink-0" />{{ known }}</span>
      <span v-if="full" class="mono text-xs text-muted truncate">{{ value }}</span>
    </template>
    <template v-else>
      <RouterLink v-if="to && value" :to="to" class="link truncate" :title="value ?? ''" data-testid="hash-link">{{ text }}</RouterLink>
      <span v-else class="truncate" :title="value ?? ''">{{ text }}</span>
    </template>
    <CopyButton v-if="copy && value" :value="value" />
  </span>
</template>
