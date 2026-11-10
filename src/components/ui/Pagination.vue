<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Meta } from '@/api/types'

const props = defineProps<{ page: number; meta: Meta | null; limit: number; loading?: boolean }>()
const emit = defineEmits<{ (e: 'update:page', v: number): void; (e: 'update:limit', v: number): void }>()
const { t } = useI18n()
const pageCount = computed(() => props.meta?.pageCount ?? (props.meta?.next ? props.page + 1 : props.page))
const canNext = computed(() => Boolean(props.meta?.next) || props.page < pageCount.value)
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted" data-testid="pagination">
    <div class="flex items-center gap-2">
      <span>{{ t('common.perPage') }}</span>
      <select class="input !w-auto !py-1 !px-2 text-xs" :value="limit" @change="emit('update:limit', Number(($event.target as HTMLSelectElement).value))" data-testid="pagination-limit">
        <option v-for="n in [10, 25, 50, 100]" :key="n" :value="n">{{ n }}</option>
      </select>
      <span v-if="meta?.totalCount" class="mono hidden sm:inline">· {{ meta.totalCount.toLocaleString('en-US') }} {{ t('common.items') }}</span>
    </div>
    <div class="flex items-center gap-1">
      <button class="btn-ghost !py-1 !px-2" :disabled="page <= 1 || loading" @click="emit('update:page', page - 1)" data-testid="pagination-prev"><ChevronLeft class="rtl:-scale-x-100 h-4 w-4" /></button>
      <span class="mono px-2">{{ t('common.page') }} {{ page }}<span v-if="meta?.pageCount"> {{ t('common.of') }} {{ meta.pageCount.toLocaleString('en-US') }}</span></span>
      <button class="btn-ghost !py-1 !px-2" :disabled="!canNext || loading" @click="emit('update:page', page + 1)" data-testid="pagination-next"><ChevronRight class="rtl:-scale-x-100 h-4 w-4" /></button>
    </div>
  </div>
</template>
