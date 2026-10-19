// public/js/waiter.js
// מסך המלצר — ממשק מגע לאייפד.
// משתמש באותו api.js ובאותן נקודות קצה כמו פאנל הניהול; אין כאן שום קוד שרת חדש.
//
// 4 מסכים: התחברות → מפת שולחנות → חשבון → בוחר מנות.

const state = {
  user: null,
  tables: [],
  orders: [],       // הזמנות פתוחות בלבד
  dishes: [],
  table: null,      // השולחן שנבחר
  order: null,      // החשבון של השולחן שנבחר
  category: 'all',
};

const $ = (id) => document.getElementById(id);
const CAT_HE = { starter: 'ראשונות', main: 'עיקריות', dessert: 'קינוחים', drink: 'שתייה' };
const STATUS_HE = { free: 'פנוי', occupied: 'תפוס', reserved: 'מוזמן' };
const money = (n) => '₪' + Number(n || 0).toLocaleString('he-IL');
const esc = (s) => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = ''), 2600);
}

// עוטף כל פעולה: שגיאה מהשרת מוצגת כטוסט במקום להפיל את המסך
async function guard(fn) {
  try { await fn(); }
  catch (err) { toast(err.message, 'err'); }
}

// ---------- ניווט בין המסכים ----------
const VIEWS = ['login-view', 'floor-view', 'order-view', 'menu-view'];
function show(view) {
  VIEWS.forEach((v) => $(v).classList.toggle('hidden', v !== view));
  window.scrollTo(0, 0);
}

// ============================================================
//  התחברות
// ============================================================
async function init() {
  if (API.getToken()) {
    try {
      const me = await API.get('/auth/me');
      return start(me.data);
    } catch { API.clearToken(); }
  }
  show('login-view');
}

function start(user) {
  state.user = user;
  $('who').textContent = user.username;
  show('floor-view');
  loadFloor();
}

$('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  $('login-note').textContent = '';
  guard(async () => {
    try {
      const res = await API.post('/auth/login', {
        username: $('u').value.trim(),
        password: $('p').value,
      });
      API.setToken(res.token);
      start(res.data);
    } catch (err) {
      $('login-note').textContent = err.message;
    }
  });
});

$('logout').addEventListener('click', () => { API.clearToken(); location.reload(); });
$('refresh').addEventListener('click', () => loadFloor());

// ============================================================
//  מסך 1 — מפת השולחנות
// ============================================================
async function loadFloor() {
  await guard(async () => {
    // שתי בקשות במקביל: השולחנות, והחשבונות הפתוחים (כדי להציג סכום על הכרטיס)
    const [tablesRes, ordersRes] = await Promise.all([
      API.get('/tables'),
      API.get('/orders?status=open'),
    ]);
    state.tables = tablesRes.data;
    state.orders = ordersRes.data;

    $('floor').innerHTML = state.tables.map((t) => {
      const order = state.orders.find((o) => o.tableId === t.id);
      return `
        <button class="tcard ${t.status}" data-table="${t.id}">
          <span class="tnum">${t.number}</span>
          <span class="tseats">${t.seats} מקומות</span>
          <span class="tstatus">${STATUS_HE[t.status]}</span>
          ${order ? `<span class="ttotal">${money(order.total)}</span>` : ''}
        </button>`;
    }).join('');
  });
}

$('floor').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-table]');
  if (!btn) return;
  const table = state.tables.find((t) => t.id === Number(btn.dataset.table));
  const order = state.orders.find((o) => o.tableId === table.id);

  if (order) return openOrder(table, order);     // יש חשבון פתוח → פתח אותו
  openTableSheet(table);                          // אין → הצע לפתוח שולחן
});

// ---------- חלונית "פתיחת שולחן" ----------
function openTableSheet(table) {
  $('sheet-host').innerHTML = `
    <div class="sheet-bg" id="sheet-bg">
      <div class="sheet">
        <h3>פתיחת שולחן ${table.number}</h3>
        <p>${table.seats} מקומות · ${STATUS_HE[table.status]}</p>
        <div class="field">
          <label for="cname">שם הלקוח (לא חובה)</label>
          <input type="text" id="cname" placeholder="אורח">
        </div>
        <div class="row">
          <button class="btn btn-gold" id="sheet-ok">פתח שולחן</button>
          <button class="btn btn-ghost" id="sheet-cancel">ביטול</button>
        </div>
      </div>
    </div>`;

  $('sheet-cancel').onclick = closeSheet;
  $('sheet-bg').onclick = (e) => { if (e.target.id === 'sheet-bg') closeSheet(); };
  $('sheet-ok').onclick = () => guard(async () => {
    const name = $('cname').value.trim() || 'אורח';
    // שתי קריאות מאחורי כפתור אחד: שיבוץ הלקוח ואז פתיחת החשבון.
    await API.post('/customers', { name, tableId: table.id });
    const res = await API.post('/orders', { tableId: table.id });
    closeSheet();
    toast(`שולחן ${table.number} נפתח`, 'ok');
    openOrder(table, res.data);
  });
}
function closeSheet() { $('sheet-host').innerHTML = ''; }

// ============================================================
//  מסך 2 — החשבון
// ============================================================
function openOrder(table, order) {
  state.table = table;
  state.order = order;
  $('order-title').textContent = `שולחן ${table.number}`;
  $('order-sub').textContent = order.Customer ? order.Customer.name : '';
  renderBill();
  show('order-view');
}

function renderBill() {
  const o = state.order;
  const items = o.OrderItems || [];
  $('bill').innerHTML = items.length
    ? items.map((it) => `
        <div class="bill-row">
          <span class="q">${it.quantity}</span>
          <span class="nm">${esc(it.Dish ? it.Dish.name : 'מנה')}</span>
          <span class="pr">${money(it.quantity * it.priceAtOrder)}</span>
          <button class="rm" data-item="${it.id}" aria-label="הסר">✕</button>
        </div>`).join('')
      + `<div class="bill-total"><span>סה"כ</span><b>${money(o.total)}</b></div>`
    : '<div class="bill-empty">החשבון ריק — הוסף מנות</div>';
}

// רענון החשבון מהשרת אחרי כל שינוי
async function reloadOrder() {
  const res = await API.get(`/orders/${state.order.id}`);
  state.order = res.data;
  renderBill();
}

$('bill').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-item]');
  if (!btn) return;
  guard(async () => {
    await API.del(`/orders/${state.order.id}/items/${btn.dataset.item}`);
    await reloadOrder();
  });
});

$('back-floor').addEventListener('click', () => { show('floor-view'); loadFloor(); });

$('close-bill').addEventListener('click', () => guard(async () => {
  if (!(state.order.OrderItems || []).length) return toast('החשבון ריק', 'err');
  await API.patch(`/orders/${state.order.id}/close`);
  toast(`שולחן ${state.table.number} נסגר · ${money(state.order.total)}`, 'ok');
  show('floor-view');
  loadFloor();
}));

$('cancel-bill').addEventListener('click', () => guard(async () => {
  await API.patch(`/orders/${state.order.id}/cancel`);
  toast('החשבון בוטל והשולחן שוחרר');
  show('floor-view');
  loadFloor();
}));

// ============================================================
//  מסך 3 — בוחר המנות
// ============================================================
$('add-dish').addEventListener('click', () => guard(async () => {
  if (!state.dishes.length) {
    state.dishes = (await API.get('/dishes')).data;   // נטען פעם אחת ונשמר
  }
  $('menu-sub').textContent = `שולחן ${state.table.number}`;
  renderCats();
  renderDishes();
  show('menu-view');
}));

$('back-order').addEventListener('click', () => { show('order-view'); });

function renderCats() {
  const cats = ['all', ...new Set(state.dishes.map((d) => d.category))];
  $('cats').innerHTML = cats.map((c) => `
    <button class="cat ${c === state.category ? 'active' : ''}" data-cat="${c}">
      ${c === 'all' ? 'הכל' : (CAT_HE[c] || c)}
    </button>`).join('');
}

function renderDishes() {
  const list = state.category === 'all'
    ? state.dishes
    : state.dishes.filter((d) => d.category === state.category);

  $('dishes').innerHTML = list.map((d) => `
    <button class="dcard" data-dish="${d.id}">
      <span class="dn">${esc(d.name)}</span>
      <span class="dp">${money(d.price)}</span>
    </button>`).join('');
}

$('cats').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-cat]');
  if (!btn) return;
  state.category = btn.dataset.cat;
  renderCats();
  renderDishes();
});

// לחיצה על מנה = הוספה מיידית. נשארים במסך כדי להוסיף עוד.
$('dishes').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dish]');
  if (!btn) return;
  const dish = state.dishes.find((d) => d.id === Number(btn.dataset.dish));
  guard(async () => {
    const res = await API.post(`/orders/${state.order.id}/items`, { dishId: dish.id, quantity: 1 });
    state.order = res.data;
    renderBill();
    toast(`${dish.name} · ${money(state.order.total)}`, 'ok');
  });
});

init();
