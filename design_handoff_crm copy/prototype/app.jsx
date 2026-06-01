// Main app — router state, IOSDevice shell, bottom tabs, tweaks panel.

const { useState } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "balanced",
  "dark": false
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState({ name: 'home' });
  const [history, setHistory] = useState([]);

  // Page background follows theme so the framed-iPhone bezel matches.
  React.useEffect(() => {
    document.body.dataset.stage = tweaks.dark ? 'dark' : 'light';
  }, [tweaks.dark]);

  const nav = (name, payload) => {
    setHistory(h => [...h, route]);
    setRoute({ name, payload });
  };

  // Bottom tab mapping
  const tabFor = (r) => {
    if (r.name === 'home') return 'home';
    if (r.name === 'orders' || r.name === 'order-detail' || r.name === 'new-order') return 'orders';
    if (r.name === 'menu' || r.name === 'menu-cat') return 'menu';
    if (r.name === 'tables') return 'tables';
    return null;
  };
  const activeTab = tabFor(route);
  // Bottom tab bar visible on most screens so users can always jump.
  // Hidden during multi-step flows (new order) and standalone forms (login).
  const showTabBar = ![
    'login', 'new-order', 'order-detail', 'menu-cat',
  ].includes(route.name);

  const goTab = (k) => {
    if (k === 'home') nav('home');
    if (k === 'orders') nav('orders');
    if (k === 'menu') nav('menu');
    if (k === 'tables') nav('tables');
  };

  let screen;
  if (route.name === 'login')         screen = <ScreenLogin nav={nav} />;
  else if (route.name === 'home')     screen = <ScreenDashboard nav={nav} />;
  else if (route.name === 'orders')   screen = <ScreenOrders nav={nav} />;
  else if (route.name === 'order-detail') screen = <ScreenOrderDetail nav={nav} orderId={route.payload} />;
  else if (route.name === 'new-order')screen = <ScreenNewOrder nav={nav} />;
  else if (route.name === 'menu')     screen = <ScreenMenu nav={nav} />;
  else if (route.name === 'menu-cat') screen = <ScreenMenuCategory nav={nav} categoryId={route.payload} />;
  else if (route.name === 'tables')   screen = <ScreenTables nav={nav} />;
  else if (route.name === 'reservations') screen = <ScreenReservations nav={nav} />;
  else if (route.name === 'reports')  screen = <ScreenReports nav={nav} />;
  else if (route.name === 'cash')     screen = <ScreenCash nav={nav} />;
  else if (route.name === 'warehouse')screen = <ScreenWarehouse nav={nav} />;
  else if (route.name === 'clients')  screen = <ScreenClients nav={nav} />;
  else if (route.name === 'activity') screen = <ScreenActivity nav={nav} />;
  else if (route.name === 'staff')    screen = <ScreenStaff nav={nav} />;
  else if (route.name === 'schedule') screen = <ScreenSchedule nav={nav} />;
  else if (route.name === 'settings') screen = <ScreenSettings nav={nav} />;
  else                                screen = <ScreenStub nav={nav} />;

  return (
    <>
      <IOSDevice width={402} height={874} dark={tweaks.dark}>
        <div
          className={`app density-${tweaks.density}`}
          data-theme={tweaks.dark ? 'dark' : 'light'}
          key={route.name + (route.payload || '')}
        >
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {screen}
          </div>
          {showTabBar && <TabBar active={activeTab} onTab={goTab} />}
        </div>
      </IOSDevice>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakToggle
          label="Dark mode"
          value={tweaks.dark}
          onChange={(v) => setTweak('dark', v)}
        />
        <TweakSection label="Density" />
        <TweakRadio
          label="Rows per screen"
          value={tweaks.density}
          options={['compact', 'balanced', 'roomy']}
          onChange={(v) => setTweak('density', v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
