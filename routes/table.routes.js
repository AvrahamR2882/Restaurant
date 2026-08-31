// routes/table.routes.js
// כל נתיבי השולחנות דורשים התחברות. יצירה/מחיקה — למנהל בלבד.

const express = require('express');
const router = express.Router();
const tableController = require('../controllers/table.controller');
const { verifyToken, authorize } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, tableController.getAllTables);
router.get('/:id', verifyToken, tableController.getTableById);
router.post('/', verifyToken, authorize('manager'), tableController.createTable);
router.patch('/:id/status', verifyToken, tableController.updateTableStatus);
router.delete('/:id', verifyToken, authorize('manager'), tableController.deleteTable);

module.exports = router;
