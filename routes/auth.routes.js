// routes/auth.routes.js
// נתיבי האימות:
//   /register — יצירת עובד חדש. מוגן: רק מנהל מחובר יכול. (המנהל הראשון נוצר ע"י ה-seed.)
//   /login    — פתוח לכולם; מחזיר טוקן.
//   /me       — מוגן: דורש טוקן תקין.

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken, authorize } = require('../middlewares/auth.middleware');

router.post('/register', verifyToken, authorize('manager'), authController.register);
router.post('/login', authController.login);
router.get('/me', verifyToken, authController.me);

// ניהול צוות — מנהל בלבד
router.get('/users', verifyToken, authorize('manager'), authController.getAllUsers);
router.delete('/users/:id', verifyToken, authorize('manager'), authController.deleteUser);

module.exports = router;
