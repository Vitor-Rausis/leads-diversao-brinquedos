const express = require('express');
const router = express.Router();
const { pollIncomingMessages } = require('../jobs/incomingMessagesJob');
const whatsappJobs = require('../jobs/whatsappJobs');
const dripService = require('../services/dripService');
const logger = require('../utils/logger');
const env = require('../config/env');

// Middleware: verifica x-cron-secret
function verifyCronSecret(req, res, next) {
  if (!env.CRON_SECRET) {
    return res.status(503).json({ error: 'CRON_SECRET não configurado no servidor' });
  }
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/v1/cron/poll-messages
// Chamado a cada minuto pelo GitHub Actions — busca respostas recebidas na Evolution API
router.post('/poll-messages', verifyCronSecret, async (req, res) => {
  const start = Date.now();
  try {
    await pollIncomingMessages();
    res.json({ ok: true, duration_ms: Date.now() - start });
  } catch (err) {
    logger.error('[CRON] Erro em poll-messages:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/v1/cron/process-scheduled
// Chamado a cada 5 minutos pelo GitHub Actions — processa mensagens agendadas e fila drip
router.post('/process-scheduled', verifyCronSecret, async (req, res) => {
  const start = Date.now();
  try {
    await Promise.all([
      whatsappJobs.processScheduledMessages(),
      dripService.processQueue(),
    ]);
    res.json({ ok: true, duration_ms: Date.now() - start });
  } catch (err) {
    logger.error('[CRON] Erro em process-scheduled:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
