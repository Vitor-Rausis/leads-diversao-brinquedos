const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', messageController.listLog);
router.get('/scheduled', messageController.listScheduled);
router.post('/scheduled', messageController.createScheduled);
router.put('/scheduled/:id', messageController.updateScheduled);
router.delete('/scheduled/:id', messageController.cancelScheduled);

module.exports = router;
