import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ClientDto } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useBackButton } from '../../hooks/useBackButton'
import { formatPrice } from '../../lib/format'

export default function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()
  useBackButton('/dashboard')

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

  // One effect handles both the initial load and search changes. Initial mount
  // (search === '') loads immediately; subsequent typing is debounced.
  // Previous version had two effects firing on mount → page flashed twice.
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
    <main className="page-enter flex flex-col px-5 pt-4 pb-10 max-w-md mx-auto w-full min-h-full">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
          <p className="text-tg-hint text-sm mt-0.5">{t('clients.subtitle')}</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => navigate('/clients/new')}
            className="px-3 py-2 rounded-xl bg-tg-button text-tg-button-text text-sm font-medium active:scale-[0.98] transition shrink-0"
          >
            + {t('clients.add')}
          </button>
        )}
      </header>

      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('clients.searchPlaceholder')}
        className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-tg-button transition mb-4"
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-tg-secondary-bg animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 mt-12 text-center">
          <p className="text-tg-destructive text-sm">{error}</p>
          <button type="button" onClick={() => load(search.trim() || undefined)} className="px-4 py-2 rounded-xl bg-tg-secondary-bg text-tg-hint text-sm">
            {t('common.retry')}
          </button>
        </div>
      ) : clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-12 px-6 text-center">
          <p className="text-tg-text font-medium">{t('clients.empty')}</p>
          <p className="text-tg-hint text-sm mt-1">{t('clients.emptyHint')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {clients.map(c => {
            const negative = c.depositBalance < 0
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-tg-secondary-bg text-left active:scale-[0.98] transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.fullName}</p>
                    <p className="text-[11px] text-tg-hint mt-0.5 truncate">
                      {c.phone ?? t('clients.noPhone')}
                      {c.loyaltyType === 'Cashback' && (
                        <span className="ml-1.5 text-tg-text">· {c.loyaltyRate}% cashback</span>
                      )}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${negative ? 'text-tg-destructive' : 'text-tg-text'}`}>
                    {formatPrice(c.depositBalance)}
                  </span>
                  <span className="text-tg-hint text-xl leading-none shrink-0">›</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
