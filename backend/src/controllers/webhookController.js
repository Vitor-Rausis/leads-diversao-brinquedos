const supabase = require('../config/supabase');
const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');
const logger = require('../utils/logger');

/**
 * Recebe e processa eventos de webhook da Evolution API.
 * Configurar na Evolution API: Webhook URL -> POST /api/v1/webhook/whatsapp
 * Events habilitados: messages.upsert
 */
async function handleWhatsAppWebhook(req, res) {
  // Responde imediatamente para a Evolution API não retentar
  res.status(200).json({ ok: true });

  try {
    const { event, data } = req.body;

    // Só processa eventos de novas mensagens
    if (event !== 'messages.upsert') return;
    if (!data) return;

    const key = data.key || {};

    // Ignora mensagens enviadas por nós
    if (key.fromMe === true) return;

    const remoteJid = key.remoteJid || '';

    // Ignora grupos
    if (remoteJid.endsWith('@g.us')) return;

    // Extrai número limpo
    const whatsappRaw = remoteJid
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@c\.us$/, '');

    if (!whatsappRaw) return;

    // Extrai conteúdo da mensagem
    const msg = data.message || {};
    const content =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      (msg.imageMessage ? '[imagem]' : null) ||
      (msg.videoMessage ? '[vídeo]' : null) ||
      (msg.audioMessage ? '[áudio]' : null) ||
      (msg.documentMessage ? '[documento]' : null) ||
      '[mensagem]';

    // Normaliza número — tenta com DDI (5541...) e sem DDI (41...)
    const digits = whatsappRaw.replace(/\D/g, '');
    const whatsappFull = digits.startsWith('55') ? digits : '55' + digits;
    const whatsappShort = whatsappFull.replace(/^55/, '');

    logger.info(`[Webhook] Mensagem de ${whatsappFull}: "${content.substring(0, 60)}"`);

    // Busca lead tentando com DDI e sem DDI
    let lead = await LeadModel.findByWhatsapp(whatsappFull);
    if (!lead) lead = await LeadModel.findByWhatsapp(whatsappShort);

    // Registra no log de mensagens
    await MessageModel.createLog({
      lead_id: lead?.id || null,
      whatsapp: whatsappFull,
      direcao: 'recebida',
      conteudo: content,
      metadata: {
        remoteJid,
        messageId: key.id,
        pushName: data.pushName || null,
        timestamp: data.messageTimestamp,
      },
    });

    // Se lead existe e está em automação ativa, marca como Respondeu e pausa envios
    if (lead && ['Novo', 'Em Contato'].includes(lead.status)) {
      await supabase
        .from('leads')
        .update({ status: 'Respondeu' })
        .eq('id', lead.id);

      await MessageModel.cancelPendingForLead(lead.id);

      logger.info(`[Webhook] Lead "${lead.nome}" respondeu. Status -> Respondeu, automações pausadas.`);
    }
  } catch (err) {
    logger.error('[Webhook] Erro ao processar evento:', err);
  }
}

module.exports = { handleWhatsAppWebhook };
