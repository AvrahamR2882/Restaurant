// routes/order.routes.js
// ניהול הזמנות אוכל — כל הנתיבים דורשים התחברות (staff).

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, orderController.getAllOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.post('/', verifyToken, orderController.createOrder);
router.post('/:id/items', verifyToken, orderController.addItem);
router.delete('/:id/items/:itemId', verifyToken, orderController.removeItem);
router.patch('/:id/close', verifyToken, orderController.closeOrder);
router.patch('/:id/cancel', verifyToken, orderController.cancelOrder);

module.exports = router;
