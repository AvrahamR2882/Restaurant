// server.js
// נקודת הכניסה של האפליקציה.
// אחראי על: טעינת משתני סביבה, חיבור ל-DB, הרכבת ה-middleware והנתיבים,
// והרמת השרת. נרחיב את הקובץ בכל שלב (נתיבים, אבטחה, static, טיפול שגיאות).

require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const db = require('./models');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');

// ---- ייבוא נתיבים ----
const authRoutes = require('./routes/auth.routes');
const dishRoutes = require('./routes/dish.routes');
const tableRoutes = require('./routes/table.routes');
const customerRoutes = require('./routes/customer.routes');
const reservationRoutes = require('./routes/reservation.routes');
const orderRoutes = require('./routes/order.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware אבטחה ----
// helmet מוסיף כותרות HTTP מאובטחות. contentSecurityPolicy:false כדי לא לחסום
// את ה-Frontend שהשרת יגיש בהמשך (סקריפטים inline באתר).
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors()); // מאפשר בקשות ממקורות אחרים (שימושי בפיתוח/בדיקות)
app.use(express.json()); // מפרסר גוף בקשות בפורמט JSON

// ---- הגשת ה-Frontend (קבצים סטטיים מתיקיית public) ----
// כך '/' יגיש את index.html, ו-'/admin.html' את פאנל הניהול — מאותו שרת.
app.use(express.static(path.join(__dirname, 'public')));

// ---- בדיקת בריאות (health check) ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Restaurant API is running 🍽️' });
});

// ---- נתיבי ה-API ----
// המגביל הכללי חל על כל /api; המגביל המחמיר חל בנוסף על נתיבי האימות.
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes); // המגביל המחמיר מוחל בתוך הראוטר, רק על /login
app.use('/api/dishes', dishRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/orders', orderRoutes);

// ---- טיפול בשגיאות (חייב לבוא אחרון, אחרי כל הנתיבים) ----
app.use(notFound);      // נתיב לא קיים → 404
app.use(errorHandler);  // כל שגיאה → תגובת JSON מסודרת

// ---- הרמת השרת אחרי חיבור מוצלח ל-DB ----
async function start() {
  try {
    // בודק שהחיבור ל-DB תקין
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.');

    // יוצר את הטבלאות לפי המודלים אם אינן קיימות (בטוח, לא משנה טבלאות עם נתונים).
    await db.sequelize.sync();
    console.log('✅ Models synchronized (tables ready).');

    app.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
