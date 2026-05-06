import Vue from 'vue'
import VueI18n from 'vue-i18n'
import elementLocale from 'element-ui/lib/locale'
import elementEn from 'element-ui/lib/locale/lang/en'
import elementZhCN from 'element-ui/lib/locale/lang/zh-CN'
import messages from './messages'

Vue.use(VueI18n)

const supportedLocales = new Set(Object.keys(messages))

export const normalizeLocale = locale => {
  if (!locale) return 'en'
  const value = String(locale)
  if (supportedLocales.has(value)) return value
  if (/^zh/i.test(value)) return 'zh-CN'
  return 'en'
}

const getElementLocale = locale => {
  return normalizeLocale(locale) === 'zh-CN' ? elementZhCN : elementEn
}

const i18n = new VueI18n({
  locale: normalizeLocale(global.marktext && global.marktext.initialState && global.marktext.initialState.language),
  fallbackLocale: 'en',
  silentTranslationWarn: true,
  messages
})

elementLocale.use(getElementLocale(i18n.locale))

export const setLocale = locale => {
  const nextLocale = normalizeLocale(locale)
  i18n.locale = nextLocale
  elementLocale.use(getElementLocale(nextLocale))
  return nextLocale
}

export default i18n
