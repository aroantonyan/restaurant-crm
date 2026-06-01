// Shared UI primitives — buttons, sheets, skeletons, status pills, headers.

const { useState, useEffect, useRef } = React;

// ─── Icons ────────────────────────────────────────────────────────
const Icon = {
  Chevron:  (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  Back:     (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="15 18 9 12 15 6"/></svg>,
  Plus:     (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus:    (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  X:        (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>,
  Check:    (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  Pencil:   (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>,
  Eye:      (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  Search:   (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Filter:   (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
  Gear:     (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Home:     (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9.5 12 3l9 6.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>,
  Receipt:  (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V3z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="13" y2="16"/></svg>,
  Book:     (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  Table:    (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="12" y1="11" x2="12" y2="19"/></svg>,
  Grid:     (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
};

// ─── App header (title + back / icon button) ─────────────────────
function AppHeader({ title, subtitle, onBack, leading, trailing, large = true }) {
  return (
    <div style={{
      padding: large ? '52px 20px 12px' : '52px 16px 8px',
      display: 'flex', flexDirection: 'column', gap: 8,
      background: 'var(--bg-app)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
        {onBack && (
          <button onClick={onBack} className="tappable" aria-label="Back" style={iconBtnStyle}>
            <Icon.Back />
          </button>
        )}
        {leading && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>{leading}</div>}
        <div style={{ flex: leading ? 0 : 1 }} />
        {trailing}
      </div>
      {large && title && (
        <div style={{ padding: '4px 4px 0' }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg)' }}>
            {title}
          </h1>
          {subtitle && <p style={{ margin: '2px 0 0', fontSize: 14, color: 'var(--fg-3)' }}>{subtitle}</p>}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = {
  width: 36, height: 36, borderRadius: 999,
  background: 'rgba(15,15,16,0.05)', color: 'var(--fg-2)',
  border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─── Status pill ─────────────────────────────────────────────────
function StatusPill({ kind, children, dot = true, size = 'md' }) {
  const map = {
    ok:    { c: 'var(--ok)',     bg: 'var(--ok-soft)' },
    warn:  { c: 'var(--warn)',   bg: 'var(--warn-soft)' },
    info:  { c: 'var(--info)',   bg: 'var(--info-soft)' },
    danger:{ c: 'var(--danger)', bg: 'var(--danger-soft)' },
    muted: { c: 'var(--muted)',  bg: 'var(--muted-soft)' },
  };
  const { c, bg } = map[kind] || map.muted;
  const pad = size === 'sm' ? '3px 8px 3px 7px' : '4px 10px 4px 9px';
  const fs = size === 'sm' ? 11 : 12;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: pad, borderRadius: 999, background: bg, color: c,
      fontSize: fs, fontWeight: 600, letterSpacing: '-0.005em',
      whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 999, background: c }} />}
      {children}
    </span>
  );
}

// ─── Chip (segmented filter) ────────────────────────────────────
function Chip({ active, children, onClick, count }) {
  return (
    <button onClick={onClick} className="tappable" style={{
      padding: '9px 14px',
      borderRadius: 999,
      border: 'none',
      background: active ? 'var(--fg)' : 'var(--bg-card)',
      color: active ? '#fff' : 'var(--fg-2)',
      fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      whiteSpace: 'nowrap',
      boxShadow: active ? 'none' : 'var(--sh-card)',
    }}>
      {children}
      {count !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: active ? 'rgba(255,255,255,0.7)' : 'var(--fg-3)',
        }}>{count}</span>
      )}
    </button>
  );
}

// ─── Primary button ─────────────────────────────────────────────
function PrimaryButton({ children, onClick, disabled, full = true, kind = 'primary', size = 'md', icon }) {
  const colors = {
    primary:   { bg: 'var(--accent)', fg: '#fff' },
    neutral:   { bg: 'var(--bg-card)', fg: 'var(--fg)' },
    soft:      { bg: 'var(--accent-soft)', fg: 'var(--accent-press)' },
    danger:    { bg: 'var(--danger)', fg: '#fff' },
    dangerSoft:{ bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  };
  const c = colors[kind];
  const py = size === 'sm' ? 10 : size === 'lg' ? 16 : 14;
  return (
    <button onClick={onClick} disabled={disabled} className="tappable" style={{
      width: full ? '100%' : 'auto',
      padding: `${py}px 18px`,
      borderRadius: 14,
      border: 'none',
      background: c.bg, color: c.fg,
      fontSize: size === 'sm' ? 14 : 15.5, fontWeight: 600,
      letterSpacing: '-0.005em',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: disabled ? 0.5 : 1,
      boxShadow: kind === 'neutral' ? 'var(--sh-card)' : 'none',
    }}>
      {icon}{children}
    </button>
  );
}

// ─── Bottom sheet ───────────────────────────────────────────────
function Sheet({ open, onClose, title, children, height = 'auto' }) {
  if (!open) return null;
  return (
    <div className="backdrop-in" onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 80,
      background: 'var(--bg-overlay)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} className="sheet-in" style={{
        width: '100%', background: 'var(--bg-card)',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: '12px 20px 28px',
        boxShadow: 'var(--sh-sheet)',
        maxHeight: height === 'tall' ? '88%' : '78%',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'var(--line-strong)' }} />
        </div>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</h3>
            <button onClick={onClose} className="tappable" style={iconBtnStyle} aria-label="Close">
              <Icon.X />
            </button>
          </div>
        )}
        <div style={{ overflow: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Skeleton building blocks ───────────────────────────────────
function Skel({ w = '100%', h = 14, r = 8, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function SkeletonRow() {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 20, padding: 'var(--card-py)',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: 'var(--sh-card)',
    }}>
      <Skel w={44} h={44} r={14} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skel w="55%" h={13} />
        <Skel w="38%" h={11} />
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────
function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="page-enter" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 8, padding: '60px 20px', textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 20, background: 'var(--bg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, marginBottom: 6,
      }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--fg)' }}>{title}</p>
      {hint && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-3)', maxWidth: 260 }}>{hint}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ─── Bottom tab bar ─────────────────────────────────────────────
function TabBar({ active, onTab }) {
  const tabs = [
    { key: 'orders', label: 'Orders',  icon: Icon.Receipt },
    { key: 'menu',   label: 'Menu',    icon: Icon.Book },
    { key: 'tables', label: 'Tables',  icon: Icon.Table },
    { key: 'home',   label: 'Home',    icon: Icon.Grid },
  ];
  return (
    <div style={{
      flexShrink: 0,
      padding: '8px 12px 26px',
      background: 'var(--bar-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid var(--line)',
      display: 'flex', gap: 4,
    }}>
      {tabs.map(t => {
        const isActive = active === t.key;
        const TabIcon = t.icon;
        return (
          <button key={t.key} onClick={() => onTab(t.key)} className="tappable" style={{
            flex: 1, border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 4px',
            color: isActive ? 'var(--accent)' : 'var(--fg-3)',
          }}>
            <TabIcon />
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Hook: simulate first-load skeleton flash + page transition
function useLoad(deps = [], delay = 520) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, deps);
  return loading;
}

// ─── Sticky bottom action bar (always visible above content) ────
// Use for primary screen actions: "Add item to X", "Close & pay", etc.
// Sits absolutely positioned at bottom of the scroll container (.app), above
// the tab bar (which slots in below it).
function StickyActions({ children, hint, dense = false }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: dense ? '10px 16px 14px' : '12px 16px 18px',
      background: 'var(--bar-bg)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid var(--line)',
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 30,
    }}>
      {hint && <div style={{ fontSize: 12, color: 'var(--fg-3)', textAlign: 'center' }}>{hint}</div>}
      {children}
    </div>
  );
}

Object.assign(window, {
  Icon, AppHeader, StatusPill, Chip, PrimaryButton, Sheet,
  Skel, SkeletonRow, EmptyState, TabBar, useLoad, iconBtnStyle,
  StickyActions,
});
