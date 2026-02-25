const supabase = require('../config/supabase');
const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');
const logger = require('../utils/logger');

/**
 * Processa mensagens recebidas do WhatsApp via Evolution API webhook
 * Chamado pelo endpoint de webhook configurado na Evolution API
 */
async function handleIncomingMessage(msg) {
  try {
    // Ignora mensagens de grupo
    if (msg.from.endsWith('@g.us')) return;

    // Ignora mensagens enviadas por nos
    if (msg.fromMe) return;

    // Extrai numero do chatId (formato: 5511999999999@s.whatsapp.net ou @c.us)
    const whatsapp = msg.from.replace('@s.whatsapp.net', '').replace('@c.us', '');

    // Extrai conteudo
    const content = msg.body || (msg.hasMedia ? '[media]' : '[vazio]');

    if (!whatsapp) return;

    // Remove DDI 55 para buscar lead (banco armazena sem DDI)
    const whatsappClean = whatsapp.replace(/^55/, '');

    // Find matching lead
    const lead = await LeadModel.findByWhatsapp(whatsappClean);

    // Log the received message
    await MessageModel.createLog({
      lead_id: lead?.id || null,
      whatsapp: whatsappClean,
      direcao: 'recebida',
      conteudo: content,
      metadata: {
        from: msg.from,
        type: msg.type,
        timestamp: msg.timestamp,
        hasMedia: msg.hasMedia,
      },
    });

    // If lead exists and is in active automation, pause automations
    if (lead && ['Novo', 'Em Contato'].includes(lead.status)) {
      // Update status to Respondeu
      await supabase
        .from('leads')
        .update({ status: 'Respondeu' })
        .eq('id', lead.id);

      // Cancel all pending scheduled messages
      await MessageModel.cancelPendingForLead(lead.id);

      logger.info(`Lead ${lead.id} respondeu via WhatsApp. Automações pausadas.`);
    }
  } catch (err) {
    logger.error('Erro ao processar mensagem recebida:', err);
  }
}

/**
 * Endpoint de webhook (mantido para compatibilidade/testes)
 */
async function handleWhatsAppWebhook(req, res) {
  return res.status(200).json({ ok: true, message: 'Webhook ativo (Evolution API)' });
}

module.exports = { handleWhatsAppWebhook, handleIncomingMessage };
