const cron = require('node-cron');
const whatsappJobs = require('./whatsappJobs');
const logger = require('../utils/logger');

function initScheduler() {
  // A cada 5 minutos: verificar mensagens agendadas pendentes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('[CRON] Verificando mensagens agendadas pendentes...');
    try {
      await whatsappJobs.processScheduledMessages();
    } catch (err) {
      logger.error('[CRON] Erro ao processar mensagens agendadas:', err);
    }
  });

  // Diariamente as 02:00: retry de mensagens falhas
  cron.schedule('0 2 * * *', async () => {
    logger.info('[CRON] Retentando mensagens falhas...');
    try {
      await whatsappJobs.retryFailedMessages();
    } catch (err) {
      logger.error('[CRON] Erro ao retentar mensagens falhas:', err);
    }
  });

  logger.info('[CRON] Scheduler inicializado - verificacao a cada 5 minutos');
}

module.exports = { initScheduler };
