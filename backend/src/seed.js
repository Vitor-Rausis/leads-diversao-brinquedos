require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('Criando usuario admin...');

  const senha_hash = await bcrypt.hash('admin123', 10);

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        nome: 'Administrador',
        email: 'admin@diversaobrinquedos.com',
        senha_hash,
        role: 'admin',
        ativo: true,
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar usuario:', error);
    return;
  }

  console.log('Usuario admin criado:', data.email);

  // Seed message templates
  console.log('Criando templates de mensagens...');

  const templates = [
    {
      tipo: 'dia_3',
      conteudo:
        'Ola {{nome}}, voce tem alguma duvida sobre os brinquedos, ou tem interesse em fazer a reserva?',
    },
    {
      tipo: 'dia_7',
      conteudo:
        'Ola {{nome}}, como vai? Voce ja fez a locacao dos brinquedos, ou tem interesse em fazer a locacao?',
    },
    {
      tipo: 'mes_10',
      conteudo:
        'Ola {{nome}}, sou o Fernando da Diversao Brinquedos, como vai?\nHa um tempo atras voce fez a cotacao de brinquedos com nossa empresa.\nGostaria de saber se tem interesse em receber o catalogo atualizado para uma nova locacao?',
    },
  ];

  for (const t of templates) {
    const { error: tErr } = await supabase
      .from('templates_mensagem')
      .upsert(t, { onConflict: 'tipo' });

    if (tErr) {
      console.error(`Erro ao criar template ${t.tipo}:`, tErr);
    } else {
      console.log(`Template ${t.tipo} criado`);
    }
  }

  console.log('\nSeed completo!');
  console.log('Login: admin@diversaobrinquedos.com / admin123');
}

seed().catch(console.error);
