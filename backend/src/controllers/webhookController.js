const supabase = require('../config/supabase');
const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');
const logger = require('../utils/logger');

async function handleWhatsAppWebhook(req, res) {
  try {
    const payload = req.body;
    const event = payload.event;

    if (event === 'messages.upsert') {
      const message = payload.data;
      const remoteJid = message.key?.remoteJid;

      if (!remoteJid || remoteJid.includes('@g.us')) {
        return res.status(200).json({ ok: true });
      }

      // Ignore outgoing messages from us
      if (message.key?.fromMe) {
        return res.status(200).json({ ok: true });
      }

      const whatsapp = remoteJid.split('@')[0];
      const content =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '[media]';

      // Find matching lead
      const lead = await LeadModel.findByWhatsapp(whatsapp);

      // Log the received message
      await MessageModel.createLog({
        lead_id: lead?.id || null,
        whatsapp,
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

        logger.info(`Lead ${lead.id} respondeu. Automacoes pausadas.`);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Erro no webhook WhatsApp:', err);
    return res.status(200).json({ ok: true });
  }
}

module.exports = { handleWhatsAppWebhook };
