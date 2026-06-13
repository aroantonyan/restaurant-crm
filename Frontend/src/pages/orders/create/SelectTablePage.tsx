import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type TableDto } from '../../../lib/api'
import { useOrderDraft } from './OrderDraftContext'
import StatusPill from '../../../components/StatusPill'
import StepHeader from './StepHeader'
import EmptyState from '../../../components/EmptyState'
import { Armchair } from 'lucide-react'

function tableKind(status: string): 'ok' | 'warn' | 'info' | 'muted' {
  if (status === 'Free')     return 'ok'
  if (status === 'Occupied') return 'warn'
  if (status === 'Reserved') return 'info'
  return 'muted'
}

export default function SelectTablePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const draft = useOrderDraft()

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
    <main className="page-enter h-full overflow-y-auto pb-8">
      <StepHeader step={1} subtitle={t('orders.step.pickTable')} backTo="/orders" />

      <div className="px-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-[110px] rounded-2xl bg-card animate-pulse"
                   style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }} />
            ))}
          </div>
        ) : error ? (
          <p className="m-0 text-sm text-danger">{error}</p>
        ) : tables.length === 0 ? (
          <EmptyState icon={Armchair} title={t('tables.noTables')} hint={t('tables.noTablesHint')} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {tables.map((table, idx) => {
              const free   = table.status === 'Free'
              const active = draft.table?.id === table.id
              return (
                <button
                  key={table.id}
                  type="button"
                  disabled={!free}
                  onClick={() => onPick(table)}
                  className={`item-enter tappable border-0 rounded-2xl px-3.5 py-3.5 flex flex-col gap-1.5 text-left
                    ${active ? 'bg-accent text-white' : 'bg-card'}
                    ${!free ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    animationDelay: `${idx * 30}ms`,
                    boxShadow: active
                      ? '0 10px 24px -8px rgba(217,99,63,.35), 0 1px 3px rgba(15,15,16,.06)'
                      : '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold uppercase ${active ? 'text-white/70' : 'text-fg-3'}`}
                          style={{ letterSpacing: '0.06em' }}>
                      {t('tables.label', { defaultValue: 'Table' })}
                    </span>
                    <StatusPill kind={tableKind(table.status)} size="sm">
                      {t(`tables.status.${table.status}`)}
                    </StatusPill>
                  </div>
                  <p className={`m-0 text-[32px] font-bold tabular-nums ${active ? 'text-white' : 'text-fg'}`}
                     style={{ letterSpacing: '-0.02em' }}>
                    {table.number}
                  </p>
                  <p className={`m-0 text-xs ${active ? 'text-white/70' : 'text-fg-3'}`}>
                    {t('orders.seatsCount', { count: table.capacity })}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
