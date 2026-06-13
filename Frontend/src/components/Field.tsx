import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const Field = forwardRef<HTMLInputElement, FieldProps>(({ label, error, className, onWheel, ...rest }, ref) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[11.5px] text-fg-3 uppercase font-bold px-1" style={{ letterSpacing: '0.06em' }}>
      {label}
    </span>
    <input
      ref={ref}
      {...rest}
      // Number inputs change value on scroll/trackpad by default — surprising on
      // mobile and easy to trigger accidentally. Blur on wheel so the value only
      // changes by typing. Still honors any caller-supplied onWheel first.
      onWheel={e => {
        onWheel?.(e)
        if (e.currentTarget.type === 'number') e.currentTarget.blur()
      }}
      className={`bg-card text-fg rounded-2xl px-4 py-3.5 text-base outline-none scroll-mb-30
        border border-line focus:border-accent transition ${className ?? ''}`}
      style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
    />
    {error && <span className="text-danger text-[13px] px-1">{error}</span>}
  </div>
))

Field.displayName = 'Field'
export default Field
