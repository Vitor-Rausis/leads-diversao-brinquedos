require('dotenv').config();
const fs = require('fs');
const path = require('path');
const app = require('./app');
const { initScheduler } = require('./jobs/scheduler');
const evolutionApi = require('./services/evolutionApiService');
const logger = require('./utils/logger');
const env = require('./config/env');

const PORT = env.PORT;

// Check if frontend dist exists
const frontendPath = path.join(__dirname, '../../frontend/dist');
const distExists = fs.existsSync(frontendPath);
const indexExists = fs.existsSync(path.join(frontendPath, 'index.html'));

app.listen(PORT, async () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${env.NODE_ENV}`);
  logger.info(`Frontend dist existe: ${distExists}`);
  logger.info(`Frontend index.html existe: ${indexExists}`);

  // Inicializa scheduler de mensagens
  initScheduler();

  // Verifica conexao com Evolution API
  const connected = await evolutionApi.isConnected();
  if (connected) {
    logger.info('Evolution API conectada e pronta para enviar mensagens.');
  } else {
    logger.warn('Evolution API nao conectada. Verifique a configuracao no .env e conecte a instancia.');
  }
});
