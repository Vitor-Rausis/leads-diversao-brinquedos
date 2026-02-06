const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const apiKeyMiddleware = require('../middlewares/apiKey');
const { publicFormLimiter } = require('../middlewares/rateLimiter');
const { validate, publicLeadSchema } = require('../middlewares/validate');

router.post(
  '/leads',
  publicFormLimiter,
  apiKeyMiddleware,
  validate(publicLeadSchema),
  leadController.createPublic
);

module.exports = router;
