const axios = require('axios');
const supabase = require('../config/supabase');
const LeadModel = require('../models/leadModel');
const MessageModel = require('../models/messageModel');
const logger = require('../utils/logger');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_API_INSTANCE || process.env.EVOLUTION_INSTANCE || 'diversao-brinquedos';

// Inicia 2 minutos atrás para capturar mensagens recentes ao reiniciar o servidor
let lastProcessedTimestamp = Math.floor(Date.now() / 1000) - 120;

/**
 * Busca mensagens recebidas na Evolution API e processa as novas.
 * Roda a cada minuto via cron — substitui o webhook quando há firewall.
 */
async function pollIncomingMessages() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) return;

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/chat/findMessages/${EVOLUTION_INSTANCE}`,
      {
        where: { key: { fromMe: false } },
        limit: 20,
      },
      {
        headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const records = response.data?.messages?.records || [];
    if (!records.length) return;

    // Filtra apenas mensagens mais novas que o último timestamp processado
    const novas = records.filter(
      (m) => m.messageTimestamp > lastProcessedTimestamp
    );

    if (!novas.length) return;

    logger.info(`[Polling] ${novas.length} nova(s) mensagem(ns) recebida(s)`);

    for (const record of novas) {
      const remoteJid = record.key?.remoteJid || '';

      // Ignora grupos
      if (remoteJid.endsWith('@g.us')) continue;

      // Extrai número
      const digits = remoteJid
        .replace(/@s\.whatsapp\.net$/, '')
        .replace(/@c\.us$/, '')
        .replace(/\D/g, '');

      const whatsappFull = digits.startsWith('55') ? digits : '55' + digits;
      const whatsappShort = whatsappFull.replace(/^55/, '');

      // Variantes com/sem o 9 extra (celulares brasileiros: 55 + DDD 2 dígitos + 9 + 8 dígitos)
      // Ex: 554198712446 -> 5541998712446 (adiciona 9 após DDD)
      // Ex: 5541998712446 -> 554198712446 (remove 9 após DDD)
      const whatsappWith9 = whatsappFull.replace(/^(55\d{2})(\d{8})$/, '$19$2');
      const whatsappWithout9 = whatsappFull.replace(/^(55\d{2})9(\d{8})$/, '$1$2');

      // Extrai conteúdo
      const msg = record.message || {};
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

      logger.info(`[Polling] Mensagem de ${whatsappFull}: "${content.substring(0, 60)}"`);

      // Busca lead tentando todas as variantes de número
      let lead = await LeadModel.findByWhatsapp(whatsappFull);
      if (!lead) lead = await LeadModel.findByWhatsapp(whatsappShort);
      if (!lead && whatsappWith9 !== whatsappFull) lead = await LeadModel.findByWhatsapp(whatsappWith9);
      if (!lead && whatsappWithout9 !== whatsappFull) lead = await LeadModel.findByWhatsapp(whatsappWithout9);

      // Registra no log (evita duplicatas pelo messageId)
      const messageId = record.key?.id;
      if (messageId) {
        const { data: existing } = await supabase
          .from('mensagens_log')
          .select('id')
          .eq('metadata->>messageId', messageId)
          .maybeSingle();

        if (existing) continue; // já processada
      }

      await MessageModel.createLog({
        lead_id: lead?.id || null,
        whatsapp: whatsappFull,
        direcao: 'recebida',
        conteudo: content,
        metadata: {
          remoteJid,
          messageId,
          pushName: record.pushName || null,
          timestamp: record.messageTimestamp,
        },
      });

      // Atualiza lead se em automação ativa
      if (lead && ['Novo', 'Em Contato'].includes(lead.status)) {
        await supabase
          .from('leads')
          .update({ status: 'Respondeu' })
          .eq('id', lead.id);

        await MessageModel.cancelPendingForLead(lead.id);

        logger.info(`[Polling] Lead "${lead.nome}" respondeu. Status -> Respondeu, automações pausadas.`);
      }
    }

    // Atualiza timestamp para o mais recente processado
    const maxTs = Math.max(...novas.map((m) => m.messageTimestamp));
    if (maxTs > lastProcessedTimestamp) lastProcessedTimestamp = maxTs;

  } catch (err) {
    logger.error('[Polling] Erro ao buscar mensagens:', err.message);
  }
}

module.exports = { pollIncomingMessages };
