const supabase = require('../config/supabase');
const whatsappService = require('../services/whatsappService');
const logger = require('../utils/logger');

const MAX_RETRIES = 3;

// Templates padrao caso nao existam no banco
const DEFAULT_TEMPLATES = {
  dia_3: 'Ola {{nome}}, voce tem alguma duvida sobre os brinquedos, ou tem interesse em fazer a reserva?',
  dia_7: 'Ola {{nome}}, como vai? Voce ja fez a locacao dos brinquedos, ou tem interesse em fazer a locacao?',
  mes_10: 'Ola {{nome}}, sou o Fernando da Diversao Brinquedos, como vai?\nHa um tempo atras voce fez a cotacao de brinquedos com nossa empresa.\nGostaria de saber se tem interesse em receber o catalogo atualizado para uma nova locacao?',
};

async function processScheduledMessages() {
  const { data: messages, error } = await supabase
    .from('mensagens_agendadas')
    .select(`
      id, tipo, data_agendada, tentativas,
      leads!inner(id, nome, whatsapp, status)
    `)
    .eq('status', 'pendente')
    .lte('data_agendada', new Date().toISOString())
    .limit(50);

  if (error) {
    logger.error('Erro ao consultar mensagens agendadas:', error);
    return;
  }
  if (!messages || messages.length === 0) return;

  // Fetch templates
  const { data: templates } = await supabase
    .from('templates_mensagem')
    .select('tipo, conteudo')
    .eq('ativo', true);

  const templateMap = {};
  if (templates) {
    templates.forEach((t) => {
      templateMap[t.tipo] = t.conteudo;
    });
  }

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    const lead = msg.leads;

    // Skip if lead is Perdido, Convertido or Respondeu
    if (['Perdido', 'Convertido', 'Respondeu'].includes(lead.status)) {
      await supabase
        .from('mensagens_agendadas')
        .update({ status: 'cancelada' })
        .eq('id', msg.id);
      continue;
    }

    const template = templateMap[msg.tipo] || DEFAULT_TEMPLATES[msg.tipo];
    if (!template) {
      logger.warn(`Sem template para tipo: ${msg.tipo}`);
      continue;
    }

    const text = template.replace(/\{\{nome\}\}/g, lead.nome);

    const result = await whatsappService.sendTextMessage(lead.whatsapp, text);

    if (result.success) {
      await supabase
        .from('mensagens_agendadas')
        .update({
          status: 'enviada',
          enviada_em: new Date().toISOString(),
        })
        .eq('id', msg.id);

      await supabase.from('mensagens_log').insert({
        lead_id: lead.id,
        whatsapp: lead.whatsapp,
        direcao: 'enviada',
        conteudo: text,
        mensagem_agendada_id: msg.id,
        metadata: result.data,
      });

      if (lead.status === 'Novo') {
        await supabase
          .from('leads')
          .update({ status: 'Em Contato' })
          .eq('id', lead.id);
      }

      sent++;
    } else {
      const tentativas = msg.tentativas + 1;
      await supabase
        .from('mensagens_agendadas')
        .update({
          status: tentativas >= MAX_RETRIES ? 'falha' : 'pendente',
          tentativas,
          erro_detalhe: JSON.stringify(result.error),
        })
        .eq('id', msg.id);

      failed++;
    }
  }

  if (sent > 0 || failed > 0) {
    logger.info(`[CRON] Processadas: ${sent} enviadas, ${failed} falharam`);
  }
}

async function retryFailedMessages() {
  const { data, error } = await supabase
    .from('mensagens_agendadas')
    .update({ status: 'pendente' })
    .eq('status', 'falha')
    .lt('tentativas', MAX_RETRIES)
    .select('id');

  if (error) {
    logger.error('Erro ao resetar mensagens falhas:', error);
    return;
  }

  if (data && data.length > 0) {
    logger.info(`[CRON] ${data.length} mensagens falhas resetadas para retry`);
  }
}

module.exports = { processScheduledMessages, retryFailedMessages };
