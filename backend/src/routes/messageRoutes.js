const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', messageController.listLog);
router.get('/scheduled', messageController.listScheduled);
router.get('/scheduled/bulk-summary', messageController.listBulkSummary);
router.post('/scheduled/bulk', messageController.bulkScheduled);
router.post('/scheduled/bulk-cancel', messageController.cancelBulkBatch);
router.post('/scheduled', messageController.createScheduled);
router.put('/scheduled/:id', messageController.updateScheduled);
router.delete('/scheduled/:id', messageController.cancelScheduled);

module.exports = router;
