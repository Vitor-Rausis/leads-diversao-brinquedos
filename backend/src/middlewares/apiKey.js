const supabase = require('../config/supabase');

async function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'API key obrigatoria' });
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, ativo')
      .eq('key_value', apiKey)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      return res.status(403).json({ error: 'API key invalida' });
    }

    req.apiKeyOwner = data.user_id;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao validar API key' });
  }
}

module.exports = apiKeyMiddleware;
