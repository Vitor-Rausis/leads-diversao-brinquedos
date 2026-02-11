const configModel = require('../models/configModel');
const logger = require('../utils/logger');

const configController = {
  // GET /api/v1/config/schedule
  async getScheduleConfig(req, res) {
    try {
      const configs = await configModel.getAll();
      res.json(configs);
    } catch (error) {
      logger.error('Erro ao buscar configurações:', error);
      res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
  },

  // PUT /api/v1/config/schedule
  async updateScheduleConfig(req, res) {
    try {
      const { configs } = req.body;

      if (!Array.isArray(configs)) {
        return res.status(400).json({ error: 'configs deve ser um array' });
      }

      // Validar cada config
      for (const config of configs) {
        if (!config.tipo || config.dias === undefined || !config.hora) {
          return res.status(400).json({
            error: 'Cada config deve ter tipo, dias e hora'
          });
        }

        if (config.dias < 0) {
          return res.status(400).json({
            error: 'dias deve ser maior ou igual a 0'
          });
        }

        // Validar formato da hora (HH:MM ou HH:MM:SS)
        const horaRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        if (!horaRegex.test(config.hora)) {
          return res.status(400).json({
            error: 'hora deve estar no formato HH:MM'
          });
        }
        // Normalizar para HH:MM
        config.hora = config.hora.substring(0, 5);
      }

      const updated = await configModel.updateAll(configs);
      res.json({
        message: 'Configurações atualizadas com sucesso',
        configs: updated
      });
    } catch (error) {
      logger.error('Erro ao atualizar configurações:', error);
      res.status(500).json({ error: 'Erro ao atualizar configurações' });
    }
  },

  // GET /api/v1/config/templates
  async getTemplates(req, res) {
    try {
      const templates = await configModel.getTemplates();
      res.json(templates);
    } catch (error) {
      logger.error('Erro ao buscar templates:', error);
      res.status(500).json({ error: 'Erro ao buscar templates' });
    }
  },

  // PUT /api/v1/config/templates/:tipo
  async updateTemplate(req, res) {
    try {
      const { tipo } = req.params;
      const { conteudo } = req.body;

      if (!conteudo) {
        return res.status(400).json({ error: 'Conteúdo é obrigatório' });
      }

      const updated = await configModel.updateTemplate(tipo, conteudo);
      res.json({
        message: 'Template atualizado com sucesso',
        template: updated
      });
    } catch (error) {
      logger.error('Erro ao atualizar template:', error);
      res.status(500).json({ error: 'Erro ao atualizar template' });
    }
  },
};

module.exports = configController;
