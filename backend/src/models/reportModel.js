const supabase = require('../config/supabase');

class ReportModel {
  static async findAll({ page = 1, limit = 20 }) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from('relatorios')
      .select('*', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, total: count, page, limit };
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('relatorios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async create(reportData) {
    const { data, error } = await supabase
      .from('relatorios')
      .insert(reportData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = ReportModel;
