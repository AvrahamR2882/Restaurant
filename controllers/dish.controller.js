// controllers/dish.controller.js
// כל הלוגיקה העסקית של מנות. ה-routes רק "מפנים" לכאן.
// כל פונקציה עטופה ב-asyncHandler → שגיאות async נתפסות אוטומטית ועוברות ל-errorHandler.

const { Dish } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// GET /api/dishes  — שליפת כל המנות (ציבורי, לתפריט באתר)
// תמיכה בפילטר אופציונלי לפי קטגוריה: /api/dishes?category=main
exports.getAllDishes = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.category) where.category = req.query.category;

  const dishes = await Dish.findAll({ where, order: [['category', 'ASC'], ['name', 'ASC']] });
  res.status(200).json({ success: true, count: dishes.length, data: dishes });
});

// GET /api/dishes/:id  — שליפת מנה בודדת
exports.getDishById = asyncHandler(async (req, res) => {
  const dish = await Dish.findByPk(req.params.id);
  if (!dish) throw new AppError(404, `Dish with id ${req.params.id} not found`);

  res.status(200).json({ success: true, data: dish });
});

// POST /api/dishes  — יצירת מנה (manager בלבד — ההרשאה תיאכף בשלב 5)
exports.createDish = asyncHandler(async (req, res) => {
  const { name, price, category, available } = req.body;

  // הוולידציות המלאות ברמת ה-ORM ירוצו ב-create ויחזירו 400/409 דרך ה-errorHandler.
  const dish = await Dish.create({ name, price, category, available });
  res.status(201).json({ success: true, data: dish });
});

// PUT /api/dishes/:id  — עדכון מנה
exports.updateDish = asyncHandler(async (req, res) => {
  const dish = await Dish.findByPk(req.params.id);
  if (!dish) throw new AppError(404, `Dish with id ${req.params.id} not found`);

  // בונים אובייקט עדכון רק מהשדות שנשלחו בפועל — כדי לא לדרוס ערכים קיימים ב-undefined.
  const updates = {};
  for (const field of ['name', 'price', 'category', 'available']) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  await dish.update(updates);
  res.status(200).json({ success: true, data: dish });
});

// DELETE /api/dishes/:id  — מחיקת מנה
exports.deleteDish = asyncHandler(async (req, res) => {
  const dish = await Dish.findByPk(req.params.id);
  if (!dish) throw new AppError(404, `Dish with id ${req.params.id} not found`);

  await dish.destroy();
  res.status(200).json({ success: true, message: 'Dish deleted successfully' });
});
