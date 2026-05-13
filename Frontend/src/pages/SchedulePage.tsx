import { useTranslation } from 'react-i18next'
import { useBackButton } from '../hooks/useBackButton'

export default function SchedulePage() {
  const { t } = useTranslation()
  useBackButton()

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.tabs.schedule')}</h1>
      </header>
      <div className="flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl bg-tg-secondary-bg">
        <p className="text-base font-medium">{t('dashboard.schedule.empty')}</p>
        <p className="text-tg-hint text-sm mt-2">{t('dashboard.schedule.comingSoon')}</p>
      </div>
    </main>
  )
}
