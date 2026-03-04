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

    // Se mensagem enviada por nós, atualiza atualizado_em do lead (limpa alerta "Esquecido")
    if (key.fromMe === true) {
      const digitsMe = (key.remoteJid || '')
        .replace(/@s\.whatsapp\.net$/, '')
        .replace(/@c\.us$/, '')
        .replace(/\D/g, '');
      if (digitsMe) {
        const withDdiMe = digitsMe.startsWith('55') ? digitsMe : '55' + digitsMe;
        const variantsMe = new Set([
          withDdiMe,
          withDdiMe.replace(/^55/, ''),
          withDdiMe.replace(/^(55\d{2})(\d{8})$/, '$19$2'),
          withDdiMe.replace(/^(55\d{2})9(\d{8})$/, '$1$2'),
        ]);
        for (const v of variantsMe) {
          const found = await LeadModel.findByWhatsapp(v);
          if (found) {
            await supabase.from('leads').update({ atualizado_em: new Date().toISOString() }).eq('id', found.id);
            break;
          }
        }
      }
      return;
    }

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

    // Gera todas as variantes de número para busca
    const digits = whatsappRaw.replace(/\D/g, '');
    const variants = new Set();

    // Com DDI 55
    const withDdi = digits.startsWith('55') ? digits : '55' + digits;
    variants.add(withDdi);

    // Sem DDI 55
    const withoutDdi = withDdi.replace(/^55/, '');
    variants.add(withoutDdi);

    // Com 9 extra (celular BR: 55 + DDD 2 dígitos + 9 + 8 dígitos)
    const with9 = withDdi.replace(/^(55\d{2})(\d{8})$/, '$19$2');
    if (with9 !== withDdi) variants.add(with9);

    // Sem 9 extra
    const without9 = withDdi.replace(/^(55\d{2})9(\d{8})$/, '$1$2');
    if (without9 !== withDdi) variants.add(without9);

    // Sem DDI + com/sem 9
    variants.add(with9.replace(/^55/, ''));
    variants.add(without9.replace(/^55/, ''));

    logger.info(`[Webhook] Mensagem de ${withDdi}: "${content.substring(0, 60)}"`);
    logger.info(`[Webhook] Variantes buscadas: ${[...variants].join(', ')}`);

    // Busca lead tentando todas as variantes
    let lead = null;
    for (const variant of variants) {
      lead = await LeadModel.findByWhatsapp(variant);
      if (lead) {
        logger.info(`[Webhook] Lead encontrado pela variante: "${variant}" -> ${lead.nome}`);
        break;
      }
    }

    // Registra no log de mensagens (mesmo sem lead associado)
    await MessageModel.createLog({
      lead_id: lead?.id || null,
      whatsapp: withDdi,
      direcao: 'recebida',
      conteudo: content,
      metadata: {
        remoteJid,
        messageId: key.id,
        pushName: data.pushName || null,
        timestamp: data.messageTimestamp,
        varianteEncontrada: lead ? null : 'nenhuma',
      },
    });

    if (!lead) {
      logger.warn(`[Webhook] Nenhum lead encontrado para ${withDdi}. Variantes: ${[...variants].join(', ')}`);
      return;
    }

    // Só marca como Respondeu se o sistema já enviou ao menos uma mensagem ao lead
    const { count: enviadas } = await supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('lead_id', lead.id)
      .eq('direcao', 'enviada');

    if (!enviadas || enviadas === 0) {
      logger.info(`[Webhook] Lead "${lead.nome}" respondeu mas sistema ainda não enviou mensagem. Ignorado.`);
      return;
    }

    // Atualiza status para Respondeu se não estiver em status final
    const FINAL_STATUSES = ['Convertido', 'Perdido'];
    if (!FINAL_STATUSES.includes(lead.status)) {
      await supabase
        .from('leads')
        .update({ status: 'Respondeu', atualizado_em: new Date().toISOString() })
        .eq('id', lead.id);

      await MessageModel.cancelPendingForLead(lead.id);

      logger.info(`[Webhook] Lead "${lead.nome}" (${lead.status}) -> Respondeu. Automações pausadas.`);
    } else {
      logger.info(`[Webhook] Lead "${lead.nome}" já em status final (${lead.status}). Sem alteração.`);
    }
  } catch (err) {
    logger.error('[Webhook] Erro ao processar evento:', err);
  }
}

module.exports = { handleWhatsAppWebhook };
