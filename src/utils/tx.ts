import type { Transaction } from '@/api/types'

export interface TxKind { key: string; group: 'core' | 'sobj' | 'token' | 'unknown'; tone: 'neutral' | 'cyan' | 'brand' | 'ok' | 'warn' | 'quantum' | 'bad' }

export const CORE_TYPES: Record<number, [string, TxKind['tone']]> = {
  0: ['transfer', 'cyan'],
  1: ['secondSignature', 'neutral'],
  2: ['delegateRegistration', 'brand'],
  3: ['vote', 'ok'],
  4: ['multiSignature', 'neutral'],
  5: ['ipfs', 'neutral'],
  6: ['multiPayment', 'cyan'],
  7: ['delegateResignation', 'warn'],
  8: ['htlcLock', 'warn'],
  9: ['htlcClaim', 'ok'],
  10: ['htlcRefund', 'warn'],
}
export const TOKEN_TYPES: Record<number, [string, TxKind['tone']]> = {
  0: ['tokenInit', 'brand'],
  1: ['tokenTransfer', 'cyan'],
  2: ['tokenMint', 'ok'],
  3: ['tokenBurn', 'bad'],
  4: ['tokenMeta', 'neutral'],
  5: ['tokenSell', 'brand'],
  6: ['tokenBuy', 'ok'],
  7: ['tokenCancel', 'warn'],
}

const CORE = CORE_TYPES
const TOKEN = TOKEN_TYPES
export const CORE_TYPE_BY_NAME: Record<string, number> = Object.fromEntries(Object.entries(CORE).map(([n, [name]]) => [name, Number(n)]))

export function txKind(tx: Pick<Transaction, 'type' | 'typeGroup'>): TxKind {
  const g = tx.typeGroup ?? 1
  if (g === 1 && CORE[tx.type]) return { key: CORE[tx.type][0], group: 'core', tone: CORE[tx.type][1] }
  if (g === 2) return { key: tx.type === 6 ? 'smartObject' : `sobj_${tx.type}`, group: 'sobj', tone: 'quantum' }
  if (g === 3 && TOKEN[tx.type]) return { key: TOKEN[tx.type][0], group: 'token', tone: TOKEN[tx.type][1] }
  return { key: `unknown_${g}_${tx.type}`, group: 'unknown', tone: 'neutral' }
}

export const isQuantum = (tx: Pick<Transaction, 'version' | 'secondSignatures'>) =>
  tx.version >= 3 || (Array.isArray(tx.secondSignatures) && tx.secondSignatures.length > 0)

export const isVote = (tx: Transaction) => tx.typeGroup === 1 && tx.type === 3
export const isMultiPayment = (tx: Transaction) => tx.typeGroup === 1 && tx.type === 6

export const PQ_ALGORITHMS: Record<string, string> = { '1': 'ML-DSA-44 (Dilithium2)', '2': 'ML-DSA-65 (Dilithium3)', '3': 'ML-DSA-87 (Dilithium5)' }
export const pqAlgorithmName = (a: number | string | undefined | null) => (a === undefined || a === null ? '—' : PQ_ALGORITHMS[String(a)] ?? `algorithm #${a}`)

export function multiPaymentTotal(tx: Transaction): bigint {
  const payments: { amount: string }[] = tx.asset?.payments ?? []
  return payments.reduce((s, p) => s + BigInt(p.amount ?? 0), 0n)
}
