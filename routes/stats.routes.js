// routes/stats.routes.js
// מאזן, סטטיסטיקה וסגירת יום — הכל שמור למנהל בלבד.

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { verifyToken, authorize } = require('../middlewares/auth.middleware');

// כל הנתיבים כאן דורשים התחברות + תפקיד מנהל.
router.use(verifyToken, authorize('manager'));

router.get('/', statsController.getStats);
router.post('/close-day', statsController.closeDay);
router.get('/closures', statsController.getClosures);
router.get('/closures/:id', statsController.getClosureById);

module.exports = router;
