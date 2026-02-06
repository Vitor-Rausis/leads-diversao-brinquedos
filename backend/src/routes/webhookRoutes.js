const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

router.post('/whatsapp', webhookController.handleWhatsAppWebhook);

module.exports = router;
