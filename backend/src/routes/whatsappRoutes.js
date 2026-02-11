const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/status', whatsappController.getStatus);
router.get('/qr-code', whatsappController.getQRCode);
router.post('/disconnect', whatsappController.disconnect);
router.post('/reconnect', whatsappController.reconnect);

module.exports = router;
