<script setup lang="ts">
import { defineProps, defineEmits, withDefaults } from 'vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Atom } from 'lucide-vue-next'
import Pill from '@/components/ui/Pill.vue'
import { txKind, isQuantum } from '@/utils/tx'
import type { Transaction } from '@/api/types'

const props = defineProps<{ tx: Pick<Transaction, 'type' | 'typeGroup' | 'version' | 'secondSignatures'>; showQuantum?: boolean }>()
const { t, te } = useI18n()
const kind = computed(() => txKind(props.tx))
const label = computed(() => (te(`txs.types.${kind.value.key}`) ? t(`txs.types.${kind.value.key}`) : `${props.tx.typeGroup}:${props.tx.type}`))
</script>

<template>
  <span class="inline-flex items-center gap-1.5">
    <Pill :tone="kind.tone" data-testid="tx-type-badge">{{ label }}</Pill>
    <Pill v-if="showQuantum !== false && isQuantum(tx)" tone="quantum" glow data-testid="tx-quantum-badge"><Atom class="h-3 w-3" />PQ v3</Pill>
  </span>
</template>
