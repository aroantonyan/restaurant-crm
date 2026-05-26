import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'hy', label: 'ՀԱՅ' },
] as const

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <div className="flex gap-1.5">
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full tappable border-0 transition
            ${i18n.resolvedLanguage === code
              ? 'bg-accent text-white'
              : 'bg-muted text-fg-2'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
