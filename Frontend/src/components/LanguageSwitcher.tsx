import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hy', label: 'ՀԱՅ' },
] as const

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <div className="flex gap-1 self-end">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={`text-xs px-2.5 py-1 rounded-md transition ${
            i18n.resolvedLanguage === code
              ? 'bg-tg-button text-tg-button-text'
              : 'bg-tg-secondary-bg text-tg-hint'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
