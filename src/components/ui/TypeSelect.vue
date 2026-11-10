<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, Check } from 'lucide-vue-next'

export interface SelectOption { value: string; label: string; indent?: boolean }
export interface SelectGroup { label?: string; options: SelectOption[] }
const props = defineProps<{ modelValue: string; groups: SelectGroup[]; testid?: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const flat = computed(() => props.groups.flatMap((g) => g.options))
const current = computed(() => flat.value.find((o) => o.value === props.modelValue))
const cursor = ref(0)

const select = (v: string) => { emit('update:modelValue', v); open.value = false }
const toggle = () => { open.value = !open.value; if (open.value) cursor.value = Math.max(0, flat.value.findIndex((o) => o.value === props.modelValue)) }
const onKey = (e: KeyboardEvent) => {
  if (!open.value) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); toggle() } return }
  if (e.key === 'Escape') open.value = false
  else if (e.key === 'ArrowDown') { e.preventDefault(); cursor.value = Math.min(flat.value.length - 1, cursor.value + 1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); cursor.value = Math.max(0, cursor.value - 1) }
  else if (e.key === 'Enter') { e.preventDefault(); select(flat.value[cursor.value].value) }
}
const onDoc = (e: MouseEvent) => { if (!root.value?.contains(e.target as Node)) open.value = false }
onMounted(() => document.addEventListener('mousedown', onDoc))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDoc))
watch(cursor, (i) => root.value?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.scrollIntoView({ block: 'nearest' }))
</script>

<template>
  <div ref="root" class="relative text-xs" @keydown="onKey">
    <button type="button" class="input !w-auto min-w-[180px] flex items-center justify-between gap-2 text-start" :aria-expanded="open" aria-haspopup="listbox" @click="toggle" :data-testid="testid">
      <span class="truncate">{{ current?.label ?? modelValue }}</span>
      <ChevronDown class="h-3.5 w-3.5 text-muted transition-transform duration-200" :class="open && 'rotate-180'" />
    </button>
    <Transition enter-active-class="transition duration-150 ease-out" enter-from-class="opacity-0 -translate-y-1" leave-active-class="transition duration-100" leave-to-class="opacity-0">
      <ul v-if="open" role="listbox" class="absolute end-0 z-50 mt-2 w-72 max-h-[70vh] overflow-y-auto card !bg-[rgb(var(--c-bg2))] p-1.5 shadow-glow" :data-testid="testid ? `${testid}-menu` : undefined">
        <template v-for="(g, gi) in groups" :key="gi">
          <li v-if="g.label" class="px-2.5 pt-2.5 pb-1 eyebrow text-[10px] select-none">{{ g.label }}</li>
          <li v-for="o in g.options" :key="o.value" role="option" :aria-selected="o.value === modelValue" :data-index="flat.indexOf(o)" :data-value="o.value"
            class="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors"
            :class="[o.indent && 'ps-5', o.value === modelValue ? 'bg-cyan/15 text-cyan font-semibold' : flat.indexOf(o) === cursor ? 'bg-line/10 text-fg' : 'text-fg/90 hover:bg-line/10']"
            @click="select(o.value)" @mousemove="cursor = flat.indexOf(o)">
            <span class="truncate">{{ o.label }}</span><Check v-if="o.value === modelValue" class="h-3.5 w-3.5 shrink-0" />
          </li>
        </template>
      </ul>
    </Transition>
  </div>
</template>
