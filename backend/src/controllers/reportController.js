const ReportModel = require('../models/reportModel');
const ReportService = require('../services/reportService');
const CsvService = require('../services/csvService');

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

module.exports = { list, generate, downloadCSV };
