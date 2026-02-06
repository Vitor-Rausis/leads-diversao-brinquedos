require('dotenv').config();
const app = require('./app');
const { initScheduler } = require('./jobs/scheduler');
const logger = require('./utils/logger');
const env = require('./config/env');

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${env.NODE_ENV}`);
  initScheduler();
});
