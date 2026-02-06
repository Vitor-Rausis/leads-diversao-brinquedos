const ApiKeyModel = require('../models/apiKeyModel');

async function listApiKeys(req, res, next) {
  try {
    const keys = await ApiKeyModel.findAll(req.user.id);
    res.json(keys);
  } catch (err) {
    next(err);
  }
}

async function createApiKey(req, res, next) {
  try {
    const { descricao } = req.body;
    const key = await ApiKeyModel.create({
      descricao: descricao || 'API Key',
      user_id: req.user.id,
    });
    res.status(201).json(key);
  } catch (err) {
    next(err);
  }
}

async function deactivateApiKey(req, res, next) {
  try {
    await ApiKeyModel.deactivate(req.params.id, req.user.id);
    res.json({ message: 'API key desativada' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listApiKeys, createApiKey, deactivateApiKey };
