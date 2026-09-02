// controllers/stats.controller.js
// מאזן, סטטיסטיקה וסגירת יום — כל הפעולות כאן שמורות למנהל.
//
// הערה על אופן החישוב: הסכומים מחושבים ב-JavaScript ולא בשאילתות SQL מורכבות.
// בהיקף של מסעדה בודדת זה מהיר לגמרי, והקוד נשאר קריא וקל להסבר.

const { Op } = require('sequelize');
const {
  Order, OrderItem, Dish, Table, Customer, Reservation, DayClosure,
} = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// סכום הזמנה = סכום (כמות × המחיר שנשמר בעת ההזמנה)
const orderTotal = (order) =>
  (order.OrderItems || []).reduce((sum, item) => sum + item.quantity * item.priceAtOrder, 0);

// GET /api/stats — מאזן וסטטיסטיקה מלאים
exports.getStats = asyncHandler(async (req, res) => {
  const [orders, tables, customers, reservations, closures, daysClosed] = await Promise.all([
    Order.findAll({ include: [{ model: OrderItem, include: [Dish] }] }),
    Table.findAll(),
    Customer.findAll({ where: { dayClosureId: null } }),
    Reservation.findAll({ where: { dayClosureId: null } }),
    DayClosure.findAll({ order: [['closedAt', 'DESC']], limit: 10 }),
    DayClosure.count(),
  ]);

  // ---- המשמרת הנוכחית (מה שעדיין לא אורכב) ----
  const active = orders.filter((o) => o.dayClosureId === null);
  const openNow = active.filter((o) => o.status === 'open');
  const closedNow = active.filter((o) => o.status === 'closed');
  const cancelledNow = active.filter((o) => o.status === 'cancelled');

  const tableCounts = { free: 0, reserved: 0, occupied: 0 };
  tables.forEach((t) => { tableCounts[t.status] += 1; });

  // ---- כל הזמן (כולל מה שאורכב) ----
  const allClosed = orders.filter((o) => o.status === 'closed');
  const allTimeRevenue = allClosed.reduce((sum, o) => sum + orderTotal(o), 0);

  // ---- פילוח לפי מנה (מתוך הזמנות שנסגרו בלבד) ----
  const perDish = {};
  for (const order of allClosed) {
    for (const item of order.OrderItems || []) {
      const name = item.Dish ? item.Dish.name : 'מנה שנמחקה';
      const category = item.Dish ? item.Dish.category : 'other';
      const entry = (perDish[name] = perDish[name] || { name, category, quantity: 0, revenue: 0 });
      entry.quantity += item.quantity;
      entry.revenue += item.quantity * item.priceAtOrder;
    }
  }
  const dishList = Object.values(perDish);

  // ---- פילוח לפי קטגוריה ----
  const perCategory = {};
  for (const dish of dishList) {
    const entry = (perCategory[dish.category] =
      perCategory[dish.category] || { category: dish.category, quantity: 0, revenue: 0 });
    entry.quantity += dish.quantity;
    entry.revenue += dish.revenue;
  }

  res.status(200).json({
    success: true,
    data: {
      current: {
        revenue: closedNow.reduce((s, o) => s + orderTotal(o), 0),
        openOrders: openNow.length,
        openOrdersValue: openNow.reduce((s, o) => s + orderTotal(o), 0),
        closedOrders: closedNow.length,
        cancelledOrders: cancelledNow.length,
        seatedCustomers: customers.length,
        pendingReservations: reservations.filter((r) => r.status === 'pending').length,
        tables: { ...tableCounts, total: tables.length },
      },
      allTime: {
        revenue: allTimeRevenue,
        orders: allClosed.length,
        avgOrder: allClosed.length ? Math.round(allTimeRevenue / allClosed.length) : 0,
        daysClosed,
      },
      topDishes: dishList.sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      byCategory: Object.values(perCategory).sort((a, b) => b.revenue - a.revenue),
      recentClosures: closures,
    },
  });
});

// POST /api/stats/close-day — סגירת יום עסקים.
// מארכבת את כל מה שהסתיים, מרוקנת את הדשבורד, ומשחררת את השולחנות.
exports.closeDay = asyncHandler(async (req, res) => {
  // לא סוגרים יום כשיש חשבונות פתוחים — אחרת ההכנסות שלהם יאבדו מהדוח.
  const stillOpen = await Order.count({ where: { status: 'open', dayClosureId: null } });
  if (stillOpen > 0) {
    throw new AppError(409, `לא ניתן לסגור את היום — יש ${stillOpen} הזמנות פתוחות. סגור או בטל אותן קודם.`);
  }

  const orders = await Order.findAll({ where: { dayClosureId: null }, include: [OrderItem] });
  if (!orders.length) {
    throw new AppError(409, 'אין נתונים לסגירה — הדשבורד כבר ריק.');
  }

  const closed = orders.filter((o) => o.status === 'closed');
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const revenue = closed.reduce((sum, o) => sum + orderTotal(o), 0);
  const itemsCount = closed.reduce(
    (sum, o) => sum + (o.OrderItems || []).reduce((n, it) => n + it.quantity, 0),
    0
  );

  // רשומת הסגירה — "צילום מצב" של היום.
  const closure = await DayClosure.create({
    closedBy: req.user.username,
    ordersCount: closed.length,
    cancelledCount: cancelled.length,
    itemsCount,
    revenue,
  });

  // ארכוב: שיוך הרשומות לסגירה. הן נעלמות מהדשבורד — ונשארות ב-DB.
  await Order.update({ dayClosureId: closure.id }, { where: { dayClosureId: null } });
  await Customer.update({ dayClosureId: closure.id }, { where: { dayClosureId: null } });

  // הזמנות שולחן שעדיין ממתינות שייכות לימים הבאים — הן לא מארכבות.
  await Reservation.update(
    { dayClosureId: closure.id },
    { where: { dayClosureId: null, status: { [Op.ne]: 'pending' } } }
  );

  // משחררים את כל השולחנות...
  await Table.update({ status: 'free' }, { where: {} });

  // ...ומחזירים לסטטוס "מוזמן" שולחנות ששמורים להזמנות עתידיות.
  const futureReserved = await Reservation.findAll({
    where: { dayClosureId: null, status: 'pending', tableId: { [Op.ne]: null } },
  });
  for (const reservation of futureReserved) {
    await Table.update({ status: 'reserved' }, { where: { id: reservation.tableId } });
  }

  res.status(201).json({
    success: true,
    message: `היום נסגר — ${closed.length} הזמנות, הכנסות ₪${revenue}`,
    data: closure,
  });
});

// GET /api/stats/closures — ארכיון סגירות היום
exports.getClosures = asyncHandler(async (req, res) => {
  const closures = await DayClosure.findAll({ order: [['closedAt', 'DESC']] });
  res.status(200).json({ success: true, count: closures.length, data: closures });
});

// GET /api/stats/closures/:id — סגירה בודדת עם ההזמנות שאורכבו בה
exports.getClosureById = asyncHandler(async (req, res) => {
  const closure = await DayClosure.findByPk(req.params.id);
  if (!closure) throw new AppError(404, `Day closure with id ${req.params.id} not found`);

  const orders = await Order.findAll({
    where: { dayClosureId: closure.id },
    include: [Table, Customer, { model: OrderItem, include: [Dish] }],
    order: [['id', 'ASC']],
  });

  res.status(200).json({
    success: true,
    data: {
      closure,
      orders: orders.map((o) => ({ ...o.toJSON(), total: orderTotal(o) })),
    },
  });
});
