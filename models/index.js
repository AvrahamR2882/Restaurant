// models/index.js
// נקודת הכניסה לשכבת המודלים:
// 1. מייבא את מופע ה-Sequelize (החיבור ל-DB).
// 2. טוען כל מודל ומעביר לו את המופע.
// 3. מגדיר את הקשרים (associations) בין המודלים — כאן נוצרים המפתחות הזרים.
// 4. מייצא אובייקט db אחד עם הכל.

const sequelize = require('../config/database');

// ---- טעינת המודלים ----
const User = require('./user.model')(sequelize);
const Table = require('./table.model')(sequelize);
const Dish = require('./dish.model')(sequelize);
const Customer = require('./customer.model')(sequelize);
const Reservation = require('./reservation.model')(sequelize);
const Order = require('./order.model')(sequelize);
const OrderItem = require('./orderItem.model')(sequelize);
const DayClosure = require('./dayClosure.model')(sequelize);

// ---- הגדרת קשרים (associations) ----
// כל hasMany/belongsTo מוסיף אוטומטית מפתח זר (foreignKey) לטבלה המתאימה.

// שולחן ↔ הזמנות-אוכל (שולחן אחד → הרבה הזמנות)
Table.hasMany(Order, { foreignKey: 'tableId', onDelete: 'CASCADE' });
Order.belongsTo(Table, { foreignKey: 'tableId' });

// שולחן ↔ הזמנות-שולחן (reservations)
Table.hasMany(Reservation, { foreignKey: 'tableId', onDelete: 'SET NULL' });
Reservation.belongsTo(Table, { foreignKey: 'tableId' });

// שולחן ↔ לקוחות (לקוח משובץ לשולחן)
Table.hasMany(Customer, { foreignKey: 'tableId', onDelete: 'SET NULL' });
Customer.belongsTo(Table, { foreignKey: 'tableId' });

// לקוח ↔ הזמנות-אוכל (לקוח יכול להיות שייך להזמנה)
Customer.hasMany(Order, { foreignKey: 'customerId', onDelete: 'SET NULL' });
Order.belongsTo(Customer, { foreignKey: 'customerId' });

// הזמנה ↔ פריטים (הזמנה → הרבה שורות; מחיקת הזמנה מוחקת את הפריטים)
Order.hasMany(OrderItem, { foreignKey: 'orderId', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

// מנה ↔ פריטים (אותה מנה מופיעה בהרבה שורות הזמנה)
Dish.hasMany(OrderItem, { foreignKey: 'dishId' });
OrderItem.belongsTo(Dish, { foreignKey: 'dishId' });

// סגירת יום ↔ הרשומות שאורכבו בה.
// dayClosureId = null פירושו "עדיין פעיל, מוצג בדשבורד".
DayClosure.hasMany(Order, { foreignKey: 'dayClosureId', onDelete: 'SET NULL' });
Order.belongsTo(DayClosure, { foreignKey: 'dayClosureId' });

DayClosure.hasMany(Customer, { foreignKey: 'dayClosureId', onDelete: 'SET NULL' });
Customer.belongsTo(DayClosure, { foreignKey: 'dayClosureId' });

DayClosure.hasMany(Reservation, { foreignKey: 'dayClosureId', onDelete: 'SET NULL' });
Reservation.belongsTo(DayClosure, { foreignKey: 'dayClosureId' });

// ---- ייצוא ----
const db = {
  sequelize,
  User,
  Table,
  Dish,
  Customer,
  Reservation,
  Order,
  OrderItem,
  DayClosure,
};

module.exports = db;
