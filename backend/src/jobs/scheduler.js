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

  // A cada 5 minutos: verificar mensagens agendadas pendentes
  cron.schedule('*/5 * * * *', async () => {
    logger.info('[CRON] Verificando mensagens agendadas pendentes...');
    try {
      await whatsappJobs.processScheduledMessages();
    } catch (err) {
      logger.error('[CRON] Erro ao processar mensagens agendadas:', err);
    }
  });

  // A cada 5 minutos: processar fila de drip campaigns
  cron.schedule('*/5 * * * *', async () => {
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

  logger.info('[CRON] Scheduler inicializado - polling mensagens (1min) + agendadas (5min) + drip (5min)');
}

module.exports = { initScheduler };
