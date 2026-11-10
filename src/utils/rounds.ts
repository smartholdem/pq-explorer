import { get as idbGet, set as idbSet } from 'idb-keyval'
import type { Api } from '@/api/endpoints'

export const roundOf = (height: number, active: number) => Math.floor((height - 1) / active) + 1
export const slotOf = (epochTs: number, blocktime: number) => Math.floor(epochTs / blocktime)

const sha256 = async (data: Uint8Array): Promise<Uint8Array> => new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource))

// Legacy core shuffle, quirk included: the outer `i++` runs after every batch of 4, so indices 4, 9, 14, 19 are never swapped as `i`.
export async function shuffleRound<T>(ranked: T[], round: number): Promise<T[]> {
  const d = [...ranked]
  const n = d.length
  if (!n) return d
  let seed = await sha256(new TextEncoder().encode(String(round)))
  let i = 0
  while (i < n) {
    for (let x = 0; x < 4 && i < n; x++, i++) {
      const ni = seed[x] % n
      ;[d[ni], d[i]] = [d[i], d[ni]]
    }
    i++
    seed = await sha256(seed)
  }
  return d
}

const memo = new Map<string, Promise<string[]>>()
// forging order of a round: ranked snapshot from the node (immutable once the round started) → shuffled; persisted per network
export function forgingOrder(api: Api, netId: string, round: number): Promise<string[]> {
  const key = `${netId}:${round}`
  let p = memo.get(key)
  if (!p) {
    p = (async () => {
      const idbKey = `sth:${netId}:round:${round}`
      const hit = await idbGet<string[]>(idbKey).catch(() => undefined)
      if (hit?.length) return hit
      const ranked = (await api.rounds.delegates(round)).data.map((d) => d.publicKey)
      const order = await shuffleRound(ranked, round)
      void idbSet(idbKey, order).catch(() => undefined)
      return order
    })()
    memo.set(key, p)
    p.catch(() => memo.delete(key))
  }
  return p
}
