import type { ApiClient, Params } from './client'
import type {
  Block, Transaction, Wallet, Delegate, NtfryDelegates, Token, WalletToken, Lock,
  Market, Metrics, Finality, NodeConfiguration, Meta, Peer, FeeDayBucket, SObject, TokenOrder, TokenTrade, TokenCandle, TokenHolder,
} from './types'

export interface ListQuery extends Params { page?: number; limit?: number; orderBy?: string }

export const createApi = (c: ApiClient) => ({
  node: {
    configuration: () => c.get<NodeConfiguration>('node/configuration'),
    status: () => c.get<{ synced: boolean; now: number; blocksCount: number; timestamp: number }>('node/status'),
    fees: (days = 7) => c.get<any>('node/fees', { days }),
    feesByDay: (days = 7) => c.get<FeeDayBucket[] | Record<string, unknown>>('node/fees', { days, groupBy: 'day' }),
  },
  blockchain: () => c.get<{ block: { height: number; id: string }; supply: string }>('blockchain'),
  rounds: {
    delegates: (round: number) => c.get<{ publicKey: string; votes: string }[]>(`rounds/${round}/delegates`),
  },
  peers: {
    list: (q: ListQuery = {}) => c.get<Peer[]>('peers', { limit: 100, ...q }),
  },
  blocks: {
    list: (q: ListQuery = {}) => c.get<Block[]>('blocks', { orderBy: 'height:desc', ...q }),
    get: (idOrHeight: string | number) => c.get<Block>(`blocks/${idOrHeight}`),
    last: () => c.get<Block>('blocks/last'),
    transactions: (id: string, q: ListQuery = {}) => c.get<Transaction[]>(`blocks/${id}/transactions`, q),
  },
  transactions: {
    list: (q: ListQuery = {}) => c.get<Transaction[]>('transactions', { orderBy: 'timestamp:desc', ...q }),
    get: (id: string) => c.get<Transaction>(`transactions/${id}`),
    unconfirmed: (q: ListQuery = {}) => c.get<Transaction[]>('transactions/unconfirmed', q),
    types: () => c.get<Record<string, Record<string, number>>>('transactions/types'),
    fees: () => c.get<any>('transactions/fees'),
  },
  wallets: {
    list: (q: ListQuery = {}) => c.get<Wallet[]>('wallets', q),
    top: (q: ListQuery = {}) => c.get<Wallet[]>('wallets/top', q),
    get: (id: string) => c.get<Wallet>(`wallets/${id}`),
    transactions: (id: string, kind: 'all' | 'sent' | 'received', q: ListQuery = {}) =>
      c.get<Transaction[]>(`wallets/${id}/transactions${kind === 'all' ? '' : '/' + kind}`, { orderBy: 'timestamp:desc', ...q }),
    votes: (id: string, q: ListQuery = {}) => c.get<Transaction[]>(`wallets/${id}/votes`, q),
    locks: (id: string, q: ListQuery = {}) => c.get<Lock[]>(`wallets/${id}/locks`, q),
    tokens: (address: string) => c.get<WalletToken[]>(`wallets/${address}/tokens`),
    orders: (address: string, q: ListQuery = {}) => c.get<TokenOrder[]>(`wallets/${address}/orders`, q),
  },
  delegates: {
    list: (q: ListQuery = {}) => c.get<Delegate[]>('delegates', { orderBy: 'rank:asc', ...q }),
    get: (id: string) => c.get<Delegate>(`delegates/${id}`),
    voters: (id: string, q: ListQuery = {}) => c.get<Wallet[]>(`delegates/${id}/voters`, q),
    blocks: (id: string, q: ListQuery = {}) => c.get<Block[]>(`delegates/${id}/blocks`, q),
  },
  locks: {
    list: (q: ListQuery = {}) => c.get<Lock[]>('locks', q),
    get: (id: string) => c.get<Lock>(`locks/${id}`),
  },
  sobj: {
    list: (q: ListQuery & { type?: number; address?: string } = {}) => c.get<SObject[]>('sobj', q),
    get: (id: string) => c.get<SObject>(`sobj/${id}`),
    byName: (name: string) => c.get<SObject[]>('sobj', { name, limit: 10 }),
  },
  tokens: {
    list: (q: ListQuery = {}) => c.get<Token[]>('tokens', q),
    get: (key: string) => c.get<Token>(`tokens/${key}`),
    holders: (key: string, q: ListQuery = {}) => c.get<TokenHolder[]>(`tokens/${key}/holders`, q),
    orders: (key: string, q: ListQuery = {}) => c.get<TokenOrder[]>(`tokens/${key}/orders`, q),
    order: (key: string, orderId: string) => c.get<TokenOrder>(`tokens/${key}/orders/${orderId}`),
    trades: (key: string, q: ListQuery = {}) => c.get<TokenTrade[]>(`tokens/${key}/trades`, q),
    candles: (key: string, groupBy: 'hour' | 'day', days: number) => c.get<TokenCandle[]>(`tokens/${key}/trades`, { groupBy, days }),
    logoUrl: (key: string) => c.url(`tokens/${key}/logo`),
  },
  ntfry: {
    metrics: () => c.get<Metrics>('ntfry/metrics'),
    finality: () => c.get<Finality>('ntfry/finality'),
    delegates: () => c.get<NtfryDelegates>('ntfry/delegates'),
    tokens: () => c.get<any>('ntfry/tokens'),
    market: (q: ListQuery & { type?: number } = {}) => c.get<Market>('ntfry/market', q),
  },
})

export type Api = ReturnType<typeof createApi>
export type { Meta }
