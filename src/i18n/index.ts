import { createI18n } from 'vue-i18n'
import en from './en.json'
import ru from './ru.json'

export const LOCALES = [
  { code: 'en', name: 'English' }, { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '简体中文' }, { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'ko', name: '한국어' }, { code: 'th', name: 'ไทย' },
  { code: 'es', name: 'Español' }, { code: 'vi', name: 'Tiếng Việt' },
  { code: 'fr', name: 'Français' }, { code: 'de', name: 'Deutsch' },
  { code: 'kk', name: 'Қазақ тілі' }, { code: 'pt', name: 'Português' },
  { code: 'uz', name: 'Oʻzbek tili' }, { code: 'mn', name: 'Монгол хэл' },
  { code: 'ja', name: '日本語' }, { code: 'sw', name: 'Kiswahili' },
  { code: 'ar', name: 'العربية' }, { code: 'hi', name: 'हिन्दी' },
] as const
export type Locale = (typeof LOCALES)[number]['code']
export const isLocale = (v: string | null | undefined): v is Locale => LOCALES.some((l) => l.code === v)

// en/ru ship in the main bundle; the rest are lazy-loaded on first use
const loaders: Partial<Record<Locale, () => Promise<{ default: Record<string, unknown> }>>> = {
  zh: () => import('./zh.json'), id: () => import('./id.json'), ko: () => import('./ko.json'), th: () => import('./th.json'),
  es: () => import('./es.json'), vi: () => import('./vi.json'), fr: () => import('./fr.json'), de: () => import('./de.json'),
  kk: () => import('./kk.json'), pt: () => import('./pt.json'), uz: () => import('./uz.json'), mn: () => import('./mn.json'),
  ja: () => import('./ja.json'), sw: () => import('./sw.json'), ar: () => import('./ar.json'), hi: () => import('./hi.json'),
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
  pluralizationRules: {
    ru: (n: number, choices: number) => {
      if (choices < 4) return n === 1 ? 0 : 1
      const m10 = n % 10, m100 = n % 100
      if (n === 0) return 0
      if (m10 === 1 && m100 !== 11) return 1
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 2
      return 3
    },
  },
})

export const loadLocale = async (code: Locale) => {
  if ((i18n.global.availableLocales as string[]).includes(code)) return
  const load = loaders[code]
  if (!load) return
  const mod = await load()
  i18n.global.setLocaleMessage(code, mod.default as any)
}
