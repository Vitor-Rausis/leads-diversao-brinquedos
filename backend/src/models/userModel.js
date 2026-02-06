const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

class UserModel {
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('ativo', true)
      .single();

    if (error) return null;
    return data;
  }

  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, nome, email, role, ativo, criado_em')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  static async create({ nome, email, senha, role = 'operator' }) {
    const senha_hash = await bcrypt.hash(senha, 10);
    const { data, error } = await supabase
      .from('users')
      .insert({ nome, email, senha_hash, role })
      .select('id, nome, email, role, criado_em')
      .single();

    if (error) throw error;
    return data;
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserModel;
