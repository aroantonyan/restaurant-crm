// All screens for the redesigned Restaurant CRM prototype.
// Reads from window.MOCK; navigates via the `nav` prop (set in app.jsx).

const { useState, useEffect, useMemo } = React;

// ════════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════════
function ScreenDashboard({ nav }) {
  const { session } = window.MOCK;
  const initial = session.firstName[0];

  // "Today" stays as rich rows (live state, primary actions).
  // "More" is a compact 4-column tile grid — everything else, one tap away,
  // no scroll needed. This is the iOS launcher pattern.
  const today = [
    { key: 'orders',  label: 'Orders',       icon: '📝', desc: '3 open, 1 paid today', tint: '#FBEDE3', go: 'orders' },
    { key: 'menu',    label: 'Menu',         icon: '🍽️', desc: '6 categories, 19 items', tint: '#EAF2EC', go: 'menu' },
    { key: 'tables',  label: 'Tables',       icon: '🪑', desc: '4 occupied · 4 free',   tint: '#E6EEFB', go: 'tables' },
    { key: 'reserv',  label: 'Reservations', icon: '📅', desc: 'Next at 19:30',          tint: '#F2E7F1', go: 'reservations' },
  ];
  const more = [
    { key: 'cash',     label: 'Cash',     icon: '💵', go: 'cash' },
    { key: 'reports',  label: 'Reports',  icon: '📊', go: 'reports' },
    { key: 'warehouse',label: 'Stock',    icon: '📦', go: 'warehouse' },
    { key: 'clients',  label: 'Clients',  icon: '👤', go: 'clients' },
    { key: 'staff',    label: 'Staff',    icon: '👥', go: 'staff' },
    { key: 'schedule', label: 'Schedule', icon: '🗓️', go: 'schedule' },
    { key: 'settings', label: 'Settings', icon: '⚙️', go: 'settings' },
    { key: 'audit',    label: 'Activity', icon: '🔍', go: 'activity' },
  ];

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 20 }}>
      {/* Greeting header */}
      <div style={{ padding: '52px 20px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, letterSpacing: '-0.01em',
          }}>{initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg-3)' }}>Good evening,</p>
            <p style={{ margin: '1px 0 0', fontSize: 17, fontWeight: 700, letterSpacing: '-0.015em' }}>
              {session.firstName} · <span style={{ color: 'var(--fg-3)', fontWeight: 500 }}>{session.roleName}</span>
            </p>
          </div>
          <button onClick={() => nav('login')} className="tappable" style={iconBtnStyle} aria-label="Account">
            <Icon.Gear />
          </button>
        </div>

        {/* Live snapshot card */}
        <div className="item-enter" style={{
          marginTop: 16, padding: 14, borderRadius: 18,
          background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
          display: 'flex', gap: 0,
        }}>
          <SnapStat label="Open orders" value="3" tint="info" />
          <Divider />
          <SnapStat label="Today rev." value="46 200 ֏" tint="ok" />
          <Divider />
          <SnapStat label="Tables free" value="4/10" tint="muted" />
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        {/* Today — rich rows */}
        <section>
          <p style={dashSectionTitle}>Today</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
            {today.map((it, idx) => (
              <button
                key={it.key}
                onClick={() => nav(it.go)}
                className="tappable item-enter"
                style={{
                  animationDelay: `${idx * 30}ms`,
                  width: '100%', padding: '13px 14px',
                  background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
                  border: 'none', borderRadius: 18,
                  display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: it.tint || 'var(--bg-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}>{it.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>{it.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{it.desc}</p>
                </div>
                <span style={{ color: 'var(--fg-4)', flexShrink: 0 }}><Icon.Chevron /></span>
              </button>
            ))}
          </div>
        </section>

        {/* More — compact tile grid, everything reachable without scroll */}
        <section>
          <p style={dashSectionTitle}>More</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {more.map((it, idx) => (
              <button
                key={it.key}
                onClick={() => nav(it.go)}
                className="tappable item-enter"
                style={{
                  animationDelay: `${(idx + 4) * 30}ms`,
                  padding: '12px 6px 10px', border: 'none',
                  background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
                  borderRadius: 16,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6,
                }}>
                <span style={{ fontSize: 22 }}>{it.icon}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--fg-2)', letterSpacing: '-0.005em' }}>
                  {it.label}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const dashSectionTitle = {
  margin: '0 4px 10px', fontSize: 11.5, fontWeight: 700,
  color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
};

function SnapStat({ label, value, tint }) {
  const c = tint === 'info' ? 'var(--info)' : tint === 'ok' ? 'var(--ok)' : 'var(--fg)';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500, letterSpacing: '-0.005em' }}>{label}</span>
      <span style={{ fontSize: 17, color: c, fontWeight: 700, letterSpacing: '-0.015em' }}>{value}</span>
    </div>
  );
}
function Divider() {
  return <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 14px' }} />;
}

// ════════════════════════════════════════════════════════════════
// ORDERS LIST
// ════════════════════════════════════════════════════════════════
function ScreenOrders({ nav }) {
  const { orders, fmt, total, formatTime, elapsed } = window.MOCK;
  const [filter, setFilter] = useState('Open');
  const loading = useLoad([], 500);

  const counts = useMemo(() => ({
    all: orders.length,
    Open: orders.filter(o => o.status === 'Open').length,
    Paid: orders.filter(o => o.status === 'Paid').length,
    Cancelled: orders.filter(o => o.status === 'Cancelled').length,
  }), [orders]);

  const visible = filter === 'all' ? orders : orders.filter(o => o.status === filter);

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 28 }}>
      <AppHeader
        title="Orders"
        subtitle={`${counts.Open} active right now`}
        trailing={
          <button className="tappable" onClick={() => nav('new-order')} aria-label="New order" style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.Plus /></button>
        }
      />

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 20px 14px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {[
          { k: 'Open', label: 'Open' },
          { k: 'Paid', label: 'Paid' },
          { k: 'Cancelled', label: 'Cancelled' },
          { k: 'all', label: 'All' },
        ].map(f => (
          <Chip key={f.k} active={filter === f.k} onClick={() => setFilter(f.k)} count={counts[f.k]}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? (
          [0,1,2,3].map(i => <SkeletonRow key={i} />)
        ) : visible.length === 0 ? (
          <EmptyState icon="📭" title="Nothing here" hint="Filter shows no orders. Try Open or All." />
        ) : visible.map((o, idx) => {
          const t = total(o);
          const itemCount = o.items.reduce((s, i) => s + i.quantity, 0);
          const statusKind =
            o.status === 'Open' ? 'info' :
            o.status === 'Paid' ? 'ok' :
            o.status === 'Cancelled' ? 'muted' : 'muted';
          const allReady = o.items.every(i => i.status === 'Ready' || i.status === 'Served');
          return (
            <button
              key={o.id}
              onClick={() => nav('order-detail', o.id)}
              className="tappable item-enter"
              style={{
                animationDelay: `${idx * 35}ms`,
                width: '100%', padding: '14px 16px',
                background: 'var(--bg-card)', borderRadius: 18, border: 'none', textAlign: 'left',
                boxShadow: 'var(--sh-card)',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
              {/* top row: table no. + status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 12,
                  background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 15, color: 'var(--fg-2)',
                  letterSpacing: '-0.01em',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--fg-4)', marginRight: 1 }}>№</span>
                  {o.tableNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>
                    Table {o.tableNumber}
                    {o.clientName && (
                      <span style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 500, marginLeft: 6 }}>· {o.clientName.split(' ')[0]}</span>
                    )}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                    {itemCount} item{itemCount > 1 ? 's' : ''} · {o.createdBy} · {elapsed(o.createdAt)}
                  </p>
                </div>
                <StatusPill kind={statusKind} size="sm">
                  {o.status === 'Open' && allReady ? 'Ready' : o.status}
                </StatusPill>
              </div>
              {/* bottom row: items preview + total */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--fg-3)' }} className="clamp-1">
                  {o.items.map(i => i.menuItemName).join(', ')}
                </p>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.01em', flexShrink: 0, marginLeft: 12 }}>
                  {fmt(t)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ORDER DETAIL
// ════════════════════════════════════════════════════════════════
function ScreenOrderDetail({ nav, orderId }) {
  const { orders, fmt, total, formatTime } = window.MOCK;
  const loading = useLoad([orderId], 360);
  const [paying, setPaying] = useState(false);
  const [tickItem, setTickItem] = useState(null);
  const order = orders.find(o => o.id === orderId) || orders[0];
  const [items, setItems] = useState(order.items);

  useEffect(() => { setItems(order.items); }, [order.id]);

  const ITEM_STATUSES = ['Pending', 'Preparing', 'Ready', 'Served'];
  const cycleStatus = (id) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const next = ITEM_STATUSES[(ITEM_STATUSES.indexOf(it.status) + 1) % ITEM_STATUSES.length];
      return { ...it, status: next };
    }));
    setTickItem(id);
    setTimeout(() => setTickItem(null), 280);
  };

  const grand = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const isOpen = order.status === 'Open';

  return (
    <div className="page-enter scroll" style={{ paddingBottom: isOpen ? 140 : 28 }}>
      <AppHeader
        onBack={() => nav('orders')}
        title={`Table ${order.tableNumber}`}
        subtitle={`${order.createdBy} · ${formatTime(order.createdAt)}`}
        trailing={
          <StatusPill kind={isOpen ? 'info' : order.status === 'Paid' ? 'ok' : 'muted'}>
            {order.status}
          </StatusPill>
        }
      />

      {/* Client chip */}
      {isOpen && (
        <div style={{ padding: '0 20px 12px' }}>
          <button className="tappable" style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--bg-card)', borderRadius: 16, border: 'none',
            display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            boxShadow: 'var(--sh-card)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 999, background: 'var(--bg-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>👤</div>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: order.clientName ? 'var(--fg)' : 'var(--fg-3)' }}>
              {order.clientName || 'Assign client'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{order.clientName ? 'Change' : 'Optional'}</span>
          </button>
        </div>
      )}

      {/* Items */}
      <div style={{ padding: '0 20px' }}>
        <p style={{
          margin: '0 4px 10px', fontSize: 11.5, fontWeight: 700,
          color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Items · {items.length}</p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
            {[0,1,2].map(i => <SkeletonRow key={i} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
            {items.map((it, idx) => {
              const statusKind =
                it.status === 'Ready' ? 'ok' :
                it.status === 'Preparing' ? 'info' :
                it.status === 'Served' ? 'muted' : 'warn';
              return (
                <div key={it.id} className="item-enter" style={{
                  animationDelay: `${idx * 35}ms`,
                  padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 18,
                  boxShadow: 'var(--sh-card)',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em' }}>
                      {it.menuItemName}
                    </p>
                    {it.notes && (
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--accent-press)', fontStyle: 'italic' }}>
                        “{it.notes}”
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }}>
                      {fmt(it.price)} × {it.quantity}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    {/* Status pill — tap to cycle (optimistic) */}
                    <button
                      onClick={() => cycleStatus(it.id)}
                      className="tappable"
                      style={{ background: 'none', border: 'none', padding: 0 }}
                    >
                      <span key={tickItem === it.id ? 'a' : 'b'} className={tickItem === it.id ? 'tick' : ''}>
                        <StatusPill kind={statusKind} size="sm">{it.status}</StatusPill>
                      </span>
                    </button>
                    <span key={`p-${grand}-${it.id}`} style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em' }}>
                      {fmt(it.price * it.quantity)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total bar */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          padding: '14px 18px', borderRadius: 18,
          background: 'var(--bg-inverse)', color: 'var(--fg-inverse)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: 'var(--sh-elev)',
        }}>
          <span style={{ fontSize: 14, opacity: 0.7, letterSpacing: '-0.005em' }}>Total</span>
          <span key={grand} className="tick" style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(grand)}
          </span>
        </div>
      </div>

      {/* Actions — sticky at bottom so they don't scroll out of reach */}
      {isOpen && (
        <StickyActions hint={`Total · ${fmt(grand)}`}>
          <div style={{ display: 'flex', gap: 8 }}>
            <PrimaryButton kind="neutral" icon={<Icon.Plus />} onClick={() => alert('Add items flow')}>Add</PrimaryButton>
            <PrimaryButton kind="primary" onClick={() => setPaying(true)}>Close & pay</PrimaryButton>
          </div>
          <button className="tappable" style={{
            background: 'transparent', border: 'none', padding: '4px',
            color: 'var(--danger)', fontSize: 12.5, fontWeight: 600, alignSelf: 'center',
          }} onClick={() => { if (confirm('Cancel this order?')) nav('orders'); }}>
            Cancel order
          </button>
        </StickyActions>
      )}

      <Sheet open={paying} onClose={() => setPaying(false)} title="Payment method">
        <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--fg-3)' }}>
          Total payable: <strong style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{fmt(grand)}</strong>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { v: 'Cash', icon: '💵' },
            { v: 'Card', icon: '💳' },
            { v: 'Bank transfer', icon: '🏦' },
            { v: 'Other', icon: '📝' },
          ].map(m => (
            <button key={m.v} className="tappable" onClick={() => { setPaying(false); alert(`Paid via ${m.v}`); }} style={{
              padding: '22px 12px', border: 'none', borderRadius: 18,
              background: 'var(--bg-app)', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 28 }}>{m.icon}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.v}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MENU — Categories
// ════════════════════════════════════════════════════════════════
function ScreenMenu({ nav }) {
  const { categories } = window.MOCK;
  const loading = useLoad([], 480);

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 28 }}>
      <AppHeader
        title="Menu"
        subtitle={`${categories.length} categories · ${categories.reduce((s,c) => s + c.items.length, 0)} items`}
        trailing={
          <button className="tappable" aria-label="Add category" style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.Plus /></button>
        }
      />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? (
          [0,1,2,3].map(i => <SkeletonRow key={i} />)
        ) : categories.map((cat, idx) => {
          const unavailable = cat.items.filter(i => !i.isAvailable).length;
          return (
            <button
              key={cat.id}
              onClick={() => nav('menu-cat', cat.id)}
              className="tappable item-enter"
              style={{
                animationDelay: `${idx * 35}ms`,
                width: '100%', padding: '14px',
                background: 'var(--bg-card)', borderRadius: 18, border: 'none', textAlign: 'left',
                boxShadow: 'var(--sh-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>{cat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{cat.name}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }}>
                  {cat.items.length} items
                  {unavailable > 0 && (
                    <span style={{ color: 'var(--warn)', marginLeft: 6 }}>· {unavailable} unavailable</span>
                  )}
                </p>
              </div>
              <span style={{ color: 'var(--fg-4)' }}><Icon.Chevron /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// MENU CATEGORY — Items
// ════════════════════════════════════════════════════════════════
function ScreenMenuCategory({ nav, categoryId }) {
  const { categories, fmt } = window.MOCK;
  const cat = categories.find(c => c.id === categoryId) || categories[0];
  const loading = useLoad([categoryId], 380);
  const [items, setItems] = useState(cat.items);
  const [editing, setEditing] = useState(null);

  useEffect(() => { setItems(cat.items); }, [cat.id]);

  const toggle = (id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, isAvailable: !it.isAvailable } : it));
  };

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader
        onBack={() => nav('menu')}
        title={cat.name}
        subtitle={`${items.length} items · ${cat.icon} ${cat.name}`}
        trailing={
          <button className="tappable" style={iconBtnStyle} aria-label="Edit category">
            <Icon.Pencil />
          </button>
        }
      />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? (
          [0,1,2,3].map(i => <SkeletonRow key={i} />)
        ) : items.map((it, idx) => (
          <div key={it.id} className="item-enter" style={{
            animationDelay: `${idx * 35}ms`,
            padding: '14px', background: 'var(--bg-card)', borderRadius: 18,
            boxShadow: 'var(--sh-card)', opacity: it.isAvailable ? 1 : 0.55,
            transition: 'opacity .2s var(--ease)',
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>
                {it.name}
                {!it.isAvailable && (
                  <span style={{ marginLeft: 8, fontSize: 10.5, color: 'var(--warn)', fontWeight: 700, letterSpacing: '0.04em' }}>
                    UNAVAILABLE
                  </span>
                )}
              </p>
              {it.description && (
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }} className="clamp-2">
                  {it.description}
                </p>
              )}
              <p style={{ margin: '6px 0 0', fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.005em' }}>
                {fmt(it.price)}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setEditing(it)} className="tappable" style={iconActionStyle(false)} aria-label="Edit">
                <Icon.Pencil />
              </button>
              <button
                onClick={() => toggle(it.id)}
                className="tappable"
                style={iconActionStyle(it.isAvailable, 'ok')}
                aria-label={it.isAvailable ? 'Mark unavailable' : 'Mark available'}
              >
                {it.isAvailable ? <Icon.Check /> : <Icon.EyeOff />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bottom add — thumb-reachable, no scroll required */}
      <StickyActions>
        <PrimaryButton kind="primary" icon={<Icon.Plus />} onClick={() => setEditing('new')}>
          Add item to {cat.name}
        </PrimaryButton>
      </StickyActions>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New item' : 'Edit item'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldLabel label="Name"><input defaultValue={editing && editing !== 'new' ? editing.name : ''} placeholder="e.g. Khorovats" /></FieldLabel>
          <FieldLabel label="Description"><textarea rows={2} defaultValue={editing && editing !== 'new' ? (editing.description || '') : ''} style={{ resize: 'none' }} /></FieldLabel>
          <FieldLabel label="Price">
            <input type="number" defaultValue={editing && editing !== 'new' ? editing.price : ''} placeholder="0" inputMode="decimal" style={{ fontVariantNumeric: 'tabular-nums' }} />
          </FieldLabel>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 2px', cursor: 'pointer' }}>
            <input type="checkbox" defaultChecked={editing && editing !== 'new' ? editing.isAvailable : true}
              style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Available right now</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
            <PrimaryButton kind="primary" onClick={() => setEditing(null)}>
              {editing === 'new' ? 'Add to menu' : 'Save changes'}
            </PrimaryButton>
            {editing !== 'new' && editing && (
              <PrimaryButton kind="dangerSoft" onClick={() => setEditing(null)}>Delete item</PrimaryButton>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function FieldLabel({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
function iconActionStyle(active, tint) {
  return {
    width: 34, height: 34, borderRadius: 11,
    border: 'none',
    background: 'var(--bg-app)',
    color: tint === 'ok' && active ? 'var(--ok)' : 'var(--fg-2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ════════════════════════════════════════════════════════════════
// NEW ORDER FLOW — multi-step
// ════════════════════════════════════════════════════════════════
function ScreenNewOrder({ nav }) {
  const { tables, categories, fmt } = window.MOCK;
  const [step, setStep] = useState('table');     // table → menu → review
  const [table, setTable] = useState(null);
  const [category, setCategory] = useState(null);
  const [cart, setCart] = useState({});          // { itemId: { item, qty, notes } }

  const cartCount = Object.values(cart).reduce((s, c) => s + c.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, c) => s + c.item.price * c.qty, 0);

  const add = (item) => setCart(p => ({
    ...p,
    [item.id]: { item, qty: (p[item.id]?.qty || 0) + 1, notes: p[item.id]?.notes || '' },
  }));
  const dec = (item) => setCart(p => {
    const next = { ...p };
    if (!next[item.id]) return next;
    if (next[item.id].qty <= 1) delete next[item.id];
    else next[item.id] = { ...next[item.id], qty: next[item.id].qty - 1 };
    return next;
  });

  // ─── Step: Pick a table ────────────────────────────────────────
  if (step === 'table') {
    return (
      <div className="page-enter scroll" style={{ paddingBottom: 28 }}>
        <AppHeader onBack={() => nav('orders')} title="New order" subtitle="Step 1 of 3 · Pick a table" />
        <StepRail step={1} />

        <div style={{ padding: '8px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tables.map((tb, idx) => {
            const k =
              tb.status === 'Free' ? 'ok' :
              tb.status === 'Occupied' ? 'warn' : 'info';
            const disabled = tb.status === 'Occupied';
            return (
              <button
                key={tb.id}
                disabled={disabled}
                onClick={() => { setTable(tb); setStep('menu'); }}
                className="tappable item-enter"
                style={{
                  animationDelay: `${idx * 25}ms`,
                  aspectRatio: '1.1 / 1', padding: 14,
                  background: 'var(--bg-card)', borderRadius: 18, border: 'none', textAlign: 'left',
                  boxShadow: 'var(--sh-card)', opacity: disabled ? 0.5 : 1,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 700, letterSpacing: '0.06em' }}>TABLE</span>
                  <StatusPill kind={k} size="sm">{tb.status}</StatusPill>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--fg)', lineHeight: 1 }}>
                    {tb.number}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                    {tb.capacity} seats
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Step: Pick items (categories → items, or category → items) ─
  if (step === 'menu') {
    if (!category) {
      return (
        <div className="page-enter scroll" style={{ paddingBottom: cartCount ? 96 : 28 }}>
          <AppHeader onBack={() => setStep('table')} title="Add items" subtitle={`Step 2 of 3 · Table ${table.number}`} />
          <StepRail step={2} />

          <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
            {categories.map((cat, idx) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat)}
                className="tappable item-enter"
                style={{
                  animationDelay: `${idx * 25}ms`,
                  width: '100%', padding: '14px',
                  background: 'var(--bg-card)', borderRadius: 18, border: 'none', textAlign: 'left',
                  boxShadow: 'var(--sh-card)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-app)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21 }}>
                  {cat.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{cat.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }}>{cat.items.filter(i => i.isAvailable).length} available</p>
                </div>
                <span style={{ color: 'var(--fg-4)' }}><Icon.Chevron /></span>
              </button>
            ))}
          </div>

          {cartCount > 0 && <CartBar count={cartCount} total={cartTotal} fmt={fmt} onReview={() => setStep('review')} />}
        </div>
      );
    }

    // category items
    return (
      <div className="page-enter scroll" style={{ paddingBottom: cartCount ? 96 : 28 }}>
        <AppHeader onBack={() => setCategory(null)} title={category.name} subtitle={`Step 2 of 3 · Table ${table.number}`} />

        <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
          {category.items.filter(i => i.isAvailable).map((it, idx) => {
            const qty = cart[it.id]?.qty || 0;
            return (
              <div key={it.id} className="item-enter" style={{
                animationDelay: `${idx * 25}ms`,
                padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 18,
                boxShadow: 'var(--sh-card)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, letterSpacing: '-0.005em' }}>{it.name}</p>
                  {it.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }} className="clamp-1">{it.description}</p>}
                  <p style={{ margin: '5px 0 0', fontSize: 13.5, fontWeight: 700 }}>{fmt(it.price)}</p>
                </div>
                {qty === 0 ? (
                  <button onClick={() => add(it)} className="tappable" style={{
                    width: 38, height: 38, borderRadius: 999, border: 'none',
                    background: 'var(--accent)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Icon.Plus /></button>
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--bg-app)', borderRadius: 999, padding: 3,
                  }}>
                    <Stepper sign="-" onClick={() => dec(it)} />
                    <span key={qty} className="tick" style={{ minWidth: 22, textAlign: 'center', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                      {qty}
                    </span>
                    <Stepper sign="+" onClick={() => add(it)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cartCount > 0 && <CartBar count={cartCount} total={cartTotal} fmt={fmt} onReview={() => setStep('review')} />}
      </div>
    );
  }

  // ─── Step: Review ─────────────────────────────────────────────
  if (step === 'review') {
    return (
      <div className="page-enter scroll" style={{ paddingBottom: 110 }}>
        <AppHeader onBack={() => setStep('menu')} title="Review" subtitle={`Step 3 of 3 · Table ${table.number}`} />
        <StepRail step={3} />

        <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
          {Object.values(cart).map((line, idx) => (
            <div key={line.item.id} className="item-enter" style={{
              animationDelay: `${idx * 25}ms`,
              padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 18, boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{line.item.name}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }}>
                  {fmt(line.item.price)} × {line.qty}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em' }}>{fmt(line.item.price * line.qty)}</p>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 20px 0' }}>
          <button onClick={() => setStep('menu')} className="tappable" style={{
            width: '100%', padding: 14, border: 'none', borderRadius: 16,
            background: 'var(--bg-card)', boxShadow: 'var(--sh-card)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            color: 'var(--accent-press)', fontWeight: 600, fontSize: 14,
          }}>
            <Icon.Plus /> Add more items
          </button>
        </div>

        {/* Floating confirm bar */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          padding: '14px 20px 24px',
          background: 'var(--bar-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '0.5px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>Total · {cartCount} item{cartCount > 1 ? 's' : ''}</span>
            <span key={cartTotal} className="tick" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>
              {fmt(cartTotal)}
            </span>
          </div>
          <PrimaryButton kind="primary" onClick={() => { alert('Order created'); nav('orders'); }}>
            Send to kitchen
          </PrimaryButton>
        </div>
      </div>
    );
  }
}

function StepRail({ step }) {
  return (
    <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1,2,3].map(s => (
        <div key={s} style={{
          flex: 1, height: 3, borderRadius: 999,
          background: s <= step ? 'var(--accent)' : 'var(--bg-muted)',
          transition: 'background .26s var(--ease)',
        }} />
      ))}
    </div>
  );
}
function Stepper({ sign, onClick }) {
  return (
    <button onClick={onClick} className="tappable" style={{
      width: 32, height: 32, borderRadius: 999, border: 'none',
      background: '#fff', color: 'var(--fg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 1px 2px rgba(15,15,16,0.06)',
    }}>
      {sign === '+' ? <Icon.Plus /> : <Icon.Minus />}
    </button>
  );
}
function CartBar({ count, total, fmt, onReview }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      padding: '12px 16px 20px',
      background: 'var(--bar-bg)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '0.5px solid var(--line)',
    }}>
      <button onClick={onReview} className="tappable" style={{
        width: '100%', padding: '14px 18px', border: 'none', borderRadius: 16,
        background: 'var(--accent)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span key={count} className="pop" style={{
            background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '2px 10px',
            fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          }}>{count}</span>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }}>Review order</span>
        </span>
        <span key={total} className="tick" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.005em', fontVariantNumeric: 'tabular-nums' }}>
          {fmt(total)}
        </span>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STUB (for "soon" screens, so tab/dashboard links don't dead-end)
// ════════════════════════════════════════════════════════════════
function ScreenStub({ nav, title = 'Coming soon' }) {
  return (
    <div className="page-enter scroll">
      <AppHeader onBack={() => nav('home')} title={title} subtitle="Not part of this redesign scope" />
      <div style={{ padding: 20 }}>
        <EmptyState icon="🚧" title="Beyond scope" hint="This screen isn't in the current redesign pass. The 3 in scope are Dashboard, Orders, and Menu." />
      </div>
    </div>
  );
}

// Tables stub (slightly nicer — used in bottom tab demo)
function ScreenTables({ nav }) {
  const { tables } = window.MOCK;
  const loading = useLoad([], 380);
  return (
    <div className="page-enter scroll" style={{ paddingBottom: 28 }}>
      <AppHeader onBack={() => nav('home')} title="Tables" subtitle={`${tables.filter(t => t.status === 'Free').length} free · ${tables.filter(t => t.status === 'Occupied').length} occupied`} />
      {loading ? (
        <div style={{ padding: '8px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ aspectRatio: '1.1 / 1', borderRadius: 18 }} />)}
        </div>
      ) : (
        <div style={{ padding: '8px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {tables.map((tb, idx) => {
            const k = tb.status === 'Free' ? 'ok' : tb.status === 'Occupied' ? 'warn' : 'info';
            return (
              <div key={tb.id} className="item-enter" style={{
                animationDelay: `${idx * 22}ms`,
                aspectRatio: '1.1 / 1', padding: 14, background: 'var(--bg-card)', borderRadius: 18,
                boxShadow: 'var(--sh-card)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 700, letterSpacing: '0.06em' }}>TABLE</span>
                  <StatusPill kind={k} size="sm">{tb.status}</StatusPill>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>{tb.number}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{tb.capacity} seats</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

Object.assign(window, {
  ScreenDashboard, ScreenOrders, ScreenOrderDetail, ScreenMenu,
  ScreenMenuCategory, ScreenNewOrder, ScreenStub, ScreenTables,
});
