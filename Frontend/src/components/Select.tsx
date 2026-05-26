import { forwardRef } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface Props extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  options: SelectOption[]
  error?: string
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, options, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11.5px] text-fg-3 uppercase font-bold px-1" style={{ letterSpacing: '0.06em' }}>
        {label}
      </span>
      <select
        ref={ref}
        {...props}
        className={`w-full rounded-2xl bg-card px-4 py-3.5 text-base text-fg outline-none
          border border-line focus:border-accent appearance-none cursor-pointer transition ${className ?? ''}`}
        style={{ boxShadow: '0 1px 0 rgba(15,15,16,.04), 0 1px 3px rgba(15,15,16,.05)' }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="text-danger text-[13px] px-1">{error}</span>}
    </div>
  )
)

Select.displayName = 'Select'
export default Select
