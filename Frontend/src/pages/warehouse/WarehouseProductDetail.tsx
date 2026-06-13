import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { api, ApiError, type ProductDto, type StockMovementDto, type StockMovementType } from '../../lib/api'
import { usePermissions } from '../../hooks/usePermissions'
import { useRealtimeEvent } from '../../hooks/useRealtimeEvent'
import { formatQuantity } from '../../lib/format'
import Field from '../../components/Field'
import SubmitButton from '../../components/SubmitButton'
import Portal from '../../components/Portal'
import AppHeader from '../../components/AppHeader'

type MovementInput = 'Purchase' | 'Adjustment' | 'Wastage'

// Units counted as whole, indivisible things — no fractional or zero quantities.
const DISCRETE_UNITS = new Set(['Piece', 'Gram', 'Milliliter'])

const MOVEMENT_STYLES: Record<StockMovementType, { dot: string; text: string }> = {
  Initial:    { dot: 'bg-fg-3',     text: 'text-fg-3'    },
  Purchase:   { dot: 'bg-green-500',   text: 'text-green-600'  },
  Adjustment: { dot: 'bg-blue-500',    text: 'text-blue-600'   },
  Wastage:    { dot: 'bg-amber-500',   text: 'text-amber-600'  },
  Sale:       { dot: 'bg-purple-500',  text: 'text-purple-600' },
}

// ---- Add-movement modal ----

interface MovementModalProps {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}

function AddMovementModal({ product, onClose, onSaved }: MovementModalProps) {
  const { t } = useTranslation()
  const [serverError, setServerError] = useState<string | null>(null)
  const [type, setType] = useState<MovementInput>('Purchase')

  // Quantity sign is normalized by the chosen Type at submit time.
  // Purchase/Adjustment store a positive input as +; Wastage stores it as −.
  // Adjustment also supports a "remove" mode for shrinkage corrections.
  const [adjustmentDirection, setAdjustmentDirection] = useState<'add' | 'remove'>('add')

  const isDiscrete = DISCRETE_UNITS.has(product.unit)

  const schema = z.object({
    quantity: (() => {
      // Always positive (sign is applied by movement type). Discrete units (pieces,
      // grams, ml) must be whole numbers — you can't have 0.5 of a piece.
      let n = z.number({ error: t('auth.errors.required') }).positive({ error: t('warehouse.errors.positiveQty') })
      if (isDiscrete) n = n.int({ error: t('warehouse.errors.wholeQty') })
      return n
    })(),
    reason: z.string().max(500, { error: t('auth.errors.tooLong') }).optional().or(z.literal('')),
  })
  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError(null)
    try {
      const sign =
        type === 'Purchase' ? 1 :
        type === 'Wastage'  ? -1 :
        adjustmentDirection === 'add' ? 1 : -1

      await api.products.addMovement(product.id, {
        type,
        quantityChange: data.quantity * sign,
        reason: data.reason || null,
      })
      onSaved()
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : t('warehouse.errors.saveFailed'))
    }
  }

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-in" onClick={onClose} style={{ paddingBottom: 'var(--keyboard-offset, 0px)', transition: 'padding-bottom 180ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="bg-bg rounded-t-3xl px-5 pt-6 pb-10 max-h-[88dvh] overflow-y-auto sheet-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{t('warehouse.addMovement')}</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-card text-fg-3 text-xl leading-none">×</button>
        </div>

        {/* Movement type — three big tappable cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {(['Purchase', 'Adjustment', 'Wastage'] as MovementInput[]).map(opt => {
            const active = type === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setType(opt)}
                className={[
                  'py-3 rounded-xl text-xs font-semibold transition',
                  active ? 'bg-accent text-white' : 'bg-card text-fg-3',
                ].join(' ')}
              >
                {t(`warehouse.movementType.${opt}`)}
              </button>
            )
          })}
        </div>

        {/* Adjustment direction toggle — only relevant when type is Adjustment */}
        {type === 'Adjustment' && (
          <div className="flex gap-2 mb-4">
            {(['add', 'remove'] as const).map(d => {
              const active = adjustmentDirection === d
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setAdjustmentDirection(d)}
                  className={[
                    'flex-1 py-2 rounded-xl text-xs font-medium transition',
                    active ? 'bg-accent text-white' : 'bg-card text-fg-3',
                  ].join(' ')}
                >
                  {t(`warehouse.direction.${d}`)}
                </button>
              )
            })}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field
            label={`${t('warehouse.quantity')} (${formatQuantity(0, product.unit).split(' ')[1]})`}
            type="number"
            inputMode={isDiscrete ? 'numeric' : 'decimal'}
            step={isDiscrete ? '1' : '0.001'}
            min="0"
            enterKeyHint="next"
            autoFocus
            {...register('quantity', { valueAsNumber: true })}
            error={errors.quantity?.message}
          />

          <Field
            label={t('warehouse.reason')}
            enterKeyHint="done"
            placeholder={t(`warehouse.reasonPlaceholder.${type}`)}
            {...register('reason')}
            error={errors.reason?.message}
          />

          <div className="text-xs text-fg-3 px-1">
            {t('warehouse.currentStock')}: <span className="text-fg font-medium tabular-nums">{formatQuantity(product.currentStock, product.unit)}</span>
          </div>

          {serverError && <p className="text-danger text-sm text-center">{serverError}</p>}
          <SubmitButton loading={isSubmitting}>{t('warehouse.recordMovement')}</SubmitButton>
        </form>
      </div>
    </div>
    </Portal>
  )
}

// ---- Detail page ----

export default function WarehouseProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const perm = usePermissions()

  const canManage = perm.has('ManageWarehouse')

  const [product, setProduct] = useState<ProductDto | null>(null)
  const [movements, setMovements] = useState<StockMovementDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addingMovement, setAddingMovement] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [confirmingArchive, setConfirmingArchive] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [p, m] = await Promise.all([
        api.products.getById(id),
        api.products.getMovements(id, 50),
      ])
      setProduct(p)
      setMovements(m)
    } catch {
      setError(t('warehouse.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useRealtimeEvent<{ productId: string }>('productChanged', payload => {
    if (payload.productId === id) load()
  })

  const handleArchive = async () => {
    if (!product) return
    setArchiving(true)
    try {
      await api.products.archive(product.id)
      navigate('/warehouse')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('warehouse.errors.saveFailed'))
    } finally {
      setArchiving(false)
    }
  }

  if (loading) {
    return (
      <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
        <div className="h-7 w-40 bg-card rounded animate-pulse mb-3" />
        <div className="h-24 rounded-2xl bg-card animate-pulse mb-4" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-card animate-pulse" />)}
        </div>
      </main>
    )
  }

  if (error || !product) {
    return (
      <main className="page-enter h-full overflow-y-auto px-5 pt-6 pb-10">
        <p className="text-danger text-sm">{error ?? t('warehouse.errors.loadFailed')}</p>
        <button
          type="button"
          onClick={load}
          className="mt-3 px-4 py-2 rounded-xl bg-card text-fg-3 text-sm"
        >
          {t('common.retry')}
        </button>
      </main>
    )
  }

  return (
    <main className="page-enter h-full overflow-y-auto pb-10">
      <AppHeader
        onBack={() => navigate('/warehouse')}
        title={product.name}
        subtitle={`${product.category ?? t('warehouse.uncategorized')} · ${t(`warehouse.units.${product.unit}`)}`}
        trailing={canManage ? (
          <button
            type="button"
            onClick={() => navigate(`/warehouse/${product.id}/edit`)}
            className="text-accent text-sm font-semibold shrink-0 active:opacity-60 transition px-1"
          >
            {t('warehouse.edit')}
          </button>
        ) : undefined}
      />

      <div className="px-5">
      {/* Stock summary card */}
      <div className="rounded-2xl bg-card px-5 py-4 mb-4">
        <p className="text-[11px] text-fg-3 uppercase tracking-wide font-medium">{t('warehouse.currentStock')}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className={`text-3xl font-bold tabular-nums ${product.isLowStock ? 'text-danger' : 'text-fg'}`}>
            {formatQuantity(product.currentStock, product.unit)}
          </p>
          {product.isLowStock && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-danger/10 text-danger">
              {t('warehouse.low')}
            </span>
          )}
        </div>
        <p className="text-xs text-fg-3 mt-1">
          {t('warehouse.minLabel')} {formatQuantity(product.lowStockThreshold, product.unit)}
        </p>
        {product.notes && <p className="text-sm text-fg mt-3">{product.notes}</p>}
      </div>

      {canManage && (
        <button
          type="button"
          onClick={() => setAddingMovement(true)}
          className="w-full mb-5 py-3 rounded-xl bg-accent text-white font-semibold active:scale-[0.98] transition"
        >
          + {t('warehouse.addMovement')}
        </button>
      )}

      {/* Movements log */}
      <h2 className="text-xs text-fg-3 uppercase tracking-wider font-medium mb-2 px-1">{t('warehouse.history')}</h2>
      {movements.length === 0 ? (
        <p className="text-sm text-fg-3 px-1">{t('warehouse.noMovements')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {movements.map(m => {
            const style = MOVEMENT_STYLES[m.type]
            const positive = m.quantityChange > 0
            return (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card">
                <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    <span className={style.text}>{t(`warehouse.movementType.${m.type}`)}</span>
                    {m.reason && <span className="text-fg-3"> · {m.reason}</span>}
                  </p>
                  <p className="text-[11px] text-fg-3 tabular-nums mt-0.5">
                    {new Date(m.createdAt).toLocaleString()}
                    <span className="mx-1">·</span>
                    {m.createdByName}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-semibold tabular-nums ${positive ? 'text-green-600' : 'text-danger'}`}>
                    {positive ? '+' : ''}{formatQuantity(m.quantityChange, product.unit)}
                  </p>
                  <p className="text-[11px] text-fg-3 tabular-nums">
                    → {formatQuantity(m.quantityAfter, product.unit)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Archive — destructive, separated */}
      {canManage && (
        <div className="mt-8 pt-5 border-t border-line">
          {!confirmingArchive ? (
            <button
              type="button"
              onClick={() => setConfirmingArchive(true)}
              className="w-full py-3 rounded-xl text-danger text-sm font-medium active:bg-card transition"
            >
              {t('warehouse.archive')}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-fg-3 text-center">{t('warehouse.archiveHint')}</p>
              <button
                type="button"
                onClick={handleArchive}
                disabled={archiving}
                className="w-full py-3 rounded-xl bg-danger/10 text-danger font-semibold active:scale-[0.98] transition disabled:opacity-50"
              >
                {archiving ? t('common.loading') : t('warehouse.archiveConfirm')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingArchive(false)}
                className="w-full py-2.5 rounded-xl bg-card text-fg-3 text-sm"
              >
                {t('warehouse.cancel')}
              </button>
            </div>
          )}
        </div>
      )}
      </div>

      {addingMovement && (
        <AddMovementModal
          product={product}
          onClose={() => setAddingMovement(false)}
          onSaved={() => { setAddingMovement(false); load() }}
        />
      )}
    </main>
  )
}
