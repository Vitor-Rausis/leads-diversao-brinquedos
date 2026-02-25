const express = require('express');
const router = express.Router();
const dripCampaignController = require('../controllers/dripCampaignController');
const authMiddleware = require('../middlewares/auth');
const { validate, dripCampaignSchema, dripEnqueueSchema } = require('../middlewares/validate');

router.use(authMiddleware);

router.get('/stats', dripCampaignController.stats);
router.get('/', dripCampaignController.list);
router.get('/:id', dripCampaignController.getById);
router.post('/', validate(dripCampaignSchema), dripCampaignController.create);
router.put('/:id', validate(dripCampaignSchema), dripCampaignController.update);
router.delete('/:id', dripCampaignController.remove);

// Enfileiramento manual e consulta por lead
router.post('/enqueue', validate(dripEnqueueSchema), dripCampaignController.enqueueManual);
router.get('/lead/:lead_id/queue', dripCampaignController.queueByLead);
router.delete('/lead/:lead_id/cancel', dripCampaignController.cancelLead);

module.exports = router;
