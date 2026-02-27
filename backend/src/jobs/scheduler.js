const cron = require('node-cron');
const whatsappJobs = require('./whatsappJobs');
const dripService = require('../services/dripService');
const { pollIncomingMessages } = require('./incomingMessagesJob');
const logger = require('../utils/logger');

function initScheduler() {
  // A cada minuto: busca mensagens recebidas na Evolution API (polling)
  cron.schedule('* * * * *', async () => {
    try {
      await pollIncomingMessages();
    } catch (err) {
      logger.error('[CRON] Erro no polling de mensagens:', err);
    }
  });

  // A cada minuto: verificar mensagens agendadas pendentes
  cron.schedule('* * * * *', async () => {
    try {
      await whatsappJobs.processScheduledMessages();
    } catch (err) {
      logger.error('[CRON] Erro ao processar mensagens agendadas:', err);
    }
  });

  // A cada minuto: processar fila de drip campaigns
  cron.schedule('* * * * *', async () => {
    try {
      await dripService.processQueue();
    } catch (err) {
      logger.error('[CRON] Erro ao processar fila drip:', err);
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

  logger.info('[CRON] Scheduler inicializado - polling (1min) + agendadas (1min) + drip (1min) + retry (02:00)');
}

module.exports = { initScheduler };
