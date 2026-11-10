export interface SObject {
  id: string
  address: string
  publicKey: string
  type: number
  subType: number
  data: { name: string; ntfryData?: string | null }
  forSale: boolean
  price: string | null
  isResigned: boolean
}


export interface FeeTypeStat { count: number; avg: string; max: string; min: string; sum: string }
export interface FeeDayBucket {
  day: string
  from: number
  to: number
  count: number
  sum: string
  blocks: number
  types: Record<string, Record<string, FeeTypeStat>>
}


export interface Meta {
  count: number
  pageCount: number
  totalCount: number
  next: string | null
  previous: string | null
}
export interface ApiResponse<T> { data: T; meta?: Meta }

export interface Timestamp { epoch: number; unix: number; human: string }

export interface Block {
  id: string
  version: number
  height: number
  previous: string | null
  forged: { reward: string; fee: string; total: string; amount: string }
  payload: { hash: string; length: number }
  generator: { username?: string; address: string; publicKey: string }
  signature: string
  pqSignature?: string | null
  confirmations: number
  transactions: number
  timestamp: Timestamp
  finalized?: boolean
}

export interface Transaction {
  id: string
  blockId: string
  version: number
  type: number
  typeGroup: number
  amount: string
  fee: string
  sender: string
  senderPublicKey: string
  recipient?: string
  signature: string
  signSignature?: string
  secondSignatures?: { algorithm: number | string; signature: string }[]
  signatures?: string[]
  vendorField?: string
  asset?: Record<string, any>
  nonce: string
  confirmations: number
  timestamp: Timestamp
  finalized?: boolean
}

export interface QuantumShield {
  committed: boolean
  active: boolean
  commitment?: string
  height?: number
  algorithm?: number | string
  publicKey?: string
  since?: number
}

export interface Wallet {
  address: string
  publicKey: string | null
  nonce: string
  balance: string
  isDelegate?: boolean
  isResigned?: boolean
  vote?: string
  username?: string
  secondPublicKey?: string
  attributes: Record<string, any>
  quantumShield?: QuantumShield
}

export interface Delegate {
  username: string
  address: string
  publicKey: string
  votes: string
  rank: number
  isResigned: boolean
  blocks: { produced: number; missed?: number; last?: { id: string; height: number; timestamp: Timestamp } }
  production: { approval: number }
  forged: { fees: string; rewards: string; total: string }
}

export interface NtfryDelegate {
  rank: number
  username: string
  publicKey: string
  votes: string
  implementation: 'rust' | 'legacy' | 'unknown'
  version: string | null
  outdated: boolean
  node: string | null
  lastSeen: number | null
  observed: number
  inferred: boolean
  doubleVotes: number
  bannedUntilRound: number | null
  banned: boolean
  pqKey: boolean
}

export interface Equivocation {
  publicKey: string
  username: string
  height: number
  blockIds: string[]
  detectedHeight: number
  bannedUntilRound: number
  banned: boolean
  roundsLeft: number
}

export interface NtfryDelegates {
  list: NtfryDelegate[]
  active: number
  rust?: number
  legacy?: number
  unknown?: number
  outdated?: number
  minCoreVersion?: string
  slashing?: { enabled: boolean; rounds: number; currentRound?: number }
  equivocations: Equivocation[]
}

export interface Token {
  id: string
  symbol: string
  decimals: number
  flags?: number
  mintable: boolean
  burnable: boolean
  supply: string
  supplyCap: string | null
  owner: string
  initHeight: number
  meta?: { name?: string; description?: string; website?: string; logoType?: string; logoUrl?: string }
  sobj?: { ntfryData?: any; resigned?: boolean; price?: string; forSale?: boolean }
}

// SHIP-43 token market: prices are smartoshi per smallest token unit, amounts are smallest units (u64 strings)
export interface TokenOrder {
  orderId: string
  tokenId: string
  symbol?: string
  decimals?: number
  seller: string
  price: string
  amount: string
  filled: string
  remaining: string
  total: string
  height: number
  open: boolean
  closed: number | null
  fills?: string[]
}
export interface TokenTrade { txId: string; orderId: string; buyer: string; seller: string; amount: string; price: string; total: string; height: number; timestamp: number | Timestamp; time?: string }
export interface TokenCandle { timestamp: number | Timestamp; time?: string; open: string | number; high: string | number; low: string | number; close: string | number; volume: string | number; value: string | number; trades: number }
export interface TokenHolder { address: string; balance: string; symbol?: string; decimals?: number }

export interface WalletToken {
  tokenId?: string
  id?: string
  symbol: string
  decimals: number
  balance: string
  meta?: Token['meta']
}

export interface Lock {
  lockId: string
  amount: string
  secretHash: string
  senderPublicKey: string
  recipientId: string
  timestamp: Timestamp
  expirationType: number
  expirationValue: number
  isExpired: boolean
  vendorField?: string
}

export interface MarketOrder {
  id: string
  type: number
  subType: number
  name: string
  ntfryData?: any
  owner: string
  price: string
  token?: { symbol: string; decimals: number; supply: string; supplyCap: string | null; name?: string; logoUrl?: string }
}
export interface Market { active: boolean; fees: { sell: number; buy: number }; orders: MarketOrder[] }

export interface Metrics {
  node: {
    implementation: string
    version: string
    nethash: string
    now: number
    uptime: number
    pqActive: number
    pqBlocks: boolean
    pqCommitments: number
    pqStage: string
    rssBytes?: number
    lastBlockVersion?: number
  }
  chain: {
    height: number
    id: string
    networkHeight: number
    behind: number
    syncing: boolean
    blockTime: number
    blocksPerMin: number
    lastBlockAge: number
  }
  mempool: { count: number; max: number; bytes: number; maxBytes: number; dynamicFees?: { enabled: boolean; minFeePool: number; minFeeBroadcast: number; minTransferFee: number; transferBytes: number; lowFeeRejected: number; addonBytes: Record<string, number> } }
  blocks: Block[]
  delegates?: { active: number; legacy: number; rust?: number; list: NtfryDelegate[]; equivocations: Equivocation[] }
  finality?: Finality
  forging?: { enabled: boolean; delegates: { username: string; publicKey: string; address: string; rank: number; active: boolean }[]; forgedCount?: number; skipped?: any[] }
  intake?: { avgDelayMs: number; samples: number; last?: { delayMs: number; height: number; label: string } }
  legacy?: { alive: number; known: number; banned: number; bestHeight: number }
  ntfry?: { known: number; neighbors: number; gateways: number; bestHeight: number; nodeId: string }
  peers?: any
  sync?: any
  tokens?: any
  burn?: { address: string; burned: string; supply: string; tokenInitBurn: string }
  market?: any
}

export interface Finality {
  enabled: boolean
  finalizedHeight: number
  finalizedId: string | null
  lag: number
  quorum: number
  activeDelegates: number
  hard: boolean
  tipVotes?: number
  received?: number
  rejected?: number
  heights?: { height: number; blockId: string; votes: number; certified: boolean }[]
  latestCertificate?: { height: number; blockId: string; votes: number; delegates: string[] } | null
  slashing?: { enabled: boolean; rounds: number }
  equivocations: Equivocation[]
}

export interface Peer {
  ip: string
  port: number
  ports: Record<string, number>
  version: string
  height: number
  latency: number
  plugins?: Record<string, { enabled: boolean; port: number }>
}

export interface NodeConfiguration {
  core: { implementation: string; version: string }
  nethash: string
  token: string
  symbol: string
  version: number
  explorer?: string
  constants: Record<string, any>
  pq: { active: boolean; activation: number | null; algorithms: number[]; feePerByte: string; commitmentGrace: number; publicKeyBytes: number; signatureBytes: number }
  quantumShield: { stage: string; activation: number | null; algorithms: number[]; commitmentPrefix?: string }
  finality?: { activeDelegates: number; finalizedHeight: number; hard: boolean; quorum: number }
  transactionPool?: any
}
