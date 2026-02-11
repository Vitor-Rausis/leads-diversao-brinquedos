const LeadModel = require('../models/leadModel');
const CsvService = require('../services/csvService');
const { formatPhone } = require('../utils/formatPhone');

async function list(req, res, next) {
  try {
    const { page = 1, limit = 20, status, origem, search, sort, order } = req.query;
    const result = await LeadModel.findAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      origem,
      search,
      sort,
      order,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const lead = await LeadModel.findByIdWithMessages(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead não encontrado' });
    }
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const leadData = {
      ...req.body,
      whatsapp: formatPhone(req.body.whatsapp),
      criado_por: req.user.id,
    };
    const lead = await LeadModel.create(leadData);
    res.status(201).json(lead);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const updates = { ...req.body };
    if (updates.whatsapp) {
      updates.whatsapp = formatPhone(updates.whatsapp);
    }
    const lead = await LeadModel.update(req.params.id, updates);
    res.json(lead);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await LeadModel.delete(req.params.id);
    res.json({ message: 'Lead removido com sucesso' });
  } catch (err) {
    next(err);
  }
}

async function importFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    const fileName = req.file.originalname.toLowerCase();
    let result;

    if (fileName.endsWith('.csv')) {
      result = CsvService.parseCSV(req.file.buffer);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      result = CsvService.parseExcel(req.file.buffer);
    } else {
      return res.status(400).json({ error: 'Formato não suportado. Use CSV ou Excel.' });
    }

    if (result.leads.length === 0) {
      return res.status(400).json({
        error: 'Nenhum lead válido encontrado no arquivo',
        errors: result.errors,
      });
    }

    // Add criado_por to all leads
    const leadsWithUser = result.leads.map((l) => ({
      ...l,
      criado_por: req.user.id,
    }));

    const imported = await LeadModel.bulkCreate(leadsWithUser);

    res.status(201).json({
      message: `${imported.length} leads importados com sucesso`,
      imported: imported.length,
      errors: result.errors,
    });
  } catch (err) {
    next(err);
  }
}

async function createPublic(req, res, next) {
  try {
    const leadData = {
      nome: req.body.nome,
      whatsapp: formatPhone(req.body.whatsapp),
      origem: req.body.origem || 'Formulário do site',
      observacoes: req.body.observacoes || null,
      status: 'Novo',
    };

    const lead = await LeadModel.create(leadData);
    res.status(201).json({ message: 'Lead recebido com sucesso', id: lead.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById, create, update, remove, importFile, createPublic };
