const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/stats', dashboardController.stats);
router.get('/funnel', dashboardController.funnel);
router.get('/progress', dashboardController.progress);
router.get('/origins', dashboardController.origins);

module.exports = router;
