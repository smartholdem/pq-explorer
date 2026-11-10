<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Star } from 'lucide-vue-next'
import { useFavoritesStore, type FavKind } from '@/stores/favorites'

const props = withDefaults(defineProps<{ kind: FavKind; id: string; label?: string; compact?: boolean }>(), { compact: false })
const { t } = useI18n()
const fav = useFavoritesStore()
const on = computed(() => fav.has(props.kind, props.id))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-1.5 rounded-xl border transition-[color,border-color,background-color,transform] duration-200 active:scale-95"
    :class="[compact ? 'p-1' : 'px-2.5 py-1 text-xs font-semibold', on ? 'border-warn/50 bg-warn/10 text-warn' : 'hair text-muted hover:text-warn hover:border-warn/40']"
    :title="on ? t('fav.remove') : t('fav.add')" :aria-pressed="on"
    @click.stop.prevent="fav.toggle(kind, id, label)" data-testid="fav-toggle" :data-on="on ? 'true' : undefined"
  >
    <Star class="h-3.5 w-3.5 transition-transform duration-300" :class="on && 'fill-current rotate-[72deg]'" />
    <span v-if="!compact">{{ on ? t('fav.pinned') : t('fav.pin') }}</span>
  </button>
</template>
