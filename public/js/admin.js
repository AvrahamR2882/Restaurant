// public/js/admin.js
// לוגיקת פאנל הניהול: התחברות (JWT), ניווט בין לשוניות, וניהול כל הישויות מול ה-API.

const state = { user: null, orderFilter: '', dishesCache: [] };

// ---------- כלי עזר ----------
const $ = (id) => document.getElementById(id);
function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `show ${type}`;
  setTimeout(() => (t.className = ''), 2800);
}
function esc(s) { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; }
const CAT_HE = { starter: 'ראשונה', main: 'עיקרית', dessert: 'קינוח', drink: 'שתייה' };
const STATUS_HE = {
  free: 'פנוי', reserved: 'מוזמן', occupied: 'תפוס',
  open: 'פתוחה', closed: 'סגורה', cancelled: 'בוטלה',
  pending: 'ממתינה', seated: 'הושבה',
};

// עוטף קריאת API עם טיפול שגיאות אחיד (מציג toast עם ההודעה מהשרת)
async function guard(fn) {
  try { await fn(); }
  catch (err) { toast(err.message, 'error'); }
}

// ============================================================
//  אימות
// ============================================================
async function init() {
  if (API.getToken()) {
    try {
      const me = await API.get('/auth/me');
      return showApp(me.data);
    } catch { API.clearToken(); }
  }
  showLogin();
}
function showLogin() {
  $('login-view').classList.remove('hidden');
  $('app-view').classList.add('hidden');
}
function showApp(user) {
  state.user = user;
  $('login-view').classList.add('hidden');
  $('app-view').classList.remove('hidden');
  $('who-name').textContent = user.username;
  $('who-role').textContent = user.role === 'manager' ? 'מנהל' : 'מלצר';
  // מסתיר פעולות שמורות-למנהל אם המשתמש מלצר
  document.querySelectorAll('.manager-only')
    .forEach((el) => el.classList.toggle('hidden', user.role !== 'manager'));
  loadDishes();
}

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  $('login-note').textContent = '';
  guard(async () => {
    try {
      const res = await API.post('/auth/login', {
        username: $('login-username').value.trim(),
        password: $('login-password').value,
      });
      API.setToken(res.token);
      showApp(res.data);
    } catch (err) {
      $('login-note').textContent = err.message;
    }
  });
});
$('logout-btn').addEventListener('click', () => { API.clearToken(); showLogin(); });

// ============================================================
//  ניווט בין לשוניות
// ============================================================
const LOADERS = {
  dishes: loadDishes, tables: loadTables, customers: loadCustomers,
  reservations: loadReservations, orders: loadOrders, staff: loadStaff,
};
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $(`panel-${tab.dataset.tab}`).classList.add('active');
    LOADERS[tab.dataset.tab]();
  });
});

// ============================================================
//  מנות (Dishes)
// ============================================================
async function loadDishes() {
  await guard(async () => {
    const res = await API.get('/dishes');
    state.dishesCache = res.data;
    const el = $('dishes-list');
    if (!res.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-dish"/></svg></span>אין מנות</div>'; return; }
    const isManager = state.user.role === 'manager';
    el.innerHTML = res.data.map((d) => `
      <div class="row">
        <div class="r-main">
          <div class="r-title">${esc(d.name)}</div>
          <div class="r-sub">${CAT_HE[d.category]}${d.description ? ' · ' + esc(d.description) : ''}</div>
        </div>
        <span class="price">₪${d.price}</span>
        ${isManager ? `<button class="btn btn-danger btn-sm" data-del-dish="${d.id}">מחק</button>` : ''}
      </div>`).join('');
  });
}
$('dish-add').addEventListener('click', () => guard(async () => {
  const body = {
    name: $('dish-name').value.trim(),
    description: $('dish-description').value.trim() || null,
    price: parseFloat($('dish-price').value),
    category: $('dish-category').value,
  };
  await API.post('/dishes', body);
  $('dish-name').value = ''; $('dish-price').value = ''; $('dish-description').value = '';
  toast('המנה נוספה ✅', 'success');
  loadDishes();
}));
$('dishes-list').addEventListener('click', (e) => {
  const id = e.target.dataset.delDish;
  if (id) guard(async () => { await API.del(`/dishes/${id}`); toast('נמחק'); loadDishes(); });
});

// ============================================================
//  שולחנות (Tables)
// ============================================================
async function loadTables() {
  await guard(async () => {
    const res = await API.get('/tables');
    const el = $('tables-list');
    if (!res.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-table"/></svg></span>אין שולחנות</div>'; return; }
    const isManager = state.user.role === 'manager';
    el.innerHTML = res.data.map((t) => `
      <div class="row">
        <div class="r-main">
          <div class="r-title">שולחן ${t.number}</div>
          <div class="r-sub">${t.seats} מקומות</div>
        </div>
        <span class="badge b-${t.status}">${STATUS_HE[t.status]}</span>
        <select data-status-table="${t.id}" class="btn-sm" style="width:auto;padding:6px 10px">
          ${['free', 'reserved', 'occupied'].map((s) => `<option value="${s}" ${s === t.status ? 'selected' : ''}>${STATUS_HE[s]}</option>`).join('')}
        </select>
        ${isManager ? `<button class="btn btn-danger btn-sm" data-del-table="${t.id}">מחק</button>` : ''}
      </div>`).join('');
  });
}
$('table-add').addEventListener('click', () => guard(async () => {
  const body = { seats: parseInt($('table-seats').value, 10) };
  const num = $('table-number').value;
  if (num) body.number = parseInt(num, 10);
  await API.post('/tables', body);
  $('table-seats').value = ''; $('table-number').value = '';
  toast('השולחן נוסף ✅', 'success');
  loadTables();
}));
$('tables-list').addEventListener('click', (e) => {
  const id = e.target.dataset.delTable;
  if (id) guard(async () => { await API.del(`/tables/${id}`); toast('נמחק'); loadTables(); });
});
$('tables-list').addEventListener('change', (e) => {
  const id = e.target.dataset.statusTable;
  if (id) guard(async () => {
    await API.patch(`/tables/${id}/status`, { status: e.target.value });
    toast('הסטטוס עודכן'); loadTables();
  });
});

// ============================================================
//  לקוחות (Customers)
// ============================================================
async function loadCustomers() {
  await guard(async () => {
    const [custRes, tablesRes] = await Promise.all([API.get('/customers'), API.get('/tables')]);
    // ממלא את רשימת השולחנות הפנויים בטופס השיבוץ
    const free = tablesRes.data.filter((t) => t.status === 'free');
    $('cust-table').innerHTML = '<option value="">— אוטומטי (פנוי ראשון) —</option>' +
      free.map((t) => `<option value="${t.id}">שולחן ${t.number} (${t.seats} מק')</option>`).join('');

    const el = $('customers-list');
    if (!custRes.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-customer"/></svg></span>אין לקוחות יושבים</div>'; return; }
    el.innerHTML = custRes.data.map((c) => `
      <div class="row">
        <div class="r-main">
          <div class="r-title">${esc(c.name)}</div>
          <div class="r-sub">${esc(c.phone) || '—'} · ${c.Table ? 'שולחן ' + c.Table.number : 'ללא שולחן'}</div>
        </div>
        <button class="btn btn-danger btn-sm" data-del-cust="${c.id}">שחרר</button>
      </div>`).join('');
  });
}
$('cust-add').addEventListener('click', () => guard(async () => {
  const body = { name: $('cust-name').value.trim(), phone: $('cust-phone').value.trim() };
  const tid = $('cust-table').value;
  if (tid) body.tableId = parseInt(tid, 10);
  await API.post('/customers', body);
  $('cust-name').value = ''; $('cust-phone').value = '';
  toast('הלקוח שובץ 🪑', 'success');
  loadCustomers();
}));
$('customers-list').addEventListener('click', (e) => {
  const id = e.target.dataset.delCust;
  if (id) guard(async () => { await API.del(`/customers/${id}`); toast('שוחרר'); loadCustomers(); });
});

// ============================================================
//  הזמנות שולחן (Reservations)
// ============================================================
async function loadReservations() {
  await guard(async () => {
    const [res, tablesRes] = await Promise.all([API.get('/reservations'), API.get('/tables')]);
    // שולחנות שאפשר להושיב בהם — כל מה שאינו תפוס
    const seatable = tablesRes.data.filter((t) => t.status !== 'occupied');

    const el = $('reservations-list');
    if (!res.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-reservation"/></svg></span>אין הזמנות שולחן</div>'; return; }
    el.innerHTML = res.data.map((r) => {
      const when = new Date(r.reservationTime).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });
      const tableOptions = seatable
        .map((t) => `<option value="${t.id}" ${r.tableId === t.id ? 'selected' : ''}>שולחן ${t.number} · ${t.seats} מק׳</option>`)
        .join('');
      return `
      <div class="row">
        <div class="r-main">
          <div class="r-title">${esc(r.customerName)} <span class="badge b-${r.status}">${STATUS_HE[r.status]}</span></div>
          <div class="r-sub">${esc(r.phone) || '—'} · ${r.partySize} סועדים · ${when}${r.Table ? ' · שולחן ' + r.Table.number : ''}</div>
        </div>
        <div class="r-actions">
          ${r.status === 'pending' ? `
            <select data-table-for="${r.id}" style="width:auto;padding:6px 10px;font-size:.82rem">
              <option value="">שולחן: אוטומטי</option>
              ${tableOptions}
            </select>
            <button class="btn btn-green btn-sm" data-seat-res="${r.id}">הושב</button>` : ''}
          <button class="btn btn-danger btn-sm" data-del-res="${r.id}">בטל</button>
        </div>
      </div>`;
    }).join('');
  });
}
$('reservations-list').addEventListener('click', (e) => {
  const seatId = e.target.dataset.seatRes;
  const delId = e.target.dataset.delRes;
  if (seatId) guard(async () => {
    // אם נבחר שולחן ספציפי נשלח אותו; אחרת השרת יבחר אוטומטית לפי מספר הסועדים.
    const sel = document.querySelector(`[data-table-for="${seatId}"]`);
    const body = sel && sel.value ? { tableId: parseInt(sel.value, 10) } : {};
    const r = await API.post(`/reservations/${seatId}/seat`, body);
    toast(r.message || 'הלקוח הושב', 'success');
    loadReservations();
  });
  if (delId) guard(async () => { await API.del(`/reservations/${delId}`); toast('ההזמנה בוטלה'); loadReservations(); });
});

// ============================================================
//  הזמנות אוכל (Orders)
// ============================================================
document.querySelectorAll('#order-filters .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('#order-filters .chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    state.orderFilter = chip.dataset.filter;
    loadOrders();
  });
});

async function loadOrders() {
  await guard(async () => {
    const q = state.orderFilter ? `?status=${state.orderFilter}` : '';
    const [ordersRes, tablesRes] = await Promise.all([
      API.get(`/orders${q}`), API.get('/tables'),
    ]);

    // התפריט כמעט לא משתנה תוך כדי משמרת — נטען פעם אחת ונשמר במטמון, כדי לא
    // לבזבז בקשה בכל רענון של רשימת ההזמנות (לשונית התפריט מרעננת את המטמון).
    if (!state.dishesCache.length) {
      state.dishesCache = (await API.get('/dishes')).data;
    }

    // ממלא את רשימת השולחנות התפוסים לפתיחת הזמנה
    const occupied = tablesRes.data.filter((t) => t.status === 'occupied');
    $('order-table').innerHTML = '<option value="">בחר שולחן...</option>' +
      occupied.map((t) => `<option value="${t.id}">שולחן ${t.number}</option>`).join('');

    const el = $('orders-list');
    if (!ordersRes.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-order"/></svg></span>אין הזמנות</div>'; return; }
    el.innerHTML = ordersRes.data.map(renderOrder).join('');
  });
}

function renderOrder(o) {
  const isOpen = o.status === 'open';
  const items = (o.OrderItems || []).map((it) => `
    <div class="order-item">
      <span>${it.quantity} × ${esc(it.Dish ? it.Dish.name : 'מנה')}</span>
      <span>₪${it.quantity * it.priceAtOrder}
        ${isOpen ? `<button class="btn btn-ghost btn-sm" data-del-item="${o.id}:${it.id}" style="margin-inline-start:6px">✕</button>` : ''}
      </span>
    </div>`).join('') || '<div class="r-sub">אין מנות עדיין</div>';

  const dishOptions = state.dishesCache
    .map((d) => `<option value="${d.id}">${esc(d.name)} · ₪${d.price}</option>`).join('');

  return `
    <div class="order">
      <div class="order-top">
        <div class="order-id">${o.id}</div>
        <div class="r-main">
          <div class="r-title">${o.Customer ? esc(o.Customer.name) : 'ללא לקוח'}</div>
          <div class="r-sub">${o.Table ? 'שולחן ' + o.Table.number : '—'}</div>
        </div>
        <span class="badge b-${o.status}">${STATUS_HE[o.status]}</span>
      </div>
      <div class="order-items">${items}</div>
      <div class="order-total"><span>סה"כ</span><span class="price">₪${o.total}</span></div>
      ${isOpen ? `
      <div class="order-actions">
        <select data-dish-for="${o.id}" style="width:auto;padding:7px 10px">${dishOptions}</select>
        <input type="number" min="1" value="1" data-qty-for="${o.id}" style="width:64px;padding:7px" title="כמות">
        <button class="btn btn-gold btn-sm" data-add-item="${o.id}">הוסף מנה</button>
        <span class="spacer" style="margin-inline-start:auto"></span>
        <button class="btn btn-green btn-sm" data-close="${o.id}">סגור חשבון</button>
        <button class="btn btn-danger btn-sm" data-cancel="${o.id}">בטל</button>
      </div>` : ''}
    </div>`;
}

$('order-create').addEventListener('click', () => guard(async () => {
  const tid = $('order-table').value;
  if (!tid) return toast('בחר שולחן', 'error');
  await API.post('/orders', { tableId: parseInt(tid, 10) });
  toast('ההזמנה נפתחה 🎉', 'success');
  loadOrders();
}));

$('orders-list').addEventListener('click', (e) => {
  const el = e.target;
  if (el.dataset.addItem) {
    const oid = el.dataset.addItem;
    const dishId = document.querySelector(`[data-dish-for="${oid}"]`).value;
    const qty = parseInt(document.querySelector(`[data-qty-for="${oid}"]`).value, 10) || 1;
    guard(async () => { await API.post(`/orders/${oid}/items`, { dishId: parseInt(dishId, 10), quantity: qty }); toast('המנה נוספה'); loadOrders(); });
  }
  if (el.dataset.delItem) {
    const [oid, itemId] = el.dataset.delItem.split(':');
    guard(async () => { await API.del(`/orders/${oid}/items/${itemId}`); loadOrders(); });
  }
  if (el.dataset.close) guard(async () => { await API.patch(`/orders/${el.dataset.close}/close`); toast('החשבון נסגר 💳', 'success'); loadOrders(); });
  if (el.dataset.cancel) guard(async () => { await API.patch(`/orders/${el.dataset.cancel}/cancel`); toast('ההזמנה בוטלה'); loadOrders(); });
});

// ============================================================
//  צוות (Staff / Users) — מנהל בלבד
// ============================================================
async function loadStaff() {
  await guard(async () => {
    const res = await API.get('/auth/users');
    const el = $('staff-list');
    if (!res.data.length) { el.innerHTML = '<div class="empty"><span class="ic"><svg><use href="#i-staff"/></svg></span>אין עובדים</div>'; return; }
    el.innerHTML = res.data.map((u) => {
      const roleHe = u.role === 'manager' ? 'מנהל' : 'מלצר';
      const roleCls = u.role === 'manager' ? 'b-reserved' : 'b-open';
      const isMe = u.id === state.user.id;
      return `
      <div class="row">
        <div class="r-main">
          <div class="r-title">${esc(u.username)} <span class="badge ${roleCls}">${roleHe}</span></div>
          <div class="r-sub">${esc(u.email)}</div>
        </div>
        ${isMe
          ? '<span class="r-sub">(אתה)</span>'
          : `<button class="btn btn-danger btn-sm" data-del-user="${u.id}">מחק</button>`}
      </div>`;
    }).join('');
  });
}
$('staff-add').addEventListener('click', () => guard(async () => {
  const body = {
    username: $('staff-username').value.trim(),
    email: $('staff-email').value.trim(),
    password: $('staff-password').value,
    role: $('staff-role').value,
  };
  await API.post('/auth/register', body);
  $('staff-username').value = ''; $('staff-email').value = ''; $('staff-password').value = '';
  toast('העובד נוסף ✅', 'success');
  loadStaff();
}));
$('staff-list').addEventListener('click', (e) => {
  const id = e.target.dataset.delUser;
  if (id) guard(async () => { await API.del(`/auth/users/${id}`); toast('העובד נמחק'); loadStaff(); });
});

// ---------- אתחול ----------
init();
