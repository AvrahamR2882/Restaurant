// controllers/customer.controller.js
// ניהול לקוחות (שיבוץ לשולחן): רשימה, שליפה, שיבוץ, ומחיקה.

const { Customer, Table, Order } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// GET /api/customers — כל הלקוחות, כולל השולחן שלהם
exports.getAllCustomers = asyncHandler(async (req, res) => {
  // רק לקוחות מהמשמרת הנוכחית — לקוחות שאורכבו בסגירת יום לא מוצגים.
  const customers = await Customer.findAll({
    where: { dayClosureId: null },
    include: [Table],
    order: [['id', 'ASC']],
  });
  res.status(200).json({ success: true, count: customers.length, data: customers });
});

// GET /api/customers/:id
exports.getCustomerById = asyncHandler(async (req, res) => {
  const customer = await Customer.findByPk(req.params.id, { include: [Table] });
  if (!customer) throw new AppError(404, `Customer with id ${req.params.id} not found`);
  res.status(200).json({ success: true, data: customer });
});

// POST /api/customers — שיבוץ לקוח לשולחן.
// אם נשלח tableId — משבצים אליו (חייב להיות פנוי). אחרת — בוחרים אוטומטית שולחן פנוי.
exports.seatCustomer = asyncHandler(async (req, res) => {
  const { name, phone, tableId } = req.body;

  let table;
  if (tableId) {
    table = await Table.findByPk(tableId);
    if (!table) throw new AppError(404, `Table with id ${tableId} not found`);
    if (table.status === 'occupied') {
      throw new AppError(409, `Table ${table.number} is already occupied`);
    }
  } else {
    // בחירה אוטומטית של השולחן הפנוי הראשון
    table = await Table.findOne({ where: { status: 'free' }, order: [['number', 'ASC']] });
    if (!table) throw new AppError(409, 'No free table available');
  }

  const customer = await Customer.create({ name, phone, tableId: table.id });
  await table.update({ status: 'occupied' });

  const result = await Customer.findByPk(customer.id, { include: [Table] });
  res.status(201).json({ success: true, data: result });
});

// DELETE /api/customers/:id — הסרת לקוח ושחרור השולחן (אם אין הזמנה פתוחה)
exports.deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findByPk(req.params.id);
  if (!customer) throw new AppError(404, `Customer with id ${req.params.id} not found`);

  if (customer.tableId) {
    const openOrder = await Order.findOne({ where: { tableId: customer.tableId, status: 'open' } });
    if (openOrder) {
      throw new AppError(409, 'This customer has an open order — close it first');
    }
    const table = await Table.findByPk(customer.tableId);
    if (table) await table.update({ status: 'free' });
  }

  await customer.destroy();
  res.status(200).json({ success: true, message: 'Customer removed and table freed' });
});
