// public/js/waiter.js
// מסך המלצר — ממשק מגע לאייפד.
// משתמש באותו api.js ובאותן נקודות קצה כמו פאנל הניהול; אין כאן שום קוד שרת חדש.
//
// מסכים: התחברות → מפת שולחנות → חשבון → בוחר מנות → הזמנות ממתינות.

const state = {
  user: null,
  tables: [],
  orders: [],        // חשבונות פתוחים בלבד
  customers: [],     // לקוחות שיושבים כרגע
  reservations: [],  // הזמנות שולחן ממתינות
  dishes: [],
  table: null,       // השולחן שנבחר
  order: null,       // החשבון של השולחן שנבחר
  category: 'all',
};

const $ = (id) => document.getElementById(id);
const CAT_HE = { starter: 'ראשונות', main: 'עיקריות', dessert: 'קינוחים', drink: 'שתייה' };
const STATUS_HE = { free: 'פנוי', occupied: 'תפוס', reserved: 'מוזמן' };
const money = (n) => '₪' + Number(n || 0).toLocaleString('he-IL');
const esc = (s) => { const d = document.createElement('div'); d.textContent = s ?? ''; return d.innerHTML; };
const timeHe = (iso) => new Date(iso).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' });

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
const VIEWS = ['login-view', 'floor-view', 'order-view', 'menu-view', 'res-view'];
function show(view) {
  VIEWS.forEach((v) => $(v).classList.toggle('hidden', v !== view));
  window.scrollTo(0, 0);
}

// ---------- עזרי חלונית ----------
function sheet(html) {
  $('sheet-host').innerHTML = `<div class="sheet-bg" id="sheet-bg"><div class="sheet">${html}</div></div>`;
  $('sheet-bg').onclick = (e) => { if (e.target.id === 'sheet-bg') closeSheet(); };
}
function closeSheet() { $('sheet-host').innerHTML = ''; }

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
  // ניתוב לפי תפקיד. מנהל שייך לפאנל הניהול — אלא אם בחר במפורש להיכנס לכאן
  // (הקישור מהפאנל מוסיף ?stay=1), למשל כשהוא מחליף משמרת של מלצר.
  const chose = new URLSearchParams(location.search).has('stay');
  if (user.role === 'manager' && !chose) {
    location.replace('/admin.html');
    return;
  }

  state.user = user;
  $('who').textContent = user.username;
  // מנהל שנמצא כאן מקבל דרך חזרה לפאנל
  $('to-admin').classList.toggle('hidden', user.role !== 'manager');
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
    // ארבע שליפות במקביל: שולחנות, חשבונות פתוחים, לקוחות יושבים, והזמנות ממתינות.
    const [tablesRes, ordersRes, custRes, resRes] = await Promise.all([
      API.get('/tables'),
      API.get('/orders?status=open'),
      API.get('/customers'),
      API.get('/reservations?status=pending'),
    ]);
    state.tables = tablesRes.data;
    state.orders = ordersRes.data;
    state.customers = custRes.data;
    state.reservations = resRes.data;

    // מונה ההזמנות הממתינות על הכפתור בסרגל
    const badge = $('res-count');
    badge.textContent = state.reservations.length;
    badge.classList.toggle('hidden', state.reservations.length === 0);

    $('floor').innerHTML = state.tables.map((t) => {
      const order = orderOf(t);
      const customer = customerOf(t);
      const reservation = reservationOf(t);

      // שורת המידע התחתונה משתנה לפי מצב השולחן
      let note = '';
      if (order) note = `<span class="ttotal">${money(order.total)}</span>`;
      else if (t.status === 'occupied') note = `<span class="tnote">${customer ? esc(customer.name) + ' · ' : ''}אין חשבון פתוח</span>`;
      else if (reservation) note = `<span class="tnote">${esc(reservation.customerName)}</span>`;

      return `
        <button class="tcard ${t.status}" data-table="${t.id}">
          <span class="tnum">${t.number}</span>
          <span class="tseats">${t.seats} מקומות</span>
          <span class="tstatus">${STATUS_HE[t.status]}</span>
          ${note}
        </button>`;
    }).join('');
  });
}

const orderOf = (table) => state.orders.find((o) => o.tableId === table.id);
const customerOf = (table) => state.customers.find((c) => c.tableId === table.id);
const reservationOf = (table) => state.reservations.find((r) => r.tableId === table.id);

// לחיצה על שולחן — ההתנהגות נגזרת ממצבו
$('floor').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-table]');
  if (!btn) return;
  const table = state.tables.find((t) => t.id === Number(btn.dataset.table));
  const order = orderOf(table);

  if (order) return openOrder(table, order);                 // חשבון פתוח → פתח אותו
  if (table.status === 'occupied') return occupiedSheet(table); // תפוס בלי חשבון → הזמנה חדשה / שחרור
  if (table.status === 'reserved') return reservedSheet(table); // מוזמן → הושב את ההזמנה
  freeTableSheet(table);                                      // פנוי → שב לקוח ופתח חשבון
});

// ---------- שולחן פנוי: שיבוץ לקוח + פתיחת חשבון ----------
function freeTableSheet(table) {
  sheet(`
    <h3>פתיחת שולחן ${table.number}</h3>
    <p>${table.seats} מקומות · פנוי</p>
    <div class="field">
      <label for="cname">שם הלקוח</label>
      <input type="text" id="cname" placeholder="אורח">
    </div>
    <div class="field">
      <label for="cphone">טלפון (לא חובה)</label>
      <input type="tel" id="cphone" placeholder="050-0000000">
    </div>
    <div class="row">
      <button class="btn btn-gold" id="ok">הושב ופתח חשבון</button>
      <button class="btn btn-ghost" id="cancel">ביטול</button>
    </div>`);

  $('cancel').onclick = closeSheet;
  $('ok').onclick = () => guard(async () => {
    const name = $('cname').value.trim() || 'אורח';
    const phone = $('cphone').value.trim();
    // שתי קריאות מאחורי כפתור אחד: שיבוץ הלקוח ואז פתיחת החשבון.
    await API.post('/customers', { name, phone, tableId: table.id });
    const res = await API.post('/orders', { tableId: table.id });
    closeSheet();
    toast(`שולחן ${table.number} נפתח`, 'ok');
    await loadFloor();
    openOrder(table, res.data);
  });
}

// ---------- שולחן תפוס בלי חשבון פתוח ----------
// זה המצב שנוצר אחרי סגירת חשבון: הלקוחות עדיין יושבים.
// שתי אפשרויות: להזמין שוב, או לשחרר את השולחן כשהם קמים.
function occupiedSheet(table) {
  const customer = customerOf(table);
  sheet(`
    <h3>שולחן ${table.number}</h3>
    <p>${customer ? esc(customer.name) + ' · ' : ''}תפוס, ללא חשבון פתוח</p>
    <div class="stack">
      <button class="btn btn-gold btn-full" id="neworder">פתיחת חשבון חדש</button>
      <button class="btn btn-danger btn-full" id="release">שחרור השולחן</button>
      <button class="btn btn-ghost btn-full" id="cancel">סגור</button>
    </div>`);

  $('cancel').onclick = closeSheet;

  // הלקוח כבר יושב — צריך רק לפתוח חשבון. השרת מקשר אותו אוטומטית.
  $('neworder').onclick = () => guard(async () => {
    const res = await API.post('/orders', { tableId: table.id });
    closeSheet();
    toast(`נפתח חשבון חדש לשולחן ${table.number}`, 'ok');
    await loadFloor();
    openOrder(table, res.data);
  });

  // שחרור = הסרת הלקוח. השרת משחרר את השולחן וחוסם אם יש חשבון פתוח.
  $('release').onclick = () => guard(async () => {
    if (!customer) throw new Error('לא נמצא לקוח לשולחן זה');
    await API.del(`/customers/${customer.id}`);
    closeSheet();
    toast(`שולחן ${table.number} שוחרר`, 'ok');
    loadFloor();
  });
}

// ---------- שולחן מוזמן: הושבת ההזמנה ----------
function reservedSheet(table) {
  const r = reservationOf(table);
  if (!r) {
    // סומן כמוזמן אבל אין הזמנה משויכת — מאפשרים לשחרר ידנית
    sheet(`
      <h3>שולחן ${table.number}</h3>
      <p>מסומן כמוזמן, אך לא נמצאה הזמנה משויכת.</p>
      <div class="stack">
        <button class="btn btn-green btn-full" id="free">סמן כפנוי</button>
        <button class="btn btn-ghost btn-full" id="cancel">סגור</button>
      </div>`);
    $('cancel').onclick = closeSheet;
    $('free').onclick = () => guard(async () => {
      await API.patch(`/tables/${table.id}/status`, { status: 'free' });
      closeSheet(); toast(`שולחן ${table.number} שוחרר`, 'ok'); loadFloor();
    });
    return;
  }

  sheet(`
    <h3>${esc(r.customerName)}</h3>
    <p>${r.partySize} סועדים · ${timeHe(r.reservationTime)}${r.phone ? ' · ' + esc(r.phone) : ''}</p>
    <div class="stack">
      <button class="btn btn-blue btn-full" id="seat">הושב בשולחן ${table.number}</button>
      <button class="btn btn-ghost btn-full" id="cancel">סגור</button>
    </div>`);

  $('cancel').onclick = closeSheet;
  $('seat').onclick = () => seatReservation(r, table.id);
}

// ============================================================
//  מסך הזמנות ממתינות
// ============================================================
$('open-res').addEventListener('click', () => {
  $('res-sub').textContent = `${state.reservations.length} ממתינות`;
  $('res-list').innerHTML = state.reservations.length
    ? state.reservations.map((r) => `
        <button class="rcard" data-res="${r.id}">
          <span class="rsize">${r.partySize}</span>
          <span class="rmain">
            <span class="rname">${esc(r.customerName)}</span>
            <span class="rmeta">${timeHe(r.reservationTime)}${r.phone ? ' · ' + esc(r.phone) : ''}${r.Table ? ' · שולחן ' + r.Table.number : ''}</span>
          </span>
        </button>`).join('')
    : '<p class="empty-state">אין הזמנות ממתינות</p>';
  show('res-view');
});

$('back-from-res').addEventListener('click', () => { show('floor-view'); loadFloor(); });

$('res-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-res]');
  if (!btn) return;
  const r = state.reservations.find((x) => x.id === Number(btn.dataset.res));
  const freeTables = state.tables.filter((t) => t.status === 'free');

  sheet(`
    <h3>${esc(r.customerName)}</h3>
    <p>${r.partySize} סועדים · ${timeHe(r.reservationTime)}</p>
    <div class="field">
      <label for="tsel">שולחן</label>
      <select id="tsel">
        <option value="">בחירה אוטומטית (לפי מספר הסועדים)</option>
        ${freeTables.map((t) => `<option value="${t.id}" ${r.tableId === t.id ? 'selected' : ''}>שולחן ${t.number} · ${t.seats} מקומות</option>`).join('')}
      </select>
    </div>
    <div class="row">
      <button class="btn btn-blue" id="seat">הושב</button>
      <button class="btn btn-ghost" id="cancel">ביטול</button>
    </div>`);

  $('cancel').onclick = closeSheet;
  $('seat').onclick = () => {
    const v = $('tsel').value;
    seatReservation(r, v ? Number(v) : undefined);
  };
});

// הושבת הזמנה: השרת בוחר/מאשר שולחן, יוצר לקוח ותופס את השולחן.
// מיד אחר כך פותחים חשבון, כדי שהמלצר יוכל להתחיל לקחת הזמנה.
async function seatReservation(reservation, tableId) {
  await guard(async () => {
    const res = await API.post(`/reservations/${reservation.id}/seat`, tableId ? { tableId } : {});
    const table = res.data.table;
    const order = await API.post('/orders', { tableId: table.id });
    closeSheet();
    toast(`${reservation.customerName} הושב בשולחן ${table.number}`, 'ok');
    await loadFloor();
    openOrder(state.tables.find((t) => t.id === table.id) || table, order.data);
  });
}

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
          <span class="nm">
            ${esc(it.Dish ? it.Dish.name : 'מנה')}
            ${it.notes ? `<span class="note">${esc(it.notes)}</span>` : ''}
          </span>
          <span class="pr">${money(it.quantity * it.priceAtOrder)}</span>
          <button class="rm" data-item="${it.id}" aria-label="הסר">✕</button>
        </div>`).join('')
      + `<div class="bill-total"><span>סה"כ</span><b>${money(o.total)}</b></div>`
    : '<div class="bill-empty">החשבון ריק — הוסף מנות</div>';
}

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

// סגירת חשבון — השולחן נשאר תפוס, כי הלקוחות עדיין יושבים.
$('close-bill').addEventListener('click', () => guard(async () => {
  if (!(state.order.OrderItems || []).length) return toast('החשבון ריק', 'err');
  const total = state.order.total;
  await API.patch(`/orders/${state.order.id}/close`);
  toast(`שולם ${money(total)} · השולחן נשאר תפוס`, 'ok');
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

// הערות מהירות — לחיצה אחת במקום הקלדה. מותאם לרוב הבקשות במסעדה.
const QUICK_NOTES = ['בלי בצל', 'בלי חריף', 'ללא גלוטן', 'מדיום', 'עשוי היטב', 'רוטב בצד', 'בלי מלח'];

// לחיצה על מנה פותחת חלונית: כמות + הערה, והוספה בפעולה אחת.
$('dishes').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dish]');
  if (!btn) return;
  const dish = state.dishes.find((d) => d.id === Number(btn.dataset.dish));
  openAddSheet(dish);
});

function openAddSheet(dish) {
  let qty = 1;

  sheet(`
    <h3>${esc(dish.name)}</h3>
    <p>${money(dish.price)} ליחידה</p>

    <div class="qty-row">
      <button class="qty-btn" id="minus" aria-label="הפחת">−</button>
      <span class="qty-val" id="qval">1</span>
      <button class="qty-btn" id="plus" aria-label="הוסף">+</button>
    </div>

    <div class="field">
      <label for="note">הערה למטבח</label>
      <input type="text" id="note" placeholder="לא חובה" autocomplete="off">
    </div>
    <div class="chips">
      ${QUICK_NOTES.map((n) => `<button class="chip" data-note="${esc(n)}">${esc(n)}</button>`).join('')}
    </div>

    <div class="row" style="margin-top:18px">
      <button class="btn btn-gold" id="add">הוסף <span id="sum">${money(dish.price)}</span></button>
      <button class="btn btn-ghost" id="cancel">ביטול</button>
    </div>`);

  const refresh = () => {
    $('qval').textContent = qty;
    $('sum').textContent = money(dish.price * qty);
    $('minus').disabled = qty <= 1;
  };
  refresh();

  $('minus').onclick = () => { if (qty > 1) { qty--; refresh(); } };
  $('plus').onclick = () => { qty++; refresh(); };

  // לחיצה על הערה מהירה מוסיפה אותה לשדה (ולחיצה חוזרת מסירה)
  $('sheet-host').querySelectorAll('[data-note]').forEach((c) => {
    c.onclick = () => {
      const input = $('note');
      const val = c.dataset.note;
      const parts = input.value.split('·').map((s) => s.trim()).filter(Boolean);
      const i = parts.indexOf(val);
      if (i >= 0) parts.splice(i, 1); else parts.push(val);
      input.value = parts.join(' · ');
      c.classList.toggle('on', i < 0);
    };
  });

  $('cancel').onclick = closeSheet;
  $('add').onclick = () => guard(async () => {
    const res = await API.post(`/orders/${state.order.id}/items`, {
      dishId: dish.id,
      quantity: qty,
      notes: $('note').value.trim() || null,
    });
    state.order = res.data;
    renderBill();
    closeSheet();
    toast(`${qty}× ${dish.name} · ${money(state.order.total)}`, 'ok');
  });
}

init();
