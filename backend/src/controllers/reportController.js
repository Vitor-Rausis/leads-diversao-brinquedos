const ReportModel = require('../models/reportModel');
const ReportService = require('../services/reportService');
const CsvService = require('../services/csvService');
const supabase = require('../config/supabase');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await ReportModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function generate(req, res, next) {
  try {
    const { periodo_inicio, periodo_fim } = req.body;

    const reportData = await ReportService.generateReport(periodo_inicio, periodo_fim);
    reportData.gerado_por = req.user.id;

    const report = await ReportModel.create(reportData);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

async function downloadCSV(req, res, next) {
  try {
    const report = await ReportModel.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }

    const csvData = [
      {
        'Período Início': report.periodo_inicio,
        'Período Fim': report.periodo_fim,
        'Total de Leads': report.total_leads,
        'Leads Novos': report.leads_novos,
        'Leads Convertidos': report.leads_convertidos,
        'Leads Perdidos': report.leads_perdidos,
        'Mensagens Enviadas': report.mensagens_enviadas,
        'Mensagens Recebidas': report.mensagens_recebidas,
        'Taxa de Resposta (%)': report.dados_json?.taxa_resposta || '0',
        'Leads que Responderam': report.dados_json?.leads_responderam || 0,
      },
    ];

    const csv = CsvService.generateCSV(csvData);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=relatorio_${report.periodo_inicio}_${report.periodo_fim}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) {
    next(err);
  }
}

// GET /reports/live — dados ao vivo do mes corrente (nao salva no banco)
async function getLive(req, res, next) {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const periodoInicio = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const periodoFim = `${year}-${month}-${lastDay}`;

    const startDate = `${periodoInicio}T00:00:00.000Z`;
    const endDate = `${periodoFim}T23:59:59.999Z`;

    // Todos os leads (total acumulado)
    const { data: todosLeads, error: todosErr } = await supabase
      .from('leads')
      .select('id, status, origem, data_cadastro');
    if (todosErr) throw todosErr;

    // Leads cadastrados no mes atual
    const leadsDoMes = todosLeads.filter((l) => {
      const d = new Date(l.data_cadastro);
      return d >= new Date(startDate) && d <= new Date(endDate);
    });

    const totalLeads = todosLeads.length;
    const leadsNoMes = leadsDoMes.length;
    let leadsConvertidos = 0;
    let leadsPerdidos = 0;
    let leadsResponderam = 0;
    let leadsNovos = 0;
    let leadsEmContato = 0;
    const porOrigem = {};
    const porStatus = {};

    todosLeads.forEach((lead) => {
      if (lead.status === 'Convertido') leadsConvertidos++;
      if (lead.status === 'Perdido') leadsPerdidos++;
      if (lead.status === 'Respondeu') leadsResponderam++;
      if (lead.status === 'Novo') leadsNovos++;
      if (lead.status === 'Em Contato') leadsEmContato++;
      porOrigem[lead.origem] = (porOrigem[lead.origem] || 0) + 1;
      porStatus[lead.status] = (porStatus[lead.status] || 0) + 1;
    });

    // Mensagens do mes
    const { count: mensagensEnviadas } = await supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'enviada')
      .gte('criado_em', startDate)
      .lte('criado_em', endDate);

    const { count: mensagensRecebidas } = await supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'recebida')
      .gte('criado_em', startDate)
      .lte('criado_em', endDate);

    const taxaResposta = mensagensEnviadas > 0
      ? ((mensagensRecebidas / mensagensEnviadas) * 100).toFixed(1)
      : '0.0';

    const taxaConversao = totalLeads > 0
      ? ((leadsConvertidos / totalLeads) * 100).toFixed(1)
      : '0.0';

    res.json({
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      total_leads: totalLeads,
      leads_no_mes: leadsNoMes,
      leads_convertidos: leadsConvertidos,
      leads_perdidos: leadsPerdidos,
      leads_responderam: leadsResponderam,
      leads_novos: leadsNovos,
      leads_em_contato: leadsEmContato,
      mensagens_enviadas: mensagensEnviadas || 0,
      mensagens_recebidas: mensagensRecebidas || 0,
      taxa_resposta: taxaResposta,
      taxa_conversao: taxaConversao,
      por_origem: porOrigem,
      por_status: porStatus,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, generate, downloadCSV, getLive };
