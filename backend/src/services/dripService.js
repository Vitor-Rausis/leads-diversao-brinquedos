const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Resolve variaveis no template: {{nome}}, {{primeiro_nome}}, {{whatsapp}}, {{origem}}
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

module.exports = { cancelPendingMessages, enqueueCampaign, resolveTemplate };
