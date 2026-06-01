# Screen — Settings (Restaurant)

**Source page**: `src/pages/SettingsPage.tsx`
**Prototype reference**: `ScreenSettings` in `prototype/screens-extra.jsx`

## Layout

- AppHeader: "Restaurant" + "Profile & preferences"
- Three sections, each: tiny section title + grouped white card with form rows inside (gap-3.5)
  - **Identity**: Restaurant name, Currency (select)
  - **Contact**: Address, Phone
  - **Preferences**: Three iOS-style toggle rows (Telegram notifications, Print order tickets, Charge service automatically)

## FieldLabel component

```tsx
<label className="flex flex-col gap-1.5">
  <span className="text-[11.5px] font-bold uppercase text-fg-3 tracking-[0.06em]">{label}</span>
  {children}
</label>
```

Input style:
```tsx
<input className="text-base border border-line bg-bg rounded-xl px-3.5 py-3 w-full outline-none focus:border-accent focus:bg-white transition-colors" />
```

## iOS toggle

```tsx
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full p-0 bg-transparent border-0 flex items-center justify-between tappable">
      <span className="text-sm font-medium text-fg">{label}</span>
      <span className={`relative w-[42px] h-[26px] rounded-full transition-colors ${value ? 'bg-accent' : 'bg-muted'}`}>
        <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-[left] duration-200"
          style={{ left: value ? 19 : 3 }} />
      </span>
    </button>
  )
}
```

## Sticky CTA

"Save changes" — primary.
