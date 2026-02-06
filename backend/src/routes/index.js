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

router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/messages', messageRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/public', publicRoutes);
router.use('/webhook', webhookRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
