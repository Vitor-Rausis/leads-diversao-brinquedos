const MessageModel = require('../models/messageModel');
const supabase = require('../config/supabase');

const TIPOS_VALIDOS = ['dia_3', 'dia_7', 'mes_10'];
const STATUS_VALIDOS = ['Novo', 'Em Contato', 'Respondeu', 'Convertido', 'Perdido'];

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

    const result = await MessageModel.createScheduled({ lead_id, tipo, conteudo_custom, data_agendada, forcar_envio: true });
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

async function updateScheduled(req, res, next) {
  try {
    const { id } = req.params;
    const { conteudo_custom, data_agendada } = req.body;

    if (!data_agendada) return res.status(400).json({ error: 'data_agendada é obrigatória' });
    if (new Date(data_agendada) <= new Date()) return res.status(400).json({ error: 'data_agendada deve ser no futuro' });
    if (conteudo_custom !== undefined && conteudo_custom !== null && conteudo_custom.trim() === '') {
      return res.status(400).json({ error: 'conteudo_custom não pode ser vazio' });
    }

    const result = await MessageModel.updateScheduled(id, { conteudo_custom, data_agendada });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function cancelScheduled(req, res, next) {
  try {
    const { id } = req.params;
    const result = await MessageModel.cancelScheduled(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function bulkScheduled(req, res, next) {
  try {
    const { status_leads, conteudo, data_agendada } = req.body;

    if (!status_leads || !Array.isArray(status_leads) || status_leads.length === 0) {
      return res.status(400).json({ error: 'status_leads é obrigatório e deve ser um array' });
    }
    for (const s of status_leads) {
      if (!STATUS_VALIDOS.includes(s)) {
        return res.status(400).json({ error: `Status inválido: ${s}` });
      }
    }
    if (!conteudo || conteudo.trim() === '') {
      return res.status(400).json({ error: 'conteudo é obrigatório' });
    }
    if (!data_agendada) {
      return res.status(400).json({ error: 'data_agendada é obrigatória' });
    }
    if (new Date(data_agendada) <= new Date()) {
      return res.status(400).json({ error: 'data_agendada deve ser no futuro' });
    }

    // Busca todos os leads com os status selecionados
    const { data: leads, error } = await supabase
      .from('leads')
      .select('id')
      .in('status', status_leads);

    if (error) throw error;
    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'Nenhum lead encontrado com os status selecionados' });
    }

    // Cria mensagens agendadas em lote
    const rows = leads.map((lead) => ({
      lead_id: lead.id,
      tipo: 'mes_10',
      conteudo_custom: conteudo.trim(),
      data_agendada,
      forcar_envio: true,
      status: 'pendente',
      tentativas: 0,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('mensagens_agendadas')
      .insert(rows)
      .select('id');

    if (insertError) throw insertError;

    res.status(201).json({ agendadas: inserted.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { listLog, listScheduled, createScheduled, updateScheduled, cancelScheduled, bulkScheduled };
