import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ru'
dayjs.extend(relativeTime)

// dayjs locale names differ from ours for a few languages; locales other than en/ru load lazily
const DAYJS_LOCALE: Record<string, string> = { zh: 'zh-cn', uz: 'uz-latn' }
const dayjsLoaders: Record<string, () => Promise<unknown>> = {
  'zh-cn': () => import('dayjs/locale/zh-cn'), id: () => import('dayjs/locale/id'), ko: () => import('dayjs/locale/ko'), th: () => import('dayjs/locale/th'),
  es: () => import('dayjs/locale/es'), vi: () => import('dayjs/locale/vi'), fr: () => import('dayjs/locale/fr'), de: () => import('dayjs/locale/de'),
  kk: () => import('dayjs/locale/kk'), pt: () => import('dayjs/locale/pt'), 'uz-latn': () => import('dayjs/locale/uz-latn'), mn: () => import('dayjs/locale/mn'),
  ja: () => import('dayjs/locale/ja'), sw: () => import('dayjs/locale/sw'), ar: () => import('dayjs/locale/ar'), hi: () => import('dayjs/locale/hi'),
}
export const setDayjsLocale = async (l: string) => {
  const name = DAYJS_LOCALE[l] ?? l
  if (dayjsLoaders[name]) await dayjsLoaders[name]()
  dayjs.locale(name)
}

export function fromUnits(value: string | number | bigint | null | undefined, decimals = 8, maxFrac = decimals): string {
  if (value === null || value === undefined || value === '') return '0'
  let big: bigint
  try { big = BigInt(String(value).split('.')[0]) } catch { return String(value) }
  const neg = big < 0n
  if (neg) big = -big
  const base = 10n ** BigInt(decimals)
  const int = big / base
  let frac = (big % base).toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '')
  const intStr = int.toLocaleString('en-US').replace(/,/g, '\u2009')
  return ltr(`${neg ? '-' : ''}${intStr}${frac ? '.' + frac : ''}`)
}

// in RTL text, a grouped number ("5 000") would be re-ordered by the bidi algorithm → wrap it in an LTR isolate
const ltr = (s: string) => (document.documentElement.dir === 'rtl' ? `\u2066${s}\u2069` : s)

export const formatNumber = (n: number | string | null | undefined, digits = 0) =>
  n === null || n === undefined ? '—' : ltr(Number(n).toLocaleString('en-US', { maximumFractionDigits: digits }).replace(/,/g, '\u2009'))

export const truncateMiddle = (s: string | null | undefined, head = 8, tail = 6) => {
  if (!s) return '—'
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`
}

// block timestamps slightly ahead of the client clock must never read as "in a few seconds"
export const timeAgo = (unix: number | undefined) => (unix ? dayjs.unix(Math.min(unix, Math.floor(Date.now() / 1000))).fromNow() : '—')
export const formatDate = (unix: number | undefined) => (unix ? dayjs.unix(unix).format('YYYY-MM-DD HH:mm:ss') : '—')

export const formatDuration = (sec: number) => {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60)
  if (d) return `${d}d ${h}h`
  if (h) return `${h}h ${m}m`
  return `${m}m ${Math.floor(sec % 60)}s`
}

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`
  return `${(b / 1024 ** 3).toFixed(2)} GB`
}

export const percent = (part: number, total: number) => (total ? Math.min(100, Math.round((part / total) * 100)) : 0)
