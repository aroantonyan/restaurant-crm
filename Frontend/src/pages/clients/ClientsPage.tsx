import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ClientDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { formatPrice } from '../../lib/format'
import AppHeader from '../../components/AppHeader'
import { SkeletonRow } from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { UserRound } from 'lucide-react'

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()

  const canManage = perm.has('ManageClients')

  const [clients, setClients] = useState<ClientDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = async (q?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.clients.getAll(q ? { search: q } : undefined)
      setClients(data)
    } catch {
      setError(t('clients.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (search === '') {
      load()
      return
    }
    const handle = setTimeout(() => load(search.trim()), 300)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  return (
    <main className="page-enter h-full overflow-y-auto pb-7">
      <AppHeader
        onBack={() => navigate('/dashboard')}
        title={t('clients.title')}
        subtitle={t('clients.subtitle')}
        trailing={canManage ? (
          <button
            type="button"
            onClick={() => navigate('/clients/new')}
            aria-label={t('clients.add')}
            className="w-9 h-9 rounded-full bg-accent text-white border-0 flex items-center justify-center tappable"
          >
            <PlusIcon />
          </button>
        ) : undefined}
      />

      <div className="px-5 pb-3">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('clients.searchPlaceholder')}
          className="w-full bg-card text-fg rounded-2xl px-4 py-3.5 text-base outline-none border border-line focus:border-accent transition"
          style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
        />
      </div>

      <div className="px-5 flex flex-col gap-2">
        {loading ? (
          <>{[0, 1, 2].map(i => <SkeletonRow key={i} />)}</>
        ) : error ? (
          <div className="rounded-[18px] bg-card py-8 text-center"
               style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}>
            <p className="m-0 text-sm text-danger mb-3">{error}</p>
            <button onClick={() => load(search.trim() || undefined)}
                    className="px-4 py-2 rounded-xl bg-muted text-fg-2 text-sm font-semibold tappable border-0">
              {t('common.retry')}
            </button>
          </div>
        ) : clients.length === 0 ? (
          <EmptyState icon={UserRound} title={t('clients.empty')} hint={t('clients.emptyHint')} />
        ) : (
          clients.map((c, idx) => {
            const negative = c.depositBalance < 0
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate(`/clients/${c.id}`)}
                className="tappable item-enter w-full bg-card border-0 rounded-[18px] py-3 px-3.5 flex items-center gap-3 text-left"
                style={{
                  animationDelay: `${idx * 30}ms`,
                  boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)',
                }}
              >
                <div className="w-10 h-10 rounded-full bg-muted text-fg-2 font-bold flex items-center justify-center shrink-0">
                  {(c.fullName?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="m-0 text-[15px] font-semibold truncate" style={{ letterSpacing: '-0.005em' }}>
                    {c.fullName}
                  </p>
                  <p className="m-0 mt-0.5 text-[12.5px] text-fg-3 truncate">
                    {c.phone ?? t('clients.noPhone')}
                    {c.loyaltyType === 'Cashback' && (
                      <span className="ml-1.5 text-fg-2">· {c.loyaltyRate}% cashback</span>
                    )}
                  </p>
                </div>
                <span className={`shrink-0 text-[14px] font-bold tabular-nums ${negative ? 'text-danger' : 'text-fg'}`}>
                  {formatPrice(c.depositBalance)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </main>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
