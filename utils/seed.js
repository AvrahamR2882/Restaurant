// utils/seed.js
// סקריפט זריעה — יוצר משתמש מנהל ראשוני + נתוני דמו (מנות, שולחנות, מלצר).
// הרצה: npm run seed
// בטוח להרצה חוזרת (idempotent) — משתמש ב-findOrCreate כדי לא ליצור כפילויות.

require('dotenv').config();
const db = require('../models');

// התפריט המלא. הסדר כאן הוא הסדר שבו המנות יוצגו באתר (המיון ב-API הוא לפי id).
const DISHES = [
  // ---------- ראשונות, לחמים וסלטים ----------
  {
    name: "קארפצ'ו סלק שרוף ופילטיי הדרים",
    description: "דפי סלק בבישול אטי, שמן זית זני, קרם פטה צאן, פיסטוק קלוי ומיקרו-עלים.",
    price: 58, category: 'starter',
  },
  {
    name: "סלט עשבי תיבול, תאנים ופיקורינו",
    description: "אורוגולה, פטרוזיליה, תאנים טריות (או שימורי תאנים בעונה), אגוזי מלך קלויים וויניגרט דבש-חלב.",
    price: 62, category: 'starter',
  },
  {
    name: "בוראטה בקרם עגבניות שרי צלויות",
    description: "כדור בוראטה טרי, עגבניות שרי תמר צלויות בטאבון, בלסמי מצומצם, שמן בזיליקום וקראנץ' שום.",
    price: 72, category: 'starter',
  },
  {
    name: "סלט אנדיב וגבינה כחולה",
    description: "עלי אנדיב סגולים ולבנים, אגסים שיכורים ביין לבן, גבינת רוקפור/דניש בלו, ושקדים פרוסים.",
    price: 64, category: 'starter',
  },
  {
    name: "טרטר טונה אדומה על בריוש",
    description: "טונה קצוצה ביד, קרם פרש, איולי יוזו, עירית קצוצה, מוגש על קוביית בריוש קלויה בחמאה.",
    price: 78, category: 'starter',
  },
  {
    name: "פלטת לחמי מחמצת וסלסלת מאפים",
    description: "לחמי מחמצת שנאפים במקום (שיפון, כוסמין), חמאה מתובלת במלח אטלנטי, שמן זית בלסמי וזיתים מתובלים.",
    price: 46, category: 'starter',
  },
  {
    name: "מאפה פילאס תרד וגבינת המאירי",
    description: "דפי פילאס פריכים במילוי תרד בר, גבינת המאירי וכרישה מעודנת.",
    price: 54, category: 'starter',
  },
  {
    name: "ציזיקי יווני וקרוסטיני",
    description: "יוגורט כבשים סמיך, מלפפונים צולים, שום, שמיר רענן ושמן זית עז טעם.",
    price: 42, category: 'starter',
  },
  {
    name: "קרפצ'יו קישואים וריקוטה פרסקה",
    description: "קישואים זוקיני פרוסים דק, סחיטת לימון טרי, זרעי עגבנייה, גרידת לימון וריקוטה עיזים.",
    price: 56, category: 'starter',
  },
  {
    name: "ברוסקטה תאנים מקורמלות וגבינת ברי",
    description: "פרוסת מחמצת קלויה, גבינת ברי מותכת קלות, תאנים צלויות בדבש וטימין.",
    price: 58, category: 'starter',
  },

  // ---------- מגשי גבינות וליווי (פתיחה / נלווה) ----------
  {
    name: "מגש גבינות עיזים וכבשים מקומיות",
    description: "מנצ'גו מקומית, גבינת המאירי מיושנת, קממבר עיזים, תל העמק וגורגונזולה. מוגש עם ריבת תאנים, אגוזים וקרקרים שנאפים במקום.",
    price: 148, category: 'starter',
  },
  {
    name: "גבינת תום עיזים מיושנת",
    description: "גבינה קשה בעלת טעמים עמוקים ואגוזיים.",
    price: 52, category: 'starter',
  },
  {
    name: "גבינת סנט מור עיזים",
    description: "גבינה רכה בעלת מעטה עובש לבן, מרקם קרמי וטעם עז.",
    price: 56, category: 'starter',
  },
  {
    name: "ברי כמוסים",
    description: "גבינת ברי רכה ומפנקת עטופה בשכבת כמוס עשירה.",
    price: 62, category: 'starter',
  },
  {
    name: "אנטיפסטי תאנים, אגסים וגבינה כחולה",
    description: "פרוסות אגס ותאנה טרייה, גבינה כחולה מקומית, אגוזי מלך קלויים וטפטוף דבש — מתיקות הפרי מול חריפות הגבינה.",
    price: 74, category: 'starter',
  },

  // ---------- מנות עיקריות ----------
  {
    name: "טורטליני דלעת ערמונים וריזוטו מנצ'גו",
    description: "כיסוני בצק עבודת יד במילוי דלעת ערמונים, רוטב חמאה חורפית, מרווה וגילופי מנצ'גו.",
    price: 108, category: 'main',
  },
  {
    name: "ניוקי עננים ברוטב חמאת כרישה ויין לבן",
    description: "ניוקי תפוחי אדמה אוורירי, תרד טורקי, יין לבן מעורב גבינת גורגונזולה עדינה.",
    price: 96, category: 'main',
  },
  {
    name: "פילה לברק על מצע פולנטה תירס טרי",
    description: "דג ים צרוב על העור, פולנטה קרמית מעודנת, פטריות ירדן ופורטובלו ביין אדום.",
    price: 148, category: 'main',
  },
  {
    name: "פסטה פפרדלה פטריות כמהין וערמונים",
    description: "פסטה טרייה, תערובת פטריות יער, ערמונים קלויים, שמן כמהין שחור ופרמז'ן מיושן.",
    price: 118, category: 'main',
  },
  {
    name: "ריזוטו זעפרן וירקות ירוקים",
    description: "אורז ארבוריו, זעפרן טהור, אפונת גינה, אספרגוס, גרידת לימון ופרמז'ן 24 חודשים.",
    price: 104, category: 'main',
  },
  {
    name: "מאפה עלים, כרישה וגבינת קממבר",
    description: "מאפה שבלול פריך במילוי כרישה מאודה ביין לבן, גבינת קממבר עשירה ופיסטוקים.",
    price: 92, category: 'main',
  },
  {
    name: "סטייק טונה אדומה בצריבה קלה",
    description: "על מצע קרם שורש סלרי, אספרגוס חלוט ורוטב חמאת חומץ שרי.",
    price: 162, category: 'main',
  },
  {
    name: "קאסולט שעועית לבנה וגבינות קשות",
    description: "קדרת שעועית לבנה, עגבניות שרי, עשבי תיבול, מוקרמת בתנור אבן עם תערובת גבינות עיזים קשות.",
    price: 98, category: 'main',
  },
  {
    name: "רביולי ערמונים וגבינת עיזים",
    description: "ברוטב חמאה חומה, אגוזי לוז קלויים ועלי מרווה פריכים.",
    price: 106, category: 'main',
  },
  {
    name: "פילה סלמון בגלזורה של דבש, חרדל ויין",
    description: "מוגש לצד פירה תפוחי אדמה חמאתי וסלט ירוקים רענן.",
    price: 142, category: 'main',
  },

  // ---------- קינוחים ----------
  {
    name: "טארט לימון ומרנג איטלקי",
    description: "קתרזיס של חומציות ומתוק; קליפה פריכה במילוי קרם לימון חמצמץ ומרנג חרוך.",
    price: 48, category: 'dessert',
  },
  {
    name: "עוגת גבינה באסקית חרוכה",
    description: "עוגת גבינה עשירה ואוורירית עם מרכז קרמי כמעט נוזלי וציפוי חרוך עמוק.",
    price: 52, category: 'dessert',
  },
  {
    name: "פונדן שוקולד וגלידת וניל",
    description: "קינוח שוקולד עשיר עם ליבה חמה של שוקולד מומס, מוגש לצד גלידת וניל איכותית.",
    price: 54, category: 'dessert',
  },
  {
    name: "קרם ברולה הל וזעפרן",
    description: "קלאסיקה צרפתית בטוויסט מקומי עדין של תבלינים.",
    price: 46, category: 'dessert',
  },
  {
    name: "אגסים שיכורים ביין אדום ותבלינים",
    description: "אגסים מבושלים ביין אדום, קינמון וכוכב אניס, מוגשים עם מסקרפונה טרייה.",
    price: 44, category: 'dessert',
  },
  {
    name: "צלחת פירות העונה וסורבה ביתי",
    description: "פירות טריים חתוכים בקפידה לצד כדורי סורבה מנגו/פטל בעבודת יד.",
    price: 52, category: 'dessert',
  },
  {
    name: "טירמיסו מסקרפונה ואספרסו",
    description: "שכבות של בישקוטים מורווים באספרסו וליקר, קרם מסקרפונה עשיר ואבקת קקאו מרה.",
    price: 50, category: 'dessert',
  },

  // ---------- יינות: לבנים ורוזה ----------
  {
    name: "שאבלי / שרדונה צפוני מובחר",
    description: "יין יבש, מינרלי ורענן עם חומציות גבוהה — מתאים לגבינות רכות ודגים.",
    price: 64, category: 'drink',
  },
  {
    name: "סובניון בלאן — גליל עליון / מרום גולן",
    description: "יין חד, עשבוני עם ניחוחות פרי הדר — מלווה נהדר לגבינות עיזים וסלטים.",
    price: 52, category: 'drink',
  },
  {
    name: "רוזה פרימיום — גליל / הרי יהודה",
    description: "יין ורוד יבש, פירותי וקליל, מתאים בול לאקלים המקומי ולמנות פתיחה.",
    price: 48, category: 'drink',
  },
  {
    name: "ריזלינג יבש / חצי יבש",
    description: "יין עשיר בניחוחות פרחוניים ומינרליים, מלווה מעולה מנות עשירות ומאפים.",
    price: 54, category: 'drink',
  },

  // ---------- יינות: אדומים ----------
  {
    name: "פינו נואר — יהודה / הגולן",
    description: "יין אדום אלגנטי, בגוף בינוני-קליל, עם טעמי דובדבן ואדמה — מלווה מושלם לגבינות מיושנות.",
    price: 68, category: 'drink',
  },
  {
    name: "סירה / שיראז גלילי",
    description: "יין אדום מלא, מתובל ומורכב עם טעמי פירות שחורים ופלפל שחור.",
    price: 62, category: 'drink',
  },
  {
    name: "בלנד יהודה / קברנה-מרלו מקומי",
    description: "יין עשיר ומורכב עם גוף מלא, מתאים למנות פסטה וריזוטו עשירות.",
    price: 58, category: 'drink',
  },
  {
    name: "סנג'ובזה מקומי",
    description: "יין אדום חומצי ורענן, מתאים במיוחד למנות איטלקיות וגבינות קשות.",
    price: 56, category: 'drink',
  },

  // ---------- יינות: קינוח ובועות ----------
  {
    name: "קאווה / שמפנייה ברוט טבעי",
    description: "ליצירת אווירה חגיגית, מלווה מעולה לבוראטה ומנות פתיחה.",
    price: 72, category: 'drink',
  },
  {
    name: "פורט / יין קינוח מחוזק מקומי",
    description: "יין מתוק ועשיר בטעמים, מלווה מושלם לגבינות כחולות ולקינוחים עשירים.",
    price: 46, category: 'drink',
  },
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

    // defaults חלים רק ביצירה. לכן אם המנהל כבר קיים — מסנכרנים את הסיסמה
    // מחדש ממשתנה הסביבה, כך שהוא תמיד מקור האמת.
    // זה גם מנגנון איפוס סיסמה: משנים את המשתנה, מריצים seed, וזהו.
    let adminPasswordReset = false;
    if (!adminCreated && process.env.SEED_ADMIN_PASSWORD) {
      await admin.update({ password: process.env.SEED_ADMIN_PASSWORD });
      adminPasswordReset = true;
    }

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
    console.log(`   Manager: ${admin.username} (${adminCreated ? 'created' : adminPasswordReset ? 'password reset from env' : 'already existed'})`);
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
