import type { NtfryDelegate, NtfryDelegates } from '@/api/types'
import { useNetworkStore } from '@/stores/network'
import { useQuery } from './useQuery'

const rank = (i: NtfryDelegate['implementation']) => (i === 'rust' ? 2 : i === 'legacy' ? 1 : 0)

// Each node only knows the implementation of delegates it has observed over Netfory,
// so we merge /ntfry/delegates from every configured source: concrete knowledge beats "unknown".
export function mergeNtfry(parts: NtfryDelegates[]): NtfryDelegates | null {
  if (!parts.length) return null
  const byPk = new Map<string, NtfryDelegate>()
  for (const p of parts) {
    for (const d of p.list) {
      const cur = byPk.get(d.publicKey)
      if (!cur) { byPk.set(d.publicKey, { ...d }); continue }
      const best = rank(d.implementation) > rank(cur.implementation) ? d : cur
      byPk.set(d.publicKey, {
        ...cur,
        implementation: best.implementation,
        inferred: best.inferred,
        version: best.version ?? cur.version,
        node: best.node ?? cur.node,
        lastSeen: best.lastSeen ?? cur.lastSeen,
        outdated: cur.outdated || d.outdated,
        banned: cur.banned || d.banned,
        bannedUntilRound: cur.bannedUntilRound ?? d.bannedUntilRound,
        doubleVotes: Math.max(cur.doubleVotes, d.doubleVotes),
        pqKey: cur.pqKey || d.pqKey,
        observed: Math.max(cur.observed, d.observed),
      })
    }
  }
  const seen = new Set<string>()
  const equivocations = parts.flatMap((p) => p.equivocations ?? []).filter((e) => {
    const k = `${e.publicKey}:${e.height}`
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  const list = [...byPk.values()].sort((a, b) => a.rank - b.rank)
  const base = parts[0]
  return {
    ...base,
    list,
    equivocations,
    rust: list.filter((d) => d.implementation === 'rust').length,
    legacy: list.filter((d) => d.implementation === 'legacy').length,
    unknown: list.filter((d) => d.implementation === 'unknown').length,
    outdated: list.filter((d) => d.outdated).length,
  }
}

export interface DiscoveredNode { ip: string; version: string; implementation: string; delegates: { username: string; publicKey: string }[] }
const discoveryCache = new Map<string, { at: number; nodes: DiscoveredNode[] }>()
const DISCOVERY_TTL = 5 * 60_000

// Ask every peer for its /node/configuration; PQ (rust) nodes also expose which delegates they forge for
// in /ntfry/metrics.forging — direct evidence of the delegate's implementation.
export async function discoverDelegateNodes(): Promise<DiscoveredNode[]> {
  const net = useNetworkStore()
  const hit = discoveryCache.get(net.currentId)
  if (hit && Date.now() - hit.at < DISCOVERY_TTL) return hit.nodes
  const peers = (await net.api.peers.list().catch(() => ({ data: [] }))).data
  const targets = peers.map((p) => ({ ip: p.ip, port: p.ports?.['@smartholdem/core-api'] ?? p.ports?.['@arkecosystem/core-api'] ?? 4003 })).filter((t) => t.port > 0)
  const probes = await Promise.allSettled(targets.map(async ({ ip, port }) => {
    const api = net.peerApi(ip, port)
    const cfg = (await api.node.configuration()).data
    if (!cfg.core?.implementation?.includes('rust')) return null
    const metrics = (await api.ntfry.metrics()).data
    return { ip, version: cfg.core.version, implementation: cfg.core.implementation, delegates: (metrics.forging?.delegates ?? []).map((d) => ({ username: d.username, publicKey: d.publicKey })) } as DiscoveredNode
  }))
  const nodes = probes.filter((r): r is PromiseFulfilledResult<DiscoveredNode | null> => r.status === 'fulfilled').map((r) => r.value).filter((n): n is DiscoveredNode => Boolean(n))
  discoveryCache.set(net.currentId, { at: Date.now(), nodes })
  return nodes
}

export function applyDiscovery(merged: NtfryDelegates, nodes: DiscoveredNode[]): NtfryDelegates {
  const byPk = new Map<string, DiscoveredNode>()
  nodes.forEach((n) => n.delegates.forEach((d) => byPk.set(d.publicKey, n)))
  const list = merged.list.map((d) => {
    const n = byPk.get(d.publicKey)
    return n ? { ...d, implementation: 'rust' as const, inferred: false, version: n.version, node: d.node ?? n.ip } : d
  })
  return { ...merged, list, rust: list.filter((d) => d.implementation === 'rust').length, legacy: list.filter((d) => d.implementation === 'legacy').length, unknown: list.filter((d) => d.implementation === 'unknown').length }
}

export function useNtfryDelegates() {
  const net = useNetworkStore()
  return useQuery(async () => {
    const [results, nodes] = await Promise.all([
      Promise.allSettled(net.sourceApis.map((a) => a.ntfry.delegates())),
      discoverDelegateNodes().catch(() => [] as DiscoveredNode[]),
    ])
    const ok = results.filter((r): r is PromiseFulfilledResult<{ data: NtfryDelegates }> => r.status === 'fulfilled').map((r) => r.value.data)
    if (!ok.length) throw (results[0] as PromiseRejectedResult).reason
    return { data: applyDiscovery(mergeNtfry(ok) as NtfryDelegates, nodes) }
  }, [], true)
}
