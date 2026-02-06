const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Dados invalidos',
      details: err.errors,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }

  const status = err.statusCode || 500;
  const message = status === 500 ? 'Erro interno do servidor' : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
