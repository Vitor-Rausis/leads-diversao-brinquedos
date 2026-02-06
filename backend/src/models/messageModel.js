const supabase = require('../config/supabase');

class MessageModel {
  static async findAllLog({ page = 1, limit = 50, lead_id, direcao, search }) {
    let query = supabase
      .from('mensagens_log')
      .select('*, leads:lead_id(id, nome, whatsapp)', { count: 'exact' });

    if (lead_id) query = query.eq('lead_id', lead_id);
    if (direcao) query = query.eq('direcao', direcao);
    if (search) query = query.ilike('conteudo', `%${search}%`);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, total: count, page, limit };
  }

  static async findScheduled({ page = 1, limit = 50, status, lead_id }) {
    let query = supabase
      .from('mensagens_agendadas')
      .select('*, leads:lead_id(id, nome, whatsapp)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (lead_id) query = query.eq('lead_id', lead_id);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order('data_agendada', { ascending: true })
      .range(from, to);

    if (error) throw error;
    return { data, total: count, page, limit };
  }

  static async createLog(logData) {
    const { data, error } = await supabase
      .from('mensagens_log')
      .insert(logData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async cancelPendingForLead(leadId) {
    const { error } = await supabase
      .from('mensagens_agendadas')
      .update({ status: 'cancelada' })
      .eq('lead_id', leadId)
      .eq('status', 'pendente');

    if (error) throw error;
  }

  static async countSent(startDate, endDate) {
    let query = supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'enviada');

    if (startDate) query = query.gte('criado_em', startDate);
    if (endDate) query = query.lte('criado_em', endDate);

    const { count, error } = await query;
    if (error) throw error;
    return count;
  }

  static async countReceived(startDate, endDate) {
    let query = supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'recebida');

    if (startDate) query = query.gte('criado_em', startDate);
    if (endDate) query = query.lte('criado_em', endDate);

    const { count, error } = await query;
    if (error) throw error;
    return count;
  }
}

module.exports = MessageModel;
