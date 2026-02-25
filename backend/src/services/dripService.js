const supabase = require('../config/supabase');
const evolutionApi = require('./evolutionApiService');
const logger = require('../utils/logger');

/**
 * Resolve variaveis no template: {{nome}}, {{primeiro_nome}}, {{whatsapp}}, {{origem}}
 * Usa os nomes de coluna do banco existente (portugues).
 */
function resolveTemplate(template, lead) {
  if (!template) return '';
  return template
    .replace(/\{\{nome\}\}/g, lead.nome || '')
    .replace(/\{\{primeiro_nome\}\}/g, (lead.nome || '').split(' ')[0])
    .replace(/\{\{first_name\}\}/g, (lead.nome || '').split(' ')[0])
    .replace(/\{\{name\}\}/g, lead.nome || '')
    .replace(/\{\{whatsapp\}\}/g, lead.whatsapp || '')
    .replace(/\{\{phone\}\}/g, lead.whatsapp || '')
    .replace(/\{\{origem\}\}/g, lead.origem || '')
    .replace(/\{\{source\}\}/g, lead.origem || '');
}

/**
 * Processa mensagens pendentes na fila drip.
 * Chamado pelo node-cron a cada 5 minutos.
 */
async function processQueue() {
  const now = new Date().toISOString();

  const { data: pendingMessages, error } = await supabase
    .from('drip_queue')
    .select(`
      *,
      lead:leads(*),
      step:drip_steps(*)
    `)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(50);

  if (error) {
    logger.error('[DripService] Erro ao buscar fila:', error.message);
    return;
  }

  if (!pendingMessages || pendingMessages.length === 0) return;

  logger.info(`[DripService] Processando ${pendingMessages.length} mensagens drip pendentes`);

  let sent = 0;
  let failed = 0;

  for (const item of pendingMessages) {
    // Verifica se lead foi convertido/perdido — cancela
    if (['Convertido', 'Perdido'].includes(item.lead?.status)) {
      await supabase.from('drip_queue').update({ status: 'cancelled' }).eq('id', item.id);
      continue;
    }

    // Resolve template com dados do lead
    const message = resolveTemplate(item.step.message_template, item.lead);

    // Envia via Evolution API
    const result = await evolutionApi.sendText(item.lead.whatsapp, message);

    if (result.success) {
      await supabase.from('drip_queue').update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: result.messageId || null,
        attempts: item.attempts + 1,
      }).eq('id', item.id);

      // Loga no mensagens_log existente
      await supabase.from('mensagens_log').insert({
        lead_id: item.lead.id,
        whatsapp: item.lead.whatsapp,
        direcao: 'enviada',
        conteudo: message,
        metadata: { drip_step_id: item.drip_step_id, campaign_id: item.campaign_id },
      });

      sent++;
      logger.info(`[DripService] Enviada para ${item.lead.whatsapp}: step ${item.step.step_order}`);
    } else {
      const attempts = item.attempts + 1;
      const update = {
        error_message: result.error,
        attempts,
      };

      if (attempts >= item.max_attempts) {
        update.status = 'failed';
      } else {
        // Reagenda para 5 minutos depois
        update.scheduled_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      }

      await supabase.from('drip_queue').update(update).eq('id', item.id);
      failed++;
      logger.warn(`[DripService] Falha (${attempts}/${item.max_attempts}): ${result.error}`);
    }

    // Delay 2 segundos entre mensagens (evitar bloqueio do WhatsApp)
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (sent > 0 || failed > 0) {
    logger.info(`[DripService] Resultado: ${sent} enviadas, ${failed} falharam`);
  }
}

/**
 * Cancela todas mensagens pendentes de um lead.
 */
async function cancelPendingMessages(leadId) {
  const { error } = await supabase
    .from('drip_queue')
    .update({ status: 'cancelled' })
    .eq('lead_id', leadId)
    .eq('status', 'pending');

  if (error) {
    logger.error(`[DripService] Erro ao cancelar mensagens do lead ${leadId}:`, error.message);
  }
}

/**
 * Enfileira manualmente um lead em uma campanha.
 */
async function enqueueCampaign(leadId, campaignId) {
  const { data: steps, error } = await supabase
    .from('drip_steps')
    .select('id, delay_minutes')
    .eq('campaign_id', campaignId)
    .eq('is_active', true)
    .order('step_order', { ascending: true });

  if (error || !steps || steps.length === 0) {
    return { success: false, error: 'Campanha sem steps ativos' };
  }

  let scheduled = new Date();
  const queueItems = steps.map((step) => {
    scheduled = new Date(scheduled.getTime() + step.delay_minutes * 60 * 1000);
    return {
      lead_id: leadId,
      drip_step_id: step.id,
      campaign_id: campaignId,
      status: 'pending',
      scheduled_at: scheduled.toISOString(),
    };
  });

  const { error: insertError } = await supabase.from('drip_queue').insert(queueItems);
  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true, enqueued: queueItems.length };
}

module.exports = { processQueue, cancelPendingMessages, enqueueCampaign, resolveTemplate };
