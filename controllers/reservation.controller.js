// controllers/reservation.controller.js
// ניהול הזמנות שולחן (reservations). היצירה ציבורית — לקוח מזמין מהאתר.

const { Reservation, Table } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// POST /api/reservations — יצירת הזמנת שולחן (ציבורי)
exports.createReservation = asyncHandler(async (req, res) => {
  const { customerName, phone, partySize, reservationTime, tableId } = req.body;

  let table = null;
  if (tableId) {
    table = await Table.findByPk(tableId);
    if (!table) throw new AppError(404, `Table with id ${tableId} not found`);
    if (table.status !== 'free') {
      throw new AppError(409, `Table ${table.number} is not available for reservation`);
    }
  }

  const reservation = await Reservation.create({
    customerName,
    phone,
    partySize,
    reservationTime,
    tableId: tableId || null,
  });

  // אם שובץ שולחן ספציפי — מסמנים אותו כ"מוזמן".
  if (table) await table.update({ status: 'reserved' });

  res.status(201).json({ success: true, data: reservation });
});

// GET /api/reservations — רשימה, עם פילטר אופציונלי ?status=
exports.getAllReservations = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.status) where.status = req.query.status;
  const reservations = await Reservation.findAll({
    where,
    include: [Table],
    order: [['reservationTime', 'ASC']],
  });
  res.status(200).json({ success: true, count: reservations.length, data: reservations });
});

// GET /api/reservations/:id
exports.getReservationById = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id, { include: [Table] });
  if (!reservation) throw new AppError(404, `Reservation with id ${req.params.id} not found`);
  res.status(200).json({ success: true, data: reservation });
});

// PATCH /api/reservations/:id — עדכון (למשל אישור, שיוך שולחן, שינוי סטטוס)
exports.updateReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) throw new AppError(404, `Reservation with id ${req.params.id} not found`);

  const updates = {};
  for (const field of ['customerName', 'phone', 'partySize', 'reservationTime', 'status', 'tableId']) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  await reservation.update(updates);
  res.status(200).json({ success: true, data: reservation });
});

// DELETE /api/reservations/:id — ביטול הזמנה, ושחרור השולחן אם היה מוזמן
exports.deleteReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) throw new AppError(404, `Reservation with id ${req.params.id} not found`);

  if (reservation.tableId) {
    const table = await Table.findByPk(reservation.tableId);
    if (table && table.status === 'reserved') await table.update({ status: 'free' });
  }

  await reservation.destroy();
  res.status(200).json({ success: true, message: 'Reservation cancelled' });
});
