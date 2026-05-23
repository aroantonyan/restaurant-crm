import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type TableDto } from '../../../lib/api'
import { useBackButton } from '../../../hooks/useBackButton'
import { useOrderDraft } from './OrderDraftContext'
import StepHeader from './StepHeader'

export default function SelectTablePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const draft = useOrderDraft()
  useBackButton('/orders')

  const [tables, setTables] = useState<TableDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.tables.getAll()
      .then(setTables)
      .catch(e => setError(e instanceof ApiError ? e.message : t('orders.errors.loadFailed')))
      .finally(() => setLoading(false))
  }, [t])

  const onPick = (table: TableDto) => {
    if (table.status !== 'Free') return
    draft.setTable(table)
    navigate('/orders/new/menu')
  }

  return (
    <main className="page-enter flex flex-col px-5 pt-6 pb-10 max-w-md mx-auto w-full min-h-full">
      <StepHeader step={1} />
      <p className="text-tg-hint text-sm mb-4">{t('orders.selectTable')}</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-tg-secondary-bg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-tg-destructive text-sm">{error}</p>
      ) : tables.length === 0 ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-tg-secondary-bg flex items-center justify-center text-3xl mb-2">🪑</div>
          <p className="text-tg-text font-medium">{t('tables.noTables')}</p>
          <p className="text-tg-hint text-sm">{t('tables.noTablesHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tables.map(table => {
            const free = table.status === 'Free'
            const active = draft.table?.id === table.id
            return (
              <button
                key={table.id}
                type="button"
                disabled={!free}
                onClick={() => onPick(table)}
                className={[
                  'flex flex-col items-center justify-center h-20 rounded-2xl font-semibold transition active:scale-[0.98]',
                  active
                    ? 'bg-tg-button text-tg-button-text ring-2 ring-tg-button-text/30'
                    : free
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-secondary-bg text-tg-hint opacity-50 cursor-not-allowed',
                ].join(' ')}
              >
                <span className="text-lg">{table.number}</span>
                <span className="text-xs mt-0.5">{t(`tables.status.${table.status}`)}</span>
              </button>
            )
          })}
        </div>
      )}
    </main>
  )
}
