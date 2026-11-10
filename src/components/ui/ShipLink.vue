<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { ExternalLink } from 'lucide-vue-next'
const props = defineProps<{ n: number | string; label?: string; icon?: boolean }>()
const href = `https://github.com/smartholdem/SHIPs/blob/master/SHIPS/SHIP-${props.n}.md`
</script>

<template>
  <a :href="href" target="_blank" rel="noopener" class="link inline-flex items-center gap-0.5 whitespace-nowrap" :title="`SHIP-${n} on GitHub`" @click.stop :data-testid="`ship-link-${n}`">
    <slot>{{ label ?? `SHIP-${n}` }}</slot><ExternalLink v-if="icon" class="h-2.5 w-2.5 opacity-60" />
  </a>
</template>
