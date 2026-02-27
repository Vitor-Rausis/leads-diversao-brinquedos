const MessageModel = require('../models/messageModel');

const TIPOS_VALIDOS = ['dia_3', 'dia_7', 'mes_10'];

async function createScheduled(req, res, next) {
  try {
    const { lead_id, tipo, conteudo_custom, data_agendada } = req.body;

    if (!lead_id) return res.status(400).json({ error: 'lead_id é obrigatório' });
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) return res.status(400).json({ error: 'tipo inválido. Use: dia_3, dia_7 ou mes_10' });
    if (!data_agendada) return res.status(400).json({ error: 'data_agendada é obrigatória' });
    if (new Date(data_agendada) <= new Date()) return res.status(400).json({ error: 'data_agendada deve ser no futuro' });
    if (conteudo_custom !== undefined && conteudo_custom !== null && conteudo_custom.trim() === '') {
      return res.status(400).json({ error: 'conteudo_custom não pode ser vazio' });
    }

    const result = await MessageModel.createScheduled({ lead_id, tipo, conteudo_custom, data_agendada });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function listLog(req, res, next) {
  try {
    const { page = 1, limit = 50, lead_id, direcao, search } = req.query;
    const result = await MessageModel.findAllLog({
      page: parseInt(page),
      limit: parseInt(limit),
      lead_id,
      direcao,
      search,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listScheduled(req, res, next) {
  try {
    const { page = 1, limit = 50, status, lead_id } = req.query;
    const result = await MessageModel.findScheduled({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      lead_id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listLog, listScheduled, createScheduled };
