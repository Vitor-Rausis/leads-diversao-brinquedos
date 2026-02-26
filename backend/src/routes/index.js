const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const leadRoutes = require('./leadRoutes');
const messageRoutes = require('./messageRoutes');
const reportRoutes = require('./reportRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const publicRoutes = require('./publicRoutes');
const webhookRoutes = require('./webhookRoutes');
const settingsRoutes = require('./settingsRoutes');
const configRoutes = require('./configRoutes');
const whatsappRoutes = require('./whatsappRoutes');
const dripCampaignRoutes = require('./dripCampaignRoutes');
const cronRoutes = require('./cronRoutes');

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/messages', messageRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/public', publicRoutes);
router.use('/webhook', webhookRoutes);
router.use('/settings', settingsRoutes);
router.use('/config', configRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/drip-campaigns', dripCampaignRoutes);
router.use('/cron', cronRoutes);

module.exports = router;
