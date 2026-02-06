const MessageModel = require('../models/messageModel');

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

module.exports = { listLog, listScheduled };
