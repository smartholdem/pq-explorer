export type SearchGuess = 'height' | 'hash' | 'address' | 'publicKey' | 'username' | 'ticker' | 'unknown'

export function guessSearch(raw: string): SearchGuess {
  const q = raw.trim()
  if (!q) return 'unknown'
  if (/^\d+$/.test(q)) return 'height'
  if (/^[0-9a-f]{64}$/i.test(q)) return 'hash'
  if (/^0[23][0-9a-f]{64}$/i.test(q)) return 'publicKey'
  if (/^[1-9A-HJ-NP-Za-km-z]{34}$/.test(q)) return 'address'
  if (/^[A-Z0-9]{3,10}$/.test(q)) return 'ticker'
  if (/^[a-z0-9!@$&_.]{1,20}$/.test(q)) return 'username'
  return 'unknown'
}
