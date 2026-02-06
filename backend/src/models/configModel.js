const supabase = require('../config/supabase');

const configModel = {
  async getAll() {
    const { data, error } = await supabase
      .from('configuracoes_mensagem')
      .select('*')
      .order('dias', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getByTipo(tipo) {
    const { data, error } = await supabase
      .from('configuracoes_mensagem')
      .select('*')
      .eq('tipo', tipo)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async update(tipo, updates) {
    const { data, error } = await supabase
      .from('configuracoes_mensagem')
      .update({
        ...updates,
        atualizado_em: new Date().toISOString(),
      })
      .eq('tipo', tipo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAll(configs) {
    const results = [];
    for (const config of configs) {
      const { tipo, dias, hora, ativo } = config;
      const { data, error } = await supabase
        .from('configuracoes_mensagem')
        .update({
          dias,
          hora,
          ativo,
          atualizado_em: new Date().toISOString(),
        })
        .eq('tipo', tipo)
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    }
    return results;
  },

  // Obter templates de mensagem
  async getTemplates() {
    const { data, error } = await supabase
      .from('templates_mensagem')
      .select('*')
      .order('tipo');

    if (error) throw error;
    return data;
  },

  async updateTemplate(tipo, conteudo) {
    const { data, error } = await supabase
      .from('templates_mensagem')
      .update({
        conteudo,
        atualizado_em: new Date().toISOString(),
      })
      .eq('tipo', tipo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

module.exports = configModel;
