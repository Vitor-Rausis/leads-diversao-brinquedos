const supabase = require('../config/supabase');
const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');
const logger = require('../utils/logger');

/**
 * Webhook para receber mensagens do Z-API
 * Documentacao: https://developer.z-api.io/webhooks/on-message-received
 */
async function handleWhatsAppWebhook(req, res) {
  try {
    const payload = req.body;

    // Z-API envia diferentes tipos de eventos
    // Vamos tratar mensagens recebidas
    if (payload.isGroup) {
      // Ignora mensagens de grupo
      return res.status(200).json({ ok: true });
    }

    // Ignora mensagens enviadas por nos
    if (payload.fromMe) {
      return res.status(200).json({ ok: true });
    }

    // Extrai dados da mensagem Z-API
    const whatsapp = payload.phone; // Numero que enviou
    const content = payload.text?.message ||
                   payload.image?.caption ||
                   payload.video?.caption ||
                   payload.audio ? '[audio]' :
                   payload.document?.caption || '[media]';

    if (!whatsapp) {
      return res.status(200).json({ ok: true });
    }

    // Remove DDI se presente para buscar lead
    const whatsappClean = whatsapp.replace(/^55/, '');

    // Find matching lead
    const lead = await LeadModel.findByWhatsapp(whatsappClean);

    // Log the received message
    await MessageModel.createLog({
      lead_id: lead?.id || null,
      whatsapp: whatsappClean,
      direcao: 'recebida',
      conteudo: content,
      metadata: payload,
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

      logger.info(`Lead ${lead.id} respondeu via Z-API. Automacoes pausadas.`);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Erro no webhook Z-API:', err);
    return res.status(200).json({ ok: true });
  }
}

module.exports = { handleWhatsAppWebhook };
