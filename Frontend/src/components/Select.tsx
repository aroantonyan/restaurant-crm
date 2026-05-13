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
      <span className="text-[13px] text-tg-hint uppercase tracking-wide px-1">{label}</span>
      <select
        ref={ref}
        {...props}
        className={`w-full rounded-xl bg-tg-secondary-bg px-4 py-3 text-base text-tg-text
          outline-none focus:ring-2 focus:ring-tg-button transition
          appearance-none cursor-pointer ${className ?? ''}`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-tg-destructive text-[13px] px-1">{error}</span>}
    </div>
  )
)

Select.displayName = 'Select'
export default Select
