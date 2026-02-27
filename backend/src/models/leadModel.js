const supabase = require('../config/supabase');

class LeadModel {
  static async findAll({ page = 1, limit = 20, status, origem, search, sort = 'data_cadastro', order = 'desc' }) {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (origem) query = query.eq('origem', origem);
    if (search) query = query.ilike('nome', `%${search}%`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(sort, { ascending: order === 'asc' })
      .range(from, to);

    if (error) throw error;
    return { data, total: count, page, limit };
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findByIdWithMessages(id) {
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (leadError) throw leadError;

    const { data: agendadas } = await supabase
      .from('mensagens_agendadas')
      .select('*')
      .eq('lead_id', id)
      .order('data_agendada', { ascending: true });

    const { data: log } = await supabase
      .from('mensagens_log')
      .select('*')
      .eq('lead_id', id)
      .order('criado_em', { ascending: false });

    return { ...lead, mensagens_agendadas: agendadas || [], mensagens_log: log || [] };
  }

  static async create(leadData) {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id, updates) {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async bulkCreate(leadsArray) {
    const { data, error } = await supabase
      .from('leads')
      .insert(leadsArray)
      .select();

    if (error) throw error;
    return data;
  }

  static async findByWhatsapp(whatsapp) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, nome, status, data_cadastro')
      .eq('whatsapp', whatsapp)
      .single();

    if (error) return null;
    return data;
  }

  static async countByStatus() {
    const { data, error } = await supabase
      .from('leads')
      .select('status');

    if (error) throw error;

    const counts = { Novo: 0, 'Em Contato': 0, Respondeu: 0, Convertido: 0, Perdido: 0 };
    data.forEach((lead) => {
      if (counts[lead.status] !== undefined) counts[lead.status]++;
    });
    return counts;
  }

  static async countByOrigem() {
    const { data, error } = await supabase
      .from('leads')
      .select('origem');

    if (error) throw error;

    const counts = {};
    data.forEach((lead) => {
      counts[lead.origem] = (counts[lead.origem] || 0) + 1;
    });
    return counts;
  }

  static async getProgressData(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('leads')
      .select('data_cadastro')
      .gte('data_cadastro', since.toISOString());

    if (error) throw error;

    const grouped = {};
    data.forEach((lead) => {
      const date = lead.data_cadastro.split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([data, total]) => ({ data, total }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }
}

module.exports = LeadModel;
