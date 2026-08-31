# 🍽️ אין עוד מלבדו — שרת ניהול מסעדה (Restaurant Management API)

שרת API מלא, מקצועי ומאובטח למסעדת בוטיק, כולל **אתר לקוח** ו**פאנל ניהול**.
נבנה כעבודה מסכמת בקורס שרתים, על בסיס **Node.js · Express · Sequelize**, בארכיטקטורת **MVC**.

---

## ✨ תכונות עיקריות

- **ארכיטקטורת MVC** מלאה — הפרדה נקייה ל-`models`, `controllers`, `routes`, `middlewares`.
- **בסיס נתונים** עם Sequelize ORM (SQLite) — 7 מודלים מקושרים עם מפתחות זרים וולידציות.
- **אימות והרשאות (JWT)** — שני תפקידים: `manager` (מנהל) ו-`waiter` (מלצר).
- **הצפנת סיסמאות** עם bcrypt — הסיסמה עצמה לעולם לא נשמרת.
- **טיפול שגיאות מרוכז** — סטטוסי HTTP מדויקים (2XX/4XX/5XX), השרת לא קורס.
- **אבטחה** — Rate Limiting, Helmet, CORS, ומשתני סביבה (`.env`).
- **Frontend מלא** — אתר ציבורי (בית, תפריט חי, הזמנת שולחן, בר יין, צור קשר) ופאנל ניהול, מוגשים ע"י אותו שרת.

---

## 🧱 מבנה הפרויקט

```
restaurant-server/
├── server.js              # נקודת כניסה — middleware, נתיבים, static, הרמת שרת
├── config/database.js     # חיבור Sequelize ל-SQLite
├── models/                # 7 מודלים + הגדרת הקשרים (index.js)
├── controllers/           # הלוגיקה העסקית לכל ישות
├── routes/                # הגדרת ה-endpoints
├── middlewares/           # אימות, הרשאות, rate limiting, טיפול שגיאות
├── utils/seed.js          # זריעת נתוני דמו + מנהל ראשוני
└── public/                # ה-Frontend (אתר + פאנל ניהול)
```

## 🗄️ מודל הנתונים

| ישות | תיאור | קשרים |
|---|---|---|
| **User** | עובד המערכת (מנהל/מלצר) | עצמאי |
| **Table** | שולחן | → Orders, Reservations, Customers |
| **Dish** | מנה בתפריט | → OrderItems |
| **Customer** | לקוח יושב | ↔ Table |
| **Reservation** | הזמנת שולחן מראש | ↔ Table |
| **Order** | הזמנת אוכל (חשבון) | ↔ Table, Customer, → OrderItems |
| **OrderItem** | פריט בהזמנה (טבלת קישור) | ↔ Order, Dish |

---

## 🚀 הרצה מקומית (Local)

### דרישות מקדימות
- [Node.js](https://nodejs.org/) גרסה 18 ומעלה

### שלבים

```bash
# 1. התקנת התלויות
npm install

# 2. יצירת קובץ סביבה מהתבנית
cp .env.example .env

# 3. זריעת נתוני דמו + משתמש מנהל
npm run seed

# 4. הרצת השרת
npm start
```

השרת יעלה בכתובת **http://localhost:3000**

| כתובת | תיאור |
|---|---|
| `http://localhost:3000/` | האתר הציבורי |
| `http://localhost:3000/admin.html` | פאנל הניהול |

### פרטי התחברות לדוגמה (לאחר seed)

| תפקיד | שם משתמש | סיסמה |
|---|---|---|
| מנהל | `Avraham` | `avigail` |
| מלצר | `waiter` | `waiter123` |

> הפרטים של המנהל נלקחים מקובץ `.env` (`SEED_ADMIN_*`) — ניתן לשנות שם.

---

## 🔌 תיעוד ה-API

בסיס: `/api` · תגובות בפורמט JSON · `[מוגן]` = דורש טוקן · `[מנהל]` = תפקיד manager בלבד.

### אימות — `/api/auth`
| Method | Endpoint | תיאור |
|---|---|---|
| POST | `/register` | יצירת עובד `[מנהל]` |
| POST | `/login` | התחברות → מחזיר JWT |
| GET | `/me` | פרטי המשתמש המחובר `[מוגן]` |

### מנות — `/api/dishes`
| Method | Endpoint | תיאור |
|---|---|---|
| GET | `/` , `/:id` | רשימה / מנה בודדת (ציבורי) |
| POST | `/` | יצירה `[מנהל]` |
| PUT | `/:id` | עדכון `[מנהל]` |
| DELETE | `/:id` | מחיקה `[מנהל]` |

### שולחנות — `/api/tables`
| Method | Endpoint | תיאור |
|---|---|---|
| GET | `/` , `/:id` | רשימה / בודד `[מוגן]` |
| POST | `/` | יצירה `[מנהל]` |
| PATCH | `/:id/status` | שינוי סטטוס `[מוגן]` |
| DELETE | `/:id` | מחיקה `[מנהל]` |

### הזמנות שולחן — `/api/reservations`
| Method | Endpoint | תיאור |
|---|---|---|
| POST | `/` | יצירת הזמנה (ציבורי — מהאתר) |
| GET | `/` , `/:id` | רשימה / בודד `[מוגן]` |
| PATCH | `/:id` | עדכון `[מוגן]` |
| DELETE | `/:id` | ביטול `[מוגן]` |

### לקוחות — `/api/customers`
| Method | Endpoint | תיאור |
|---|---|---|
| GET | `/` , `/:id` | רשימה / בודד `[מוגן]` |
| POST | `/` | שיבוץ לקוח `[מוגן]` |
| DELETE | `/:id` | שחרור `[מוגן]` |

### הזמנות אוכל — `/api/orders`
| Method | Endpoint | תיאור |
|---|---|---|
| GET | `/?status=&tableId=` | רשימה עם פילטרים `[מוגן]` |
| GET | `/:id` | הזמנה בודדת `[מוגן]` |
| POST | `/` | פתיחת הזמנה `[מוגן]` |
| POST | `/:id/items` | הוספת מנה `[מוגן]` |
| DELETE | `/:id/items/:itemId` | הסרת מנה `[מוגן]` |
| PATCH | `/:id/close` | סגירת חשבון `[מוגן]` |
| PATCH | `/:id/cancel` | ביטול `[מוגן]` |

**סטטוסי HTTP:** `200/201` הצלחה · `400` בקשה שגויה · `401` לא מאומת · `403` אין הרשאה · `404` לא נמצא · `409` קונפליקט · `429` יותר מדי בקשות · `500` שגיאת שרת.

---

## 🔐 אבטחה

- **JWT** לאימות, עם אכיפת תפקידים (`verifyToken` + `authorize`).
- **bcrypt** להצפנת סיסמאות (hash חד-כיווני).
- **express-rate-limit** — הגנה מפני הצפת בקשות ו-brute-force.
- **helmet** ו-**cors** — כותרות אבטחה.
- **`.env`** — כל הסודות מחוץ לקוד. הקובץ אינו נכלל בריפו (`.gitignore`).

---

## 📦 הערות להגשה

- הקבצים `node_modules/` ו-`.env` **אינם** נכללים בריפו (מוגדרים ב-`.gitignore`).
- קובץ `.env.example` מצורף כתבנית — יש להעתיקו ל-`.env` לפני הרצה.
- בסיס הנתונים (`database.sqlite`) נוצר אוטומטית בהרצה הראשונה.

## 🛠️ טכנולוגיות

Node.js · Express · Sequelize · SQLite · JWT · bcrypt · Helmet · express-rate-limit · dotenv
