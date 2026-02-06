const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/auth');
const { validate, reportSchema } = require('../middlewares/validate');

router.use(authMiddleware);

router.get('/', reportController.list);
router.post('/generate', validate(reportSchema), reportController.generate);
router.get('/:id/csv', reportController.downloadCSV);

module.exports = router;
