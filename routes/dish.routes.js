// routes/dish.routes.js
// מגדיר את נתיבי המנות. קריאה (GET) ציבורית — כדי שהתפריט יופיע באתר.
// יצירה/עדכון/מחיקה מוגנות: רק משתמש מחובר עם תפקיד manager.

const express = require('express');
const router = express.Router();
const dishController = require('../controllers/dish.controller');
const { verifyToken, authorize } = require('../middlewares/auth.middleware');

// ציבורי — כל אחד יכול לראות את התפריט
router.get('/', dishController.getAllDishes);
router.get('/:id', dishController.getDishById);

// מוגן — verifyToken ("מי אתה?") ואז authorize('manager') ("מה מותר לך?")
router.post('/', verifyToken, authorize('manager'), dishController.createDish);
router.put('/:id', verifyToken, authorize('manager'), dishController.updateDish);
router.delete('/:id', verifyToken, authorize('manager'), dishController.deleteDish);

module.exports = router;
