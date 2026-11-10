import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { i18n, isLocale, loadLocale, type Locale } from '@/i18n'

const detectLocale = (): Locale => {
  const saved = localStorage.getItem('sth.locale')
  if (isLocale(saved)) return saved
  const nav = navigator.language.toLowerCase().split('-')[0]
  return isLocale(nav) ? nav : 'en'
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<'dark' | 'light'>((localStorage.getItem('sth.theme') as 'dark' | 'light') || 'dark')
  const locale = ref<Locale>(detectLocale())

  const applyTheme = () => {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
    localStorage.setItem('sth.theme', theme.value)
  }
  const applyLocale = async () => {
    const l = locale.value
    await loadLocale(l)
    if (locale.value !== l) return
    ;(i18n.global.locale as unknown as { value: string }).value = l
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('sth.locale', l)
  }
  watch(theme, applyTheme, { immediate: true })
  watch(locale, () => { void applyLocale() }, { immediate: true })

  const toggleTheme = () => { theme.value = theme.value === 'dark' ? 'light' : 'dark' }
  const setLocale = (l: Locale) => { locale.value = l }
  return { theme, locale, toggleTheme, setLocale }
})
