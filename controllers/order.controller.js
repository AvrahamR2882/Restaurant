// controllers/order.controller.js
// ניהול הזמנות אוכל — מחזור חיים מלא: פתיחה, הוספת/הסרת מנות, סגירה, ביטול.

const { Order, OrderItem, Dish, Table, Customer } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// הגדרת ה-include שמשמש בכל שליפה — מביא את השולחן, הלקוח, והפריטים עם המנות.
const ORDER_INCLUDE = [
  { model: Table },
  { model: Customer },
  { model: OrderItem, include: [Dish] },
];

// מחשב את הסכום הכולל של הזמנה ומצרף אותו לתשובה.
const withTotal = (order) => {
  const data = order.toJSON();
  data.total = (data.OrderItems || []).reduce(
    (sum, item) => sum + item.quantity * item.priceAtOrder,
    0
  );
  return data;
};

// GET /api/orders — רשימה, עם פילטרים אופציונליים ?status= ו-?tableId=
exports.getAllOrders = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (req.query.tableId) where.tableId = req.query.tableId;

  // כברירת מחדל מוצגות רק הזמנות מהמשמרת הנוכחית (שעדיין לא אורכבו בסגירת יום).
  // לצפייה בארכיון של יום שנסגר: ?closureId=N
  where.dayClosureId = req.query.closureId || null;

  const orders = await Order.findAll({
    where,
    include: ORDER_INCLUDE,
    order: [['createdAt', 'DESC']],
  });
  res.status(200).json({ success: true, count: orders.length, data: orders.map(withTotal) });
});

// GET /api/orders/:id
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id, { include: ORDER_INCLUDE });
  if (!order) throw new AppError(404, `Order with id ${req.params.id} not found`);
  res.status(200).json({ success: true, data: withTotal(order) });
});

// POST /api/orders — פתיחת הזמנה חדשה לשולחן תפוס
exports.createOrder = asyncHandler(async (req, res) => {
  const { tableId, customerId } = req.body;

  const table = await Table.findByPk(tableId);
  if (!table) throw new AppError(404, `Table with id ${tableId} not found`);
  if (table.status !== 'occupied') {
    throw new AppError(409, 'Table must be occupied — seat a customer before opening an order');
  }

  // מונע שתי הזמנות פתוחות על אותו שולחן
  const existingOpen = await Order.findOne({ where: { tableId, status: 'open' } });
  if (existingOpen) {
    throw new AppError(409, 'This table already has an open order');
  }

  // קישור הלקוח להזמנה. אם נשלח מזהה מפורש — משתמשים בו; אחרת מאתרים אוטומטית
  // את הלקוח שיושב בשולחן. הלקוח הזה נוצר בשיבוץ ידני או בהושבת הזמנת שולחן,
  // ולכן אין צורך שהממשק ישלח אותו — השרת גוזר אותו ממצב השולחן.
  let resolvedCustomerId = null;
  if (customerId) {
    const customer = await Customer.findByPk(customerId);
    if (!customer) throw new AppError(404, `Customer with id ${customerId} not found`);
    resolvedCustomerId = customer.id;
  } else {
    const seated = await Customer.findOne({
      where: { tableId, dayClosureId: null }, // רק לקוח מהמשמרת הנוכחית
      order: [['id', 'DESC']], // האחרון שהושב בשולחן
    });
    if (seated) resolvedCustomerId = seated.id;
  }

  const order = await Order.create({ tableId, customerId: resolvedCustomerId });
  const full = await Order.findByPk(order.id, { include: ORDER_INCLUDE });
  res.status(201).json({ success: true, data: withTotal(full) });
});

// POST /api/orders/:id/items — הוספת מנה להזמנה (אם קיימת — מגדיל כמות)
exports.addItem = asyncHandler(async (req, res) => {
  const { dishId, quantity } = req.body;

  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError(404, `Order with id ${req.params.id} not found`);
  if (order.status !== 'open') {
    throw new AppError(409, 'Cannot add items to a non-open order');
  }

  const dish = await Dish.findByPk(dishId);
  if (!dish) throw new AppError(404, `Dish with id ${dishId} not found`);

  const qty = quantity && quantity > 0 ? quantity : 1;

  // אם המנה כבר בהזמנה — מגדילים כמות; אחרת יוצרים שורה חדשה עם "צילום" המחיר.
  let item = await OrderItem.findOne({ where: { orderId: order.id, dishId } });
  if (item) {
    await item.update({ quantity: item.quantity + qty });
  } else {
    item = await OrderItem.create({
      orderId: order.id,
      dishId,
      quantity: qty,
      priceAtOrder: dish.price,
    });
  }

  const full = await Order.findByPk(order.id, { include: ORDER_INCLUDE });
  res.status(201).json({ success: true, data: withTotal(full) });
});

// DELETE /api/orders/:id/items/:itemId — הסרת פריט מהזמנה
exports.removeItem = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError(404, `Order with id ${req.params.id} not found`);
  if (order.status !== 'open') {
    throw new AppError(409, 'Cannot modify a non-open order');
  }

  const item = await OrderItem.findOne({ where: { id: req.params.itemId, orderId: order.id } });
  if (!item) throw new AppError(404, `Order item with id ${req.params.itemId} not found`);

  await item.destroy();
  const full = await Order.findByPk(order.id, { include: ORDER_INCLUDE });
  res.status(200).json({ success: true, data: withTotal(full) });
});

// PATCH /api/orders/:id/close — סגירת הזמנה (שולמה)
exports.closeOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError(404, `Order with id ${req.params.id} not found`);
  if (order.status !== 'open') throw new AppError(409, 'Order is not open');

  await order.update({ status: 'closed', closedAt: new Date() });
  res.status(200).json({ success: true, data: order });
});

// PATCH /api/orders/:id/cancel — ביטול הזמנה ושחרור השולחן
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByPk(req.params.id);
  if (!order) throw new AppError(404, `Order with id ${req.params.id} not found`);
  if (order.status !== 'open') throw new AppError(409, 'Only open orders can be cancelled');

  await order.update({ status: 'cancelled', closedAt: new Date() });

  const table = await Table.findByPk(order.tableId);
  if (table) await table.update({ status: 'free' });

  res.status(200).json({ success: true, data: order });
});
