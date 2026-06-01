import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ClientDto } from '../lib/api'
import { formatPrice } from '../lib/format'
import Sheet from './Sheet'

interface Props {
  open: boolean
  currentClientId: string | null
  onClose: () => void
  onPick: (client: ClientDto | null) => void
}

/**
 * Searchable customer picker. Used both when assigning a client to an open order
 * and when attaching one to a new order before it's sent to the kitchen.
 * Returns the full ClientDto (or null to unassign) so callers can read loyalty
 * and balance without an extra fetch.
 */
export default function ClientPickerSheet({ open, currentClientId, onClose, onPick }: Props) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<ClientDto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    const handle = setTimeout(() => {
      setLoading(true)
      api.clients.getAll(search ? { search } : undefined)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(handle)
  }, [search, open])

  return (
    <Sheet open={open} onClose={onClose} title={t('orders.client.title')} height="tall">
      <input
        type="search"
        autoFocus
        placeholder={t('clients.searchPlaceholder')}
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="bg-muted text-fg rounded-xl px-4 py-3 text-base outline-none w-full mb-3"
      />

      {currentClientId && (
        <button
          type="button"
          onClick={() => onPick(null)}
          className="w-full mb-3 py-3 rounded-xl bg-danger-soft text-danger font-semibold tappable border-0"
        >
          × {t('orders.client.unassign')}
        </button>
      )}

      <div className="flex flex-col gap-2">
        {loading ? (
          <p className="m-0 text-sm text-fg-3 text-center py-4">{t('common.loading')}</p>
        ) : results.length === 0 ? (
          <p className="m-0 text-sm text-fg-3 text-center py-4">{t('clients.empty')}</p>
        ) : results.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c)}
            className="tappable border-0 flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-bg text-left"
          >
            <div className="flex-1 min-w-0">
              <p className="m-0 text-sm font-semibold truncate">{c.fullName}</p>
              <p className="m-0 mt-0.5 text-[11px] text-fg-3 truncate">
                {c.loyaltyType === 'Cashback' && c.loyaltyRate > 0
                  ? t('clients.cashbackBadge', { rate: c.loyaltyRate })
                  : (c.phone ?? t('clients.noPhone'))}
              </p>
            </div>
            <span className={`text-sm font-semibold tabular-nums ${c.depositBalance < 0 ? 'text-danger' : 'text-fg'}`}>
              {formatPrice(c.depositBalance)}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
