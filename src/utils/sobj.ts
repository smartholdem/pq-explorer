// SHIP-13: type 4 = delegate object, 5 = token ticker registry, everything else is application-defined
export type SobjTypeKey = 'delegate' | 'ticker' | 'app'
export const sobjTypeKey = (type: number): SobjTypeKey => (type === 4 ? 'delegate' : type === 5 ? 'ticker' : 'app')
export const sobjTone = (type: number) => (type === 5 ? 'brand' : type === 4 ? 'cyan' : 'quantum') as 'brand' | 'cyan' | 'quantum'
export const SOBJ_ACTIONS = ['register', 'update', 'resign', 'transfer', 'sell', 'buy'] as const
export const sobjAction = (a: number | undefined | null) => (a == null ? null : SOBJ_ACTIONS[a] ?? `action_${a}`)
export const isUrlPointer = (p: string | null | undefined) => Boolean(p && /^(https?:\/\/|sth:\/\/|ipfs:\/\/)/i.test(p))
export const pointerHref = (p: string) => (p.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${p.slice(7)}` : p)
