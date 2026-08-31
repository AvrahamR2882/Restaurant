// controllers/table.controller.js
// ניהול שולחנות: רשימה, שליפה, יצירה, שינוי סטטוס, ומחיקה.

const { Table, Order } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');
const { TABLE_STATUSES } = require('../models/table.model');

// GET /api/tables — כל השולחנות (ממויין לפי מספר)
exports.getAllTables = asyncHandler(async (req, res) => {
  const tables = await Table.findAll({ order: [['number', 'ASC']] });
  res.status(200).json({ success: true, count: tables.length, data: tables });
});

// GET /api/tables/:id
exports.getTableById = asyncHandler(async (req, res) => {
  const table = await Table.findByPk(req.params.id);
  if (!table) throw new AppError(404, `Table with id ${req.params.id} not found`);
  res.status(200).json({ success: true, data: table });
});

// POST /api/tables — יצירת שולחן. אם לא נשלח number, מוקצה אוטומטית (הבא בתור).
exports.createTable = asyncHandler(async (req, res) => {
  let { number, seats } = req.body;
  if (number === undefined || number === null) {
    const maxNumber = await Table.max('number');
    number = (maxNumber || 0) + 1;
  }
  const table = await Table.create({ number, seats });
  res.status(201).json({ success: true, data: table });
});

// PATCH /api/tables/:id/status — שינוי סטטוס שולחן
exports.updateTableStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const table = await Table.findByPk(req.params.id);
  if (!table) throw new AppError(404, `Table with id ${req.params.id} not found`);

  if (!TABLE_STATUSES.includes(status)) {
    throw new AppError(400, `Status must be one of: ${TABLE_STATUSES.join(', ')}`);
  }

  // חוק עסקי: אי אפשר לשחרר שולחן (free) אם יש עליו הזמנה פתוחה.
  if (status === 'free') {
    const openOrder = await Order.findOne({ where: { tableId: table.id, status: 'open' } });
    if (openOrder) {
      throw new AppError(409, 'Cannot free a table that has an open order');
    }
  }

  await table.update({ status });
  res.status(200).json({ success: true, data: table });
});

// DELETE /api/tables/:id
exports.deleteTable = asyncHandler(async (req, res) => {
  const table = await Table.findByPk(req.params.id);
  if (!table) throw new AppError(404, `Table with id ${req.params.id} not found`);
  await table.destroy();
  res.status(200).json({ success: true, message: 'Table deleted successfully' });
});
