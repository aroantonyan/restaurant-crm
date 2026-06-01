// Additional screens covering the rest of the CRM functional scope.
// Login, Reservations, Reports, Cash, Warehouse, Clients, Activity log,
// Staff, Schedule, Settings. Each demonstrates the design system applied
// to its content — lower polish than core screens by design.

const { useState: useState2 } = React;

// ════════════════════════════════════════════════════════════════
// LOGIN — first impression / auth
// ════════════════════════════════════════════════════════════════
function ScreenLogin({ nav }) {
  const [busy, setBusy] = useState2(false);
  return (
    <div className="page-enter scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '52px 24px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 11.5, color: 'var(--fg-3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>EN · ՀԱՅ</span>
      </div>

      <div style={{ padding: '40px 24px 12px', textAlign: 'center' }}>
        <div style={{
          width: 64, height: 64, margin: '0 auto 22px',
          borderRadius: 20, background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, color: '#fff',
          boxShadow: '0 12px 28px -8px rgba(217,99,63,0.4)',
        }}>🍽️</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>Welcome back</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--fg-3)' }}>Sign in to your restaurant</p>
      </div>

      <div style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabelE label="Email"><input type="email" placeholder="you@restaurant.am" defaultValue="aro@mail.ru" /></FieldLabelE>
        <FieldLabelE label="Password"><input type="password" placeholder="••••••••" defaultValue="secret123" /></FieldLabelE>
        <button onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); nav('home'); }, 700); }}
          className="tappable"
          disabled={busy}
          style={{
            marginTop: 6, padding: '14px 18px', border: 'none', borderRadius: 14,
            background: 'var(--accent)', color: '#fff',
            fontSize: 15.5, fontWeight: 600, letterSpacing: '-0.005em',
            opacity: busy ? 0.7 : 1,
          }}>
          {busy ? <span className="skeleton-text">Signing in…</span> : 'Sign in'}
        </button>
      </div>

      <div style={{ marginTop: 'auto', padding: '40px 20px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>New restaurant?</p>
        <button className="tappable" style={{
          marginTop: 8, padding: '13px 18px', border: 'none', borderRadius: 14,
          background: 'var(--bg-card)', color: 'var(--fg)',
          fontSize: 14.5, fontWeight: 600, width: '100%', boxShadow: 'var(--sh-card)',
        }}>Create an account</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// RESERVATIONS
// ════════════════════════════════════════════════════════════════
function ScreenReservations({ nav }) {
  const { reservations } = window.MOCK;
  const loading = useLoad([], 420);
  const [dayIdx, setDayIdx] = useState2(0);
  const days = ['Today', 'Tomorrow', 'Thu 29', 'Fri 30', 'Sat 31'];

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader
        onBack={() => nav('home')}
        title="Reservations"
        subtitle={`${reservations.length} for ${days[dayIdx].toLowerCase()}`}
        trailing={
          <button className="tappable" aria-label="New reservation" style={{
            width: 36, height: 36, borderRadius: 999, border: 'none',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon.Plus /></button>
        }
      />

      {/* day scrubber */}
      <div style={{ display: 'flex', gap: 8, padding: '6px 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {days.map((d, i) => (
          <Chip key={d} active={dayIdx === i} onClick={() => setDayIdx(i)}>{d}</Chip>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? [0,1,2,3].map(i => <SkeletonRow key={i} />) :
          reservations.map((r, idx) => (
            <div key={r.id} className="item-enter" style={{
              animationDelay: `${idx * 30}ms`,
              padding: '14px', background: 'var(--bg-card)', borderRadius: 18,
              boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              {/* time block */}
              <div style={{
                minWidth: 60, padding: '10px 6px',
                background: r.status === 'Confirmed' ? 'var(--accent-soft)' : 'var(--bg-muted)',
                borderRadius: 12, textAlign: 'center',
              }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-press)', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                  {r.time}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--fg-3)', fontWeight: 600 }}>
                  {r.party} guests
                </div>
              </div>
              {/* details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, letterSpacing: '-0.005em' }} className="clamp-1">
                  {r.name}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--fg-3)' }}>
                  {r.tableNumber ? `Table ${r.tableNumber}` : 'No table yet'}
                  {r.phone && <> · {r.phone}</>}
                </p>
                {r.note && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--accent-press)', fontStyle: 'italic' }} className="clamp-1">
                    “{r.note}”
                  </p>
                )}
              </div>
              <StatusPill kind={r.status === 'Confirmed' ? 'ok' : 'warn'} size="sm">{r.status}</StatusPill>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════════
function ScreenReports({ nav }) {
  const { fmt } = window.MOCK;
  const loading = useLoad([], 460);
  const [range, setRange] = useState2('Today');

  // Mocked totals
  const totals = {
    Today:    { revenue: 286400, orders: 24, avg: 11933, change: '+12%' },
    Week:     { revenue: 1842000, orders: 168, avg: 10964, change: '+6%' },
    Month:    { revenue: 8120000, orders: 712, avg: 11404, change: '-2%' },
  }[range];

  const bars = [12, 18, 26, 31, 22, 38, 44]; // hours / days mocked
  const max = Math.max(...bars);

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 24 }}>
      <AppHeader onBack={() => nav('home')} title="Reports" subtitle="Sales & operations" />
      <div style={{ display: 'flex', gap: 8, padding: '6px 20px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {['Today','Week','Month'].map(r => (
          <Chip key={r} active={range === r} onClick={() => setRange(r)}>{r}</Chip>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Headline revenue */}
        <div className="item-enter" style={{
          padding: 18, background: 'var(--bg-card)', borderRadius: 22, boxShadow: 'var(--sh-card)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', fontWeight: 600 }}>REVENUE</p>
              {loading ? <Skel w={140} h={24} style={{ marginTop: 6 }} /> :
                <p key={range} className="tick" style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(totals.revenue)}
                </p>
              }
            </div>
            <StatusPill kind={totals.change.startsWith('-') ? 'danger' : 'ok'} size="sm" dot={false}>
              {totals.change}
            </StatusPill>
          </div>

          {/* sparkline */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64, marginTop: 18 }}>
            {bars.map((v, i) => (
              <div key={i} style={{
                flex: 1, height: `${(v / max) * 100}%`,
                background: i === bars.length - 1 ? 'var(--accent)' : 'var(--bg-muted)',
                borderRadius: 4, transition: 'height .35s var(--ease)',
              }} />
            ))}
          </div>
        </div>

        {/* small KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <KPI loading={loading} label="Orders" value={totals.orders} />
          <KPI loading={loading} label="Avg ticket" value={fmt(totals.avg)} />
        </div>

        {/* top items */}
        <div className="card" style={{ padding: 14 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top items</p>
          {[
            { name: 'Khorovats — pork', qty: 18, rev: 75600 },
            { name: 'Areni reserve, glass', qty: 26, rev: 46800 },
            { name: 'Armenian coffee', qty: 41, rev: 28700 },
            { name: 'Lamb kebab', qty: 9, rev: 39600 },
          ].map((row, i) => (
            <div key={row.name} className="item-enter" style={{
              animationDelay: `${i * 35}ms`,
              display: 'flex', alignItems: 'center', padding: '10px 0',
              borderTop: i ? '0.5px solid var(--line)' : 'none',
              gap: 12,
            }}>
              <span style={{ fontSize: 13, color: 'var(--fg-3)', width: 18, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }} className="clamp-1">{row.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{row.qty} sold</p>
              </div>
              <span style={{ fontSize: 13.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(row.rev)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, loading }) {
  return (
    <div className="card item-enter" style={{ padding: 14 }}>
      <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      {loading ? <Skel w={80} h={20} style={{ marginTop: 8 }} /> :
        <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 700, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
      }
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CASH REGISTER
// ════════════════════════════════════════════════════════════════
function ScreenCash({ nav }) {
  const { cashLog, fmt, elapsed } = window.MOCK;
  const loading = useLoad([], 420);
  const cashTotal = cashLog.reduce((s, t) => s + t.amount, 0);
  const open = true;

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader onBack={() => nav('home')} title="Cash register" subtitle="Shift open · 8h 12m" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* current drawer card */}
        <div className="item-enter card" style={{ padding: 18, background: 'var(--bg-inverse)', color: 'var(--fg-inverse)', boxShadow: 'var(--sh-elev)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'currentcolor', opacity: 0.55, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Drawer balance</p>
              <p key={cashTotal} className="tick" style={{ margin: '8px 0 0', fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', fontVariantNumeric: 'tabular-nums' }}>
                {fmt(cashTotal)}
              </p>
            </div>
            <span style={{
              padding: '4px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700,
              background: 'rgba(75,190,126,0.18)', color: '#7BD9A0',
              display: 'inline-flex', alignItems: 'center', gap: 5,
            }}>
              <span className="dot-pulse" style={{ width: 5, height: 5, borderRadius: 999, background: '#4BBE7E' }} />
              OPEN
            </span>
          </div>
        </div>

        {/* quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="tappable card" style={{
            padding: '14px', border: 'none', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            color: 'var(--ok)', background: 'var(--bg-card)',
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--ok-soft)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Plus />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Cash in</span>
          </button>
          <button className="tappable card" style={{
            padding: '14px', border: 'none', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--bg-card)',
          }}>
            <span style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Minus />
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Cash out</span>
          </button>
        </div>

        {/* recent movements */}
        <p style={{
          margin: '6px 4px -2px', fontSize: 11.5, fontWeight: 700,
          color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>Recent movements</p>

        {loading ? [0,1,2,3].map(i => <SkeletonRow key={i} />) :
          cashLog.map((t, i) => (
            <div key={t.id} className="item-enter" style={{
              animationDelay: `${i * 28}ms`,
              padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 16,
              boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: t.amount > 0 ? 'var(--ok-soft)' : 'var(--danger-soft)',
                color: t.amount > 0 ? 'var(--ok)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {t.amount > 0 ? <Icon.Plus /> : <Icon.Minus />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }} className="clamp-1">{t.ref}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{t.method} · {elapsed(t.time)}</p>
              </div>
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: t.amount > 0 ? 'var(--ok)' : 'var(--danger)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
              </span>
            </div>
          ))
        }
      </div>

      <StickyActions>
        <PrimaryButton kind="dangerSoft">Close shift</PrimaryButton>
      </StickyActions>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// WAREHOUSE
// ════════════════════════════════════════════════════════════════
function ScreenWarehouse({ nav }) {
  const { products } = window.MOCK;
  const loading = useLoad([], 400);
  const [q, setQ] = useState2('');

  const low = products.filter(p => p.stock <= p.threshold);
  const filtered = q ? products.filter(p => p.name.toLowerCase().includes(q.toLowerCase())) : products;

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader
        onBack={() => nav('home')}
        title="Warehouse"
        subtitle={`${products.length} products · ${low.length} low stock`}
      />

      {/* Search */}
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 14,
          boxShadow: 'var(--sh-card)',
          color: 'var(--fg-3)',
        }}>
          <Icon.Search />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products"
            style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, color: 'var(--fg)', fontSize: 15 }}
          />
        </div>
      </div>

      {low.length > 0 && (
        <div style={{ padding: '0 20px 12px' }}>
          <div className="item-enter" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', background: 'var(--warn-soft)', borderRadius: 14,
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>
              {low.length} item{low.length > 1 ? 's' : ''} below threshold — reorder soon
            </p>
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? [0,1,2,3].map(i => <SkeletonRow key={i} />) :
          filtered.map((p, idx) => {
            const ratio = Math.min(1, p.stock / (p.threshold * 2));
            const isLow = p.stock <= p.threshold;
            return (
              <div key={p.id} className="item-enter" style={{
                animationDelay: `${idx * 25}ms`,
                padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 16,
                boxShadow: 'var(--sh-card)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{p.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{p.category}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isLow ? 'var(--warn)' : 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>
                      {p.stock} <span style={{ fontSize: 11, color: 'var(--fg-3)', fontWeight: 500 }}>{p.unit}</span>
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>min {p.threshold}</p>
                  </div>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-muted)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${ratio * 100}%`, height: '100%',
                    background: isLow ? 'var(--warn)' : 'var(--ok)',
                    borderRadius: 999, transition: 'width .35s var(--ease)',
                  }} />
                </div>
              </div>
            );
          })
        }
      </div>

      <StickyActions>
        <PrimaryButton kind="primary" icon={<Icon.Plus />}>Receive stock</PrimaryButton>
      </StickyActions>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// CLIENTS
// ════════════════════════════════════════════════════════════════
function ScreenClients({ nav }) {
  const { clients, fmt } = window.MOCK;
  const loading = useLoad([], 380);

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader onBack={() => nav('home')} title="Clients" subtitle={`${clients.length} saved`} />
      <div style={{ padding: '0 20px 12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 14,
          boxShadow: 'var(--sh-card)', color: 'var(--fg-3)',
        }}>
          <Icon.Search />
          <input placeholder="Search by name or phone" style={{ flex: 1, border: 'none', background: 'transparent', padding: 0, color: 'var(--fg)', fontSize: 15 }} />
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? [0,1,2,3].map(i => <SkeletonRow key={i} />) :
          clients.map((c, idx) => (
            <div key={c.id} className="item-enter" style={{
              animationDelay: `${idx * 30}ms`,
              padding: '12px 14px', background: 'var(--bg-card)', borderRadius: 16,
              boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 999,
                background: 'var(--accent-soft)', color: 'var(--accent-press)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
              }}>{c.fullName.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }} className="clamp-1">{c.fullName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
                  {c.phone || 'No phone'} · {c.visits} visit{c.visits !== 1 ? 's' : ''}
                </p>
              </div>
              {c.depositBalance !== 0 && (
                <span style={{
                  fontSize: 13, fontWeight: 700,
                  color: c.depositBalance < 0 ? 'var(--danger)' : 'var(--ok)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {c.depositBalance > 0 ? '+' : ''}{fmt(c.depositBalance)}
                </span>
              )}
            </div>
          ))
        }
      </div>

      <StickyActions>
        <PrimaryButton kind="primary" icon={<Icon.Plus />}>Add client</PrimaryButton>
      </StickyActions>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ════════════════════════════════════════════════════════════════
function ScreenActivity({ nav }) {
  const { activity, elapsed } = window.MOCK;
  const loading = useLoad([], 380);
  const kindIcon = { order: '📝', menu: '🍽️', cash: '💵', staff: '👥', tables: '🪑', settings: '⚙️' };
  const kindColor = { order: 'var(--info)', menu: 'var(--accent-press)', cash: 'var(--ok)', staff: 'var(--info)', tables: 'var(--warn)', settings: 'var(--fg-2)' };

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 28 }}>
      <AppHeader onBack={() => nav('home')} title="Activity log" subtitle="Audit trail · last 7 days" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
        {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>{[0,1,2,3].map(i => <SkeletonRow key={i} />)}</div> :
          activity.map((a, idx) => (
            <div key={a.id} className="item-enter" style={{
              animationDelay: `${idx * 30}ms`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 0',
              borderBottom: idx === activity.length - 1 ? 'none' : '0.5px solid var(--line)',
            }}>
              {/* Timeline dot + line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', alignSelf: 'stretch', flexShrink: 0 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 999,
                  background: 'var(--bg-card)',
                  boxShadow: 'var(--sh-card)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>{kindIcon[a.kind] || '•'}</div>
                {idx !== activity.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: 'var(--line)', marginTop: 4 }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--fg)' }}>
                  <span style={{ fontWeight: 700, color: kindColor[a.kind] || 'var(--fg)' }}>{a.who}</span>
                  <span style={{ color: 'var(--fg-2)' }}> {a.what}</span>
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--fg-3)' }}>{elapsed(a.time)}</p>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STAFF
// ════════════════════════════════════════════════════════════════
function ScreenStaff({ nav }) {
  const { staff } = window.MOCK;
  const loading = useLoad([], 380);
  const roleColor = { Admin: 'var(--accent-press)', Waiter: 'var(--info)', Cashier: 'var(--ok)', Chef: 'var(--warn)', Bartender: 'var(--info)' };

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader onBack={() => nav('home')} title="Staff" subtitle={`${staff.filter(s => s.status === 'Active').length} active members`} />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? [0,1,2,3].map(i => <SkeletonRow key={i} />) :
          staff.map((s, idx) => (
            <button key={s.id} className="tappable item-enter" style={{
              animationDelay: `${idx * 30}ms`,
              width: '100%', padding: '12px 14px', border: 'none', textAlign: 'left',
              background: 'var(--bg-card)', borderRadius: 16, boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', gap: 12,
              opacity: s.status === 'Inactive' ? 0.55 : 1,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: 'var(--bg-muted)', color: 'var(--fg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
              }}>{s.name.split(' ').map(n => n[0]).slice(0,2).join('')}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }} className="clamp-1">{s.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>{s.email}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  fontSize: 11.5, fontWeight: 700,
                  color: roleColor[s.role] || 'var(--fg-2)',
                }}>{s.role}</span>
                <StatusPill
                  kind={s.status === 'Active' ? 'ok' : s.status === 'Pending' ? 'warn' : 'muted'}
                  size="sm"
                >{s.status}</StatusPill>
              </div>
            </button>
          ))
        }
      </div>

      <StickyActions>
        <PrimaryButton kind="primary" icon={<Icon.Plus />}>Invite member</PrimaryButton>
      </StickyActions>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SCHEDULE
// ════════════════════════════════════════════════════════════════
function ScreenSchedule({ nav }) {
  const { schedule } = window.MOCK;
  const loading = useLoad([], 420);
  const [selected, setSelected] = useState2(0); // Mon
  const today = schedule[selected];

  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader onBack={() => nav('home')} title="Schedule" subtitle="This week" />

      {/* Day picker */}
      <div style={{ padding: '0 20px 14px', display: 'flex', gap: 6 }}>
        {schedule.map((d, i) => (
          <button key={d.day} onClick={() => setSelected(i)} className="tappable" style={{
            flex: 1, padding: '10px 0', border: 'none', borderRadius: 12,
            background: i === selected ? 'var(--accent)' : 'var(--bg-card)',
            color: i === selected ? '#fff' : 'var(--fg-2)',
            boxShadow: i === selected ? 'none' : 'var(--sh-card)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d.day}</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{d.shifts.length}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 'var(--gap-list)' }}>
        {loading ? [0,1,2].map(i => <SkeletonRow key={i} />) :
          today.shifts.length === 0 ? (
            <EmptyState icon="🌴" title="Day off" hint="No shifts scheduled. Tap the button below to add one." />
          ) :
          today.shifts.map((sh, idx) => (
            <div key={idx} className="item-enter" style={{
              animationDelay: `${idx * 35}ms`,
              padding: '14px', background: 'var(--bg-card)', borderRadius: 16,
              boxShadow: 'var(--sh-card)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 8, alignSelf: 'stretch', borderRadius: 4,
                background: 'var(--accent)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{sh.who}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {sh.from} — {sh.to}
                </p>
              </div>
              <button className="tappable" style={iconBtnStyle} aria-label="Edit shift">
                <Icon.Pencil />
              </button>
            </div>
          ))
        }
      </div>

      <StickyActions>
        <PrimaryButton kind="primary" icon={<Icon.Plus />}>Add shift to {today.day}</PrimaryButton>
      </StickyActions>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SETTINGS — restaurant profile
// ════════════════════════════════════════════════════════════════
function ScreenSettings({ nav }) {
  const { session } = window.MOCK;
  return (
    <div className="page-enter scroll" style={{ paddingBottom: 96 }}>
      <AppHeader onBack={() => nav('home')} title="Restaurant" subtitle="Profile & preferences" />

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SettingsSection title="Identity">
          <FieldLabelE label="Restaurant name"><input defaultValue={session.restaurantName} /></FieldLabelE>
          <FieldLabelE label="Currency">
            <select defaultValue="AMD" style={selectStyle}>
              <option>AMD — Armenian dram (֏)</option>
              <option>USD — US dollar ($)</option>
              <option>EUR — Euro (€)</option>
              <option>RUB — Russian ruble (₽)</option>
            </select>
          </FieldLabelE>
        </SettingsSection>

        <SettingsSection title="Contact">
          <FieldLabelE label="Address"><input defaultValue="Tumanyan St 12, Yerevan" /></FieldLabelE>
          <FieldLabelE label="Phone"><input type="tel" defaultValue="+374 11 234 567" /></FieldLabelE>
        </SettingsSection>

        <SettingsSection title="Preferences">
          <RowToggle label="Telegram notifications" defaultChecked />
          <RowToggle label="Print order tickets" defaultChecked />
          <RowToggle label="Charge service automatically" />
        </SettingsSection>
      </div>

      <StickyActions>
        <PrimaryButton kind="primary">Save changes</PrimaryButton>
      </StickyActions>
    </div>
  );
}

function SettingsSection({ title, children }) {
  return (
    <section>
      <p style={{
        margin: '0 4px 10px', fontSize: 11.5, fontWeight: 700,
        color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{title}</p>
      <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

function RowToggle({ label, defaultChecked }) {
  const [v, setV] = useState2(!!defaultChecked);
  return (
    <button onClick={() => setV(p => !p)} className="tappable" style={{
      width: '100%', padding: 0, background: 'transparent', border: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span style={{ fontSize: 14.5, fontWeight: 500, color: 'var(--fg)' }}>{label}</span>
      <span style={{
        width: 42, height: 26, borderRadius: 999,
        background: v ? 'var(--accent)' : 'var(--bg-muted)',
        position: 'relative', transition: 'background .2s var(--ease)',
        flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: v ? 19 : 3,
          width: 20, height: 20, borderRadius: 999, background: '#fff',
          transition: 'left .22s var(--ease)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }} />
      </span>
    </button>
  );
}

const selectStyle = {
  fontSize: 16,
  border: '1px solid var(--line)', background: 'var(--bg-app)',
  borderRadius: 12, padding: '12px 14px', width: '100%', outline: 'none', color: 'var(--fg)',
};

// Local field label component (separate name to avoid collision)
function FieldLabelE({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{
        fontSize: 11.5, fontWeight: 700, color: 'var(--fg-3)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</span>
      {children}
    </label>
  );
}

Object.assign(window, {
  ScreenLogin, ScreenReservations, ScreenReports, ScreenCash,
  ScreenWarehouse, ScreenClients, ScreenActivity, ScreenStaff,
  ScreenSchedule, ScreenSettings,
});
