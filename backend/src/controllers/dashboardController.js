const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');

async function stats(req, res, next) {
  try {
    const statusCounts = await LeadModel.countByStatus();
    const totalLeads = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const mensagensEnviadas = await MessageModel.countSent();
    const mensagensRecebidas = await MessageModel.countReceived();

    res.json({
      total_leads: totalLeads,
      por_status: statusCounts,
      mensagens_enviadas: mensagensEnviadas,
      mensagens_recebidas: mensagensRecebidas,
      taxa_resposta: mensagensEnviadas > 0
        ? ((mensagensRecebidas / mensagensEnviadas) * 100).toFixed(1)
        : '0.0',
    });
  } catch (err) {
    next(err);
  }
}

async function funnel(req, res, next) {
  try {
    const statusCounts = await LeadModel.countByStatus();
    const order = ['Novo', 'Em Contato', 'Respondeu', 'Convertido', 'Perdido'];
    const data = order.map((status) => ({
      status,
      count: statusCounts[status] || 0,
    }));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function progress(req, res, next) {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;
    const data = await LeadModel.getProgressData(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function origins(req, res, next) {
  try {
    const counts = await LeadModel.countByOrigem();
    const data = Object.entries(counts).map(([origem, count]) => ({
      origem,
      count,
    }));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { stats, funnel, progress, origins };
