const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/api-keys', settingsController.listApiKeys);
router.post('/api-keys', settingsController.createApiKey);
router.put('/api-keys/:id/deactivate', settingsController.deactivateApiKey);

module.exports = router;
