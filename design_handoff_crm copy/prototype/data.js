// Mock data shaped like the real DTOs (OrderDto, MenuCategoryDto, TableDto)
// Currency: AMD (Armenian dram) — no decimals, per format.ts behaviour.

window.MOCK = (function () {
  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(amount)) + '\u00A0֏';

  const categories = [
    {
      id: 'c1', name: 'Starters', icon: '🥗', sortOrder: 1,
      items: [
        { id: 'i1', name: 'Eech', description: 'Bulgur, tomato, parsley, lemon', price: 1400, isAvailable: true },
        { id: 'i2', name: 'Hummus', description: 'Chickpea, tahini, olive oil, sumac', price: 1600, isAvailable: true },
        { id: 'i3', name: 'Marinated olives', description: '', price: 900, isAvailable: true },
        { id: 'i4', name: 'Stuffed grape leaves', description: 'Rice, herbs, lemon', price: 1800, isAvailable: false },
      ],
    },
    {
      id: 'c2', name: 'Grills', icon: '🍖', sortOrder: 2,
      items: [
        { id: 'i5', name: 'Khorovats — pork', description: 'Charcoal pork shoulder, tomato, lavash', price: 4200, isAvailable: true },
        { id: 'i6', name: 'Khorovats — chicken', description: 'Marinated chicken thigh', price: 3600, isAvailable: true },
        { id: 'i7', name: 'Lamb kebab', description: 'Ground lamb, onion, sumac', price: 4400, isAvailable: true },
        { id: 'i8', name: 'Grilled vegetables', description: 'Eggplant, peppers, tomatoes', price: 2200, isAvailable: true },
      ],
    },
    {
      id: 'c3', name: 'Soups', icon: '🍲', sortOrder: 3,
      items: [
        { id: 'i9', name: 'Spas', description: 'Yoghurt, wheat, herbs', price: 1200, isAvailable: true },
        { id: 'i10', name: 'Khash', description: 'Slow-cooked, served traditionally', price: 3800, isAvailable: false },
      ],
    },
    {
      id: 'c4', name: 'Wine & bar', icon: '🍷', sortOrder: 4,
      items: [
        { id: 'i11', name: 'Areni reserve, glass', description: 'Dry red, Vayots Dzor', price: 1800, isAvailable: true },
        { id: 'i12', name: 'Areni reserve, bottle', description: '', price: 7800, isAvailable: true },
        { id: 'i13', name: 'Voskehat, glass', description: 'Dry white', price: 1600, isAvailable: true },
        { id: 'i14', name: 'Tutovka 50ml', description: 'Mulberry brandy', price: 1500, isAvailable: true },
      ],
    },
    {
      id: 'c5', name: 'Coffee & tea', icon: '☕', sortOrder: 5,
      items: [
        { id: 'i15', name: 'Armenian coffee', description: 'Sand-cooked, cardamom', price: 700, isAvailable: true },
        { id: 'i16', name: 'Espresso', description: '', price: 600, isAvailable: true },
        { id: 'i17', name: 'Mountain herb tea', description: 'Thyme, oregano, mint', price: 800, isAvailable: true },
      ],
    },
    {
      id: 'c6', name: 'Dessert', icon: '🍰', sortOrder: 6,
      items: [
        { id: 'i18', name: 'Gata', description: 'Sweet bread, walnut', price: 1100, isAvailable: true },
        { id: 'i19', name: 'Sujukh', description: 'Walnut, grape molasses', price: 1300, isAvailable: true },
      ],
    },
  ];

  const tables = [
    { id: 't1', number: 1,  capacity: 2, status: 'Free' },
    { id: 't2', number: 2,  capacity: 4, status: 'Occupied' },
    { id: 't3', number: 3,  capacity: 4, status: 'Occupied' },
    { id: 't4', number: 4,  capacity: 6, status: 'Reserved' },
    { id: 't5', number: 5,  capacity: 2, status: 'Free' },
    { id: 't6', number: 6,  capacity: 4, status: 'Free' },
    { id: 't7', number: 7,  capacity: 8, status: 'Occupied' },
    { id: 't8', number: 8,  capacity: 2, status: 'Free' },
    { id: 't9', number: 9,  capacity: 4, status: 'Reserved' },
    { id: 't10', number: 10, capacity: 2, status: 'Free' },
  ];

  const orders = [
    {
      id: 'o1', tableNumber: 2, createdBy: 'Lili', createdAt: minsAgo(8),
      status: 'Open', clientName: null,
      items: [
        { id: 'oi1', menuItemName: 'Khorovats — pork', price: 4200, quantity: 2, status: 'Ready', notes: '' },
        { id: 'oi2', menuItemName: 'Areni reserve, glass', price: 1800, quantity: 2, status: 'Served', notes: '' },
        { id: 'oi3', menuItemName: 'Eech', price: 1400, quantity: 1, status: 'Preparing', notes: 'extra lemon' },
      ],
    },
    {
      id: 'o2', tableNumber: 3, createdBy: 'Lili', createdAt: minsAgo(22),
      status: 'Open', clientName: 'Hovhannes Vardanyan',
      items: [
        { id: 'oi4', menuItemName: 'Khorovats — chicken', price: 3600, quantity: 3, status: 'Served', notes: '' },
        { id: 'oi5', menuItemName: 'Spas', price: 1200, quantity: 3, status: 'Served', notes: '' },
        { id: 'oi6', menuItemName: 'Armenian coffee', price: 700, quantity: 3, status: 'Preparing', notes: '' },
      ],
    },
    {
      id: 'o3', tableNumber: 7, createdBy: 'Aro', createdAt: minsAgo(34),
      status: 'Open', clientName: null,
      items: [
        { id: 'oi7', menuItemName: 'Lamb kebab', price: 4400, quantity: 4, status: 'Ready', notes: '' },
        { id: 'oi8', menuItemName: 'Hummus', price: 1600, quantity: 2, status: 'Served', notes: '' },
        { id: 'oi9', menuItemName: 'Voskehat, glass', price: 1600, quantity: 4, status: 'Served', notes: '' },
        { id: 'oi10', menuItemName: 'Tutovka 50ml', price: 1500, quantity: 2, status: 'Pending', notes: '' },
      ],
    },
    {
      id: 'o4', tableNumber: 5, createdBy: 'Lili', createdAt: minsAgo(76),
      status: 'Paid', clientName: null,
      items: [
        { id: 'oi11', menuItemName: 'Khorovats — pork', price: 4200, quantity: 1, status: 'Served', notes: '' },
        { id: 'oi12', menuItemName: 'Areni reserve, bottle', price: 7800, quantity: 1, status: 'Served', notes: '' },
      ],
    },
    {
      id: 'o5', tableNumber: 8, createdBy: 'Aro', createdAt: minsAgo(124),
      status: 'Cancelled', clientName: null,
      items: [
        { id: 'oi13', menuItemName: 'Grilled vegetables', price: 2200, quantity: 1, status: 'Pending', notes: '' },
      ],
    },
  ];

  function minsAgo(m) {
    const d = new Date(Date.now() - m * 60_000);
    return d.toISOString();
  }
  function total(order) {
    return order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }
  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function elapsed(iso) {
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    return h + 'h ago';
  }

  return {
    session: { firstName: 'Aro', roleName: 'Admin', restaurantName: 'Tavern Yerevan' },
    categories, tables, orders,
    reservations: [
      { id: 'r1', time: '18:30', party: 4, name: 'Karen Petrosyan',  phone: '+374 91 234567', status: 'Confirmed', tableNumber: 4, note: 'Birthday' },
      { id: 'r2', time: '19:00', party: 2, name: 'Anna Hakobyan',    phone: '+374 77 887766', status: 'Confirmed', tableNumber: 1, note: '' },
      { id: 'r3', time: '19:30', party: 6, name: 'Vardanyan family', phone: '+374 95 112233', status: 'Pending',   tableNumber: 9, note: 'Window seat if possible' },
      { id: 'r4', time: '20:00', party: 2, name: 'Tigran Avetisyan', phone: '+374 99 445566', status: 'Confirmed', tableNumber: 5, note: '' },
      { id: 'r5', time: '20:30', party: 8, name: 'Marketing team',   phone: '+374 93 998877', status: 'Confirmed', tableNumber: 7, note: 'Corporate, single bill' },
      { id: 'r6', time: '21:00', party: 4, name: 'Saryan',           phone: '',                status: 'Pending',   tableNumber: null, note: '' },
    ],
    staff: [
      { id: 's1', name: 'Aro Antonyan',     role: 'Admin',    status: 'Active', email: 'aro@mail.ru' },
      { id: 's2', name: 'Lili Sargsyan',    role: 'Waiter',   status: 'Active', email: 'lili@mail.ru' },
      { id: 's3', name: 'Vahe Grigoryan',   role: 'Waiter',   status: 'Active', email: 'vahe@mail.ru' },
      { id: 's4', name: 'Anush Mkrtchyan',  role: 'Cashier',  status: 'Active', email: 'anush@mail.ru' },
      { id: 's5', name: 'Gor Manukyan',     role: 'Chef',     status: 'Pending', email: 'gor@mail.ru' },
      { id: 's6', name: 'Narek Hovsepyan',  role: 'Bartender', status: 'Active', email: 'narek@mail.ru' },
      { id: 's7', name: 'Mariam Sahakyan',  role: 'Waiter',   status: 'Inactive', email: 'mariam@mail.ru' },
    ],
    clients: [
      { id: 'cl1', fullName: 'Hovhannes Vardanyan', phone: '+374 91 100200', visits: 18, depositBalance: 12000 },
      { id: 'cl2', fullName: 'Lusine Babayan',      phone: '+374 77 332211', visits: 7,  depositBalance: 0 },
      { id: 'cl3', fullName: 'Ararat Petrosyan',    phone: '+374 95 443322', visits: 24, depositBalance: -3500 },
      { id: 'cl4', fullName: 'Karine Manvelyan',    phone: '+374 99 554433', visits: 3,  depositBalance: 8000 },
      { id: 'cl5', fullName: 'Tigran Khachatryan',  phone: '+374 93 665544', visits: 12, depositBalance: 0 },
    ],
    products: [
      { id: 'p1', name: 'Pork shoulder',     unit: 'kg',     stock: 8.4,  threshold: 10, category: 'Meat' },
      { id: 'p2', name: 'Chicken thigh',     unit: 'kg',     stock: 14.2, threshold: 8,  category: 'Meat' },
      { id: 'p3', name: 'Lamb',              unit: 'kg',     stock: 3.1,  threshold: 5,  category: 'Meat' },
      { id: 'p4', name: 'Tomato',            unit: 'kg',     stock: 22,   threshold: 15, category: 'Produce' },
      { id: 'p5', name: 'Lavash',            unit: 'pcs',    stock: 18,   threshold: 30, category: 'Bread' },
      { id: 'p6', name: 'Areni reserve',     unit: 'bottle', stock: 24,   threshold: 12, category: 'Wine' },
      { id: 'p7', name: 'Voskehat',          unit: 'bottle', stock: 6,    threshold: 12, category: 'Wine' },
      { id: 'p8', name: 'Espresso beans',    unit: 'kg',     stock: 1.8,  threshold: 2,  category: 'Bar' },
    ],
    cashLog: [
      { id: 'cx1', kind: 'Sale',      method: 'Card',          amount: 14600, time: minsAgo(12),  ref: 'Order #142, Table 5' },
      { id: 'cx2', kind: 'Sale',      method: 'Cash',          amount: 6800,  time: minsAgo(28),  ref: 'Order #141, Table 2' },
      { id: 'cx3', kind: 'Cash out',  method: 'Petty',         amount: -3500, time: minsAgo(64),  ref: 'Cleaning supplies' },
      { id: 'cx4', kind: 'Sale',      method: 'BankTransfer',  amount: 22400, time: minsAgo(78),  ref: 'Order #140, Table 7' },
      { id: 'cx5', kind: 'Sale',      method: 'Card',          amount: 8200,  time: minsAgo(112), ref: 'Order #139, Table 3' },
      { id: 'cx6', kind: 'Cash in',   method: 'Float',         amount: 50000, time: minsAgo(360), ref: 'Shift open' },
    ],
    activity: [
      { id: 'a1', who: 'Lili',  what: 'closed order #142 (Card · 14 600 ֏)',  time: minsAgo(12),  kind: 'order' },
      { id: 'a2', who: 'Lili',  what: 'created order at Table 2',              time: minsAgo(38),  kind: 'order' },
      { id: 'a3', who: 'Aro',   what: 'edited menu item "Khorovats — pork"',  time: minsAgo(86),  kind: 'menu' },
      { id: 'a4', who: 'Anush', what: 'cash out 3 500 ֏ (cleaning supplies)', time: minsAgo(64),  kind: 'cash' },
      { id: 'a5', who: 'Aro',   what: 'added Vahe Grigoryan as Waiter',        time: minsAgo(220), kind: 'staff' },
      { id: 'a6', who: 'Lili',  what: 'changed Table 4 to Reserved',           time: minsAgo(140), kind: 'tables' },
      { id: 'a7', who: 'Aro',   what: 'updated restaurant phone number',       time: minsAgo(280), kind: 'settings' },
    ],
    schedule: [
      // index 0..6 = Mon..Sun for current week
      { day: 'Mon', shifts: [{ who: 'Lili', from: '10:00', to: '18:00' }, { who: 'Vahe', from: '17:00', to: '00:00' }] },
      { day: 'Tue', shifts: [{ who: 'Lili', from: '10:00', to: '18:00' }, { who: 'Mariam', from: '17:00', to: '00:00' }] },
      { day: 'Wed', shifts: [{ who: 'Vahe', from: '10:00', to: '18:00' }] },
      { day: 'Thu', shifts: [{ who: 'Lili', from: '17:00', to: '00:00' }] },
      { day: 'Fri', shifts: [{ who: 'Lili', from: '10:00', to: '18:00' }, { who: 'Vahe', from: '17:00', to: '00:00' }, { who: 'Mariam', from: '18:00', to: '00:00' }] },
      { day: 'Sat', shifts: [{ who: 'Vahe', from: '10:00', to: '18:00' }, { who: 'Mariam', from: '17:00', to: '00:00' }] },
      { day: 'Sun', shifts: [] },
    ],
    fmt, total, formatTime, elapsed,
  };
})();
