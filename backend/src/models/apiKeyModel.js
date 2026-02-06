const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class ApiKeyModel {
  static async findAll(userId) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, key_value, descricao, ativo, criado_em')
      .eq('user_id', userId)
      .order('criado_em', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async create({ descricao, user_id }) {
    const key_value = `ldb_${crypto.randomBytes(24).toString('hex')}`;

    const { data, error } = await supabase
      .from('api_keys')
      .insert({ key_value, descricao, user_id })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deactivate(id, userId) {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ ativo: false })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

module.exports = ApiKeyModel;
