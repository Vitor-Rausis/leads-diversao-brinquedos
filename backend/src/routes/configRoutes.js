const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const authMiddleware = require('../middlewares/auth');

// Todas as rotas requerem autenticacao
router.use(authMiddleware);

// Configuracoes de agendamento
router.get('/schedule', configController.getScheduleConfig);
router.put('/schedule', configController.updateScheduleConfig);

// Templates de mensagem
router.get('/templates', configController.getTemplates);
router.put('/templates/:tipo', configController.updateTemplate);

module.exports = router;
