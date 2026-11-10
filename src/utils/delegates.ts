import type { NtfryDelegate } from '@/api/types'

export type Impl = 'rust' | 'legacy' | 'unknown'
export interface ImplInfo { impl: Impl; inferred: boolean; version: string | null }

// Rust (PQ) nodes announce themselves over Netfory; a forging delegate never seen there is running a legacy node.
export function delegateImpl(d: NtfryDelegate | null | undefined): ImplInfo | null {
  if (!d) return null
  if (d.implementation === 'rust' || d.implementation === 'legacy') return { impl: d.implementation, inferred: d.inferred, version: d.version }
  // every forging delegate that never announced a PQ node over Netfory is running legacy core
  return { impl: 'legacy', inferred: true, version: null }
}

export const implTone = (i: Impl) => (i === 'rust' ? 'ok' : i === 'legacy' ? 'brand' : 'neutral')
export const implLabel = (i: Impl, unknownLabel = 'unknown') => (i === 'rust' ? 'PQ' : i === 'legacy' ? 'legacy' : unknownLabel)
