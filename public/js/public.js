// public/js/public.js
// לוגיקת האתר הציבורי: טעינת התפריט מה-API, ושליחת טופס הזמנת שולחן.

// שמות הקטגוריות בעברית + סדר התצוגה
const CATEGORY_LABELS = {
  starter: 'ראשונות, לחמים וגבינות',
  main: 'מנות עיקריות',
  dessert: 'קינוחים',
  drink: 'תפריט היינות',
};
const CATEGORY_ORDER = ['starter', 'main', 'dessert', 'drink'];

// ---------- טעינת התפריט ----------
async function loadMenu() {
  const container = document.getElementById('menu-cats');
  try {
    const res = await API.get('/dishes');
    const dishes = res.data || [];

    if (!dishes.length) {
      container.innerHTML = '<p class="menu-empty">התפריט מתעדכן — בקרוב כאן.</p>';
      return;
    }

    // קיבוץ המנות לפי קטגוריה
    const byCat = {};
    for (const dish of dishes) {
      (byCat[dish.category] = byCat[dish.category] || []).push(dish);
    }

    // כל קטגוריה = מקטע ברוחב מלא; המנות בתוכה מסודרות בשתי עמודות.
    container.innerHTML = CATEGORY_ORDER
      .filter((cat) => byCat[cat])
      .map((cat) => `
        <section class="menu-cat">
          <h3>${CATEGORY_LABELS[cat]}</h3>
          <div class="menu-cat-items">
            ${byCat[cat].map(renderMenuItem).join('')}
          </div>
        </section>`)
      .join('');
  } catch (err) {
    container.innerHTML = `<p class="menu-empty">לא ניתן לטעון את התפריט כרגע (${err.message})</p>`;
  }
}

function renderMenuItem(dish) {
  const cls = dish.available ? 'menu-item' : 'menu-item unavailable';
  // התיאור אופציונלי — מנה בלי תיאור תוצג עם השם והמחיר בלבד.
  const desc = dish.description
    ? `<p class="mi-desc">${escapeHtml(dish.description)}</p>`
    : '';
  return `
    <div class="${cls}">
      <div class="mi-head">
        <h4 class="mi-name">${escapeHtml(dish.name)}</h4>
        <span class="mi-dots"></span>
        <span class="mi-price">₪${dish.price}</span>
      </div>
      ${desc}
    </div>`;
}

// ---------- טופס הזמנת שולחן ----------
function initReservationForm() {
  const form = document.getElementById('reserve-form');
  const note = document.getElementById('reserve-note');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    note.className = 'form-note';
    note.textContent = 'שולח...';

    const payload = {
      customerName: form.customerName.value.trim(),
      phone: form.phone.value.trim(),
      partySize: parseInt(form.partySize.value, 10),
      reservationTime: form.reservationTime.value, // ISO מה-input datetime-local
    };

    try {
      await API.post('/reservations', payload);
      note.className = 'form-note success';
      note.textContent = `תודה ${payload.customerName}! הזמנתך התקבלה ונחזור אליך לאישור. 🎉`;
      form.reset();
    } catch (err) {
      note.className = 'form-note error';
      note.textContent = `אירעה שגיאה: ${err.message}`;
    }
  });
}

// ---------- תפריט ניווט במובייל ----------
function initNav() {
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (!toggle) return;
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  // סגירת התפריט בלחיצה על קישור
  links.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => links.classList.remove('open'))
  );
}

// ---------- עזר: מניעת HTML injection ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- אתחול ----------
document.addEventListener('DOMContentLoaded', () => {
  loadMenu();
  initReservationForm();
  initNav();
  // מגדיר מינימום לתאריך ההזמנה = עכשיו
  const dt = document.getElementById('reservationTime');
  if (dt) dt.min = new Date().toISOString().slice(0, 16);
});
