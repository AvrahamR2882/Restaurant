// utils/seed.js
// סקריפט זריעה — יוצר משתמש מנהל ראשוני + נתוני דמו (מנות, שולחנות, מלצר).
// הרצה: npm run seed
// בטוח להרצה חוזרת (idempotent) — משתמש ב-findOrCreate כדי לא ליצור כפילויות.

require('dotenv').config();
const db = require('../models');

const DISHES = [
  { name: 'קרפצ׳יו סלק', price: 42, category: 'starter' },
  { name: 'סלט חלומי', price: 48, category: 'starter' },
  { name: 'פוקצ׳ה הבית', price: 32, category: 'starter' },
  { name: 'אנטריקוט 300ג׳', price: 142, category: 'main' },
  { name: 'סלמון בגריל', price: 118, category: 'main' },
  { name: 'ניוקי ברוטב שמנת', price: 74, category: 'main' },
  { name: 'המבורגר הבית', price: 68, category: 'main' },
  { name: 'קרם ברולה', price: 38, category: 'dessert' },
  { name: 'מלבי', price: 32, category: 'dessert' },
  { name: 'לימונדה בזיליקום', price: 18, category: 'drink' },
  { name: 'יין הבית (כוס)', price: 34, category: 'drink' },
];

const TABLES = [
  { number: 1, seats: 2 },
  { number: 2, seats: 2 },
  { number: 3, seats: 4 },
  { number: 4, seats: 4 },
  { number: 5, seats: 6 },
];

async function seed() {
  try {
    // יוצר את הטבלאות אם אינן קיימות (לא מוחק נתונים קיימים)
    await db.sequelize.sync();

    // ---- משתמש מנהל ראשוני (מתוך .env) ----
    const [admin, adminCreated] = await db.User.findOrCreate({
      where: { username: process.env.SEED_ADMIN_USERNAME || 'admin' },
      defaults: {
        email: process.env.SEED_ADMIN_EMAIL || 'admin@restaurant.local',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
        role: 'manager',
      },
    });

    // ---- מלצר לדוגמה ----
    const [, waiterCreated] = await db.User.findOrCreate({
      where: { username: 'waiter' },
      defaults: { email: 'waiter@restaurant.local', password: 'waiter123', role: 'waiter' },
    });

    // ---- מנות ----
    let dishCount = 0;
    for (const dish of DISHES) {
      const [, created] = await db.Dish.findOrCreate({ where: { name: dish.name }, defaults: dish });
      if (created) dishCount++;
    }

    // ---- שולחנות ----
    let tableCount = 0;
    for (const table of TABLES) {
      const [, created] = await db.Table.findOrCreate({ where: { number: table.number }, defaults: table });
      if (created) tableCount++;
    }

    console.log('✅ Seed complete:');
    console.log(`   Manager: ${admin.username} (${adminCreated ? 'created' : 'already existed'})`);
    console.log(`   Waiter:  waiter (${waiterCreated ? 'created' : 'already existed'})`);
    console.log(`   Dishes:  +${dishCount} new (${DISHES.length} total)`);
    console.log(`   Tables:  +${tableCount} new (${TABLES.length} total)`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
