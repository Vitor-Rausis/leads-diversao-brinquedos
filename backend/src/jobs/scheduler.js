const cron = require('node-cron');
const whatsappJobs = require('./whatsappJobs');
const logger = require('../utils/logger');

// Polling e processamento de mensagens agendadas/drip são disparados externamente
// pelo GitHub Actions via POST /api/v1/cron/* — garante execução mesmo no Render free tier.

function initScheduler() {
  // Diariamente as 02:00: retry de mensagens falhas (baixa frequência, pode rodar internamente)
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Retentando mensagens falhas...');
    try {
      await whatsappJobs.retryFailedMessages();
    } catch (err) {
      logger.error('[CRON] Erro ao retentar mensagens falhas:', err);
    }
  });

  logger.info('[CRON] Scheduler inicializado - retry diário (02:00) | polling/agendadas via GitHub Actions');
}

module.exports = { initScheduler };
