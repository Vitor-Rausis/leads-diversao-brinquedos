require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const { initScheduler } = require('./jobs/scheduler');
const whatsappService = require('./services/whatsappService');
const { handleIncomingMessage } = require('./controllers/webhookController');
const logger = require('./utils/logger');
const env = require('./config/env');

const PORT = env.PORT;

// Check if frontend dist exists
const frontendPath = path.join(__dirname, '../../frontend/dist');
const distExists = fs.existsSync(frontendPath);
const indexExists = fs.existsSync(path.join(frontendPath, 'index.html'));

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${env.NODE_ENV}`);
  logger.info(`Frontend dist existe: ${distExists}`);
  logger.info(`Frontend index.html existe: ${indexExists}`);

  // Inicializa scheduler de mensagens
  initScheduler();

  // Inicializa WhatsApp (whatsapp-web.js - gratuito)
  whatsappService.initialize();

  // Registra handler para mensagens recebidas
  whatsappService.onMessage(handleIncomingMessage);

  logger.info('WhatsApp inicializando... Acesse Configuracoes > WhatsApp para conectar.');
});
