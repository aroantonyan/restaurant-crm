import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, error, ...rest }, ref) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[13px] text-tg-hint uppercase tracking-wide px-1">{label}</span>
    <input
      ref={ref}
      {...rest}
      className="bg-tg-secondary-bg text-tg-text rounded-xl px-4 py-3 text-base
        outline-none focus:ring-2 focus:ring-tg-button transition
        scroll-mb-30"
    />
    {error && <span className="text-tg-destructive text-[13px] px-1">{error}</span>}
  </div>
))

Field.displayName = 'Field'
export default Field
