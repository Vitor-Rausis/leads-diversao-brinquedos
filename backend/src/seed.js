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

  // Seed drip campaign - Diversao Brinquedos Follow-up
  console.log('Criando campanha drip...');

  const { data: existingCampaign } = await supabase
    .from('drip_campaigns')
    .select('id')
    .eq('name', 'Diversão Brinquedos - Follow-up')
    .single();

  if (existingCampaign) {
    console.log('Campanha drip ja existe, pulando...');
  } else {
    const { data: campaign, error: campErr } = await supabase
      .from('drip_campaigns')
      .insert({
        name: 'Diversão Brinquedos - Follow-up',
        description: 'Sequência automática: 3 dias, 7 dias e 10 meses após cadastro',
        trigger_event: 'lead_created',
        is_active: true,
      })
      .select()
      .single();

    if (campErr) {
      console.error('Erro ao criar campanha drip:', campErr);
    } else {
      const steps = [
        {
          campaign_id: campaign.id,
          step_order: 1,
          delay_minutes: 4320, // 3 dias
          message_template:
            'Olá {{nome}}, você tem alguma dúvida sobre os brinquedos, ou tem interesse em fazer a reserva?',
        },
        {
          campaign_id: campaign.id,
          step_order: 2,
          delay_minutes: 5760, // +4 dias (total 7 dias)
          message_template:
            'Olá {{nome}}, como vai?\nVocê já fez a locação dos brinquedos, ou tem interesse em fazer a locação?',
        },
        {
          campaign_id: campaign.id,
          step_order: 3,
          delay_minutes: 432000, // +~300 dias (total ~10 meses)
          message_template:
            'Olá {{nome}}, sou o Fernando da Diversão Brinquedos, como vai?\n\nA um tempo atrás você fez a cotação de brinquedos com nossa empresa, quero saber se tem interesse em receber o catálogo atualizado para uma nova locação?',
        },
      ];

      const { error: stepsErr } = await supabase.from('drip_steps').insert(steps);

      if (stepsErr) {
        console.error('Erro ao criar steps da campanha:', stepsErr);
      } else {
        console.log('Campanha drip criada: 3 steps (3 dias, 7 dias, 10 meses)');
      }
    }
  }

  console.log('\nSeed completo!');
  console.log('Login: admin@diversaobrinquedos.com / admin123');
}

seed().catch(console.error);
