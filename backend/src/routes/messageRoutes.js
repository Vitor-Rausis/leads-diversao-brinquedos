const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/', messageController.listLog);
router.get('/scheduled', messageController.listScheduled);
router.post('/scheduled', messageController.createScheduled);

module.exports = router;
