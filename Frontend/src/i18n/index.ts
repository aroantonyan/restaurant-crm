import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import hy from './hy.json'
import { getTelegram } from '../lib/telegram'

const tgLang = (() => {
  const code = (getTelegram() as unknown as { initDataUnsafe?: { user?: { language_code?: string } } } | null)
    ?.initDataUnsafe?.user?.language_code
  return code === 'hy' ? 'hy' : code === 'en' ? 'en' : undefined
})()

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, hy: { translation: hy } },
    fallbackLng: 'en',
    supportedLngs: ['en', 'hy'],
    lng: tgLang,
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

export default i18n
