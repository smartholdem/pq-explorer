import type { Timestamp, TokenOrder, Transaction } from '@/api/types'

// all token math is BigInt: amounts are u64 smallest units, prices are smartoshi per smallest unit
export const big = (v: unknown): bigint => {
  try { return BigInt(String(v ?? 0).split('.')[0] || 0) } catch { return 0n }
}
const pow10 = (n: number) => 10n ** BigInt(Math.max(0, n))

// smartoshi per whole token: price × 10^decimals (display with 8 STH decimals)
export const pricePerToken = (price: unknown, decimals: number) => big(price) * pow10(decimals)
// smartoshi paid for `amount` smallest units
export const orderValue = (amount: unknown, price: unknown) => big(amount) * big(price)
// float STH per whole token – charts only
export const priceFloat = (price: unknown, decimals: number) => (Number(price) * 10 ** decimals) / 1e8

export type OrderStatus = 'open' | 'partial' | 'filled' | 'cancelled'
export const orderStatus = (o: Pick<TokenOrder, 'open' | 'filled' | 'amount'>): OrderStatus =>
  o.open ? (big(o.filled) > 0n ? 'partial' : 'open') : big(o.filled) >= big(o.amount) ? 'filled' : 'cancelled'
export const ORDER_TONE: Record<OrderStatus, 'cyan' | 'warn' | 'ok' | 'neutral'> = { open: 'cyan', partial: 'warn', filled: 'ok', cancelled: 'neutral' }
export const fillPct = (o: Pick<TokenOrder, 'filled' | 'amount'>) => (big(o.amount) ? Number((big(o.filled) * 10000n) / big(o.amount)) / 100 : 0)

export const isTokenTx = (tx: Pick<Transaction, 'typeGroup'>) => tx.typeGroup === 3
export const tokenAsset = (tx: Transaction): Record<string, any> | null => (tx.typeGroup === 3 ? tx.asset?.token ?? null : null)
export const tokenIdOf = (tx: Transaction): string | null => tokenAsset(tx)?.id ?? null

// token amount shown in the "Amount" column (tx.amount is always 0 for group 3)
export function tokenTxAmount(tx: Transaction): bigint | null {
  const a = tokenAsset(tx)
  if (!a) return null
  switch (tx.type) {
    case 0: return big(a.initialSupply)
    case 1: return (a.transfers ?? []).reduce((s: bigint, r: any) => s + big(r.amount), 0n)
    case 2: case 3: case 5: case 6: return big(a.amount)
    default: return null
  }
}
export const tokenTxRecipients = (tx: Transaction): { recipientId: string; amount: string }[] => {
  const a = tokenAsset(tx)
  if (!a) return []
  if (tx.type === 1) return a.transfers ?? []
  if (tx.type === 2 && a.recipientId) return [{ recipientId: a.recipientId, amount: a.amount }]
  return []
}

// trade/candle timestamps may come as unix seconds, ms, chain epoch seconds or a Timestamp object
export const tsUnix = (ts: number | Timestamp | undefined | null, epochUnix: number): number => {
  if (!ts) return 0
  if (typeof ts === 'object') return ts.unix
  if (ts > 1e12) return Math.floor(ts / 1000)
  return ts < 1e9 ? epochUnix + ts : ts
}
