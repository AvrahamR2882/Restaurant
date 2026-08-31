// routes/reservation.routes.js
// יצירת הזמנה — ציבורית (לקוח מהאתר). ניהול (רשימה/עדכון/ביטול) — staff בלבד.

const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservation.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// ציבורי
router.post('/', reservationController.createReservation);

// מוגן — staff
router.get('/', verifyToken, reservationController.getAllReservations);
router.get('/:id', verifyToken, reservationController.getReservationById);
router.patch('/:id', verifyToken, reservationController.updateReservation);
router.delete('/:id', verifyToken, reservationController.deleteReservation);

module.exports = router;
