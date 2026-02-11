const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const logger = require('../utils/logger');
const path = require('path');

/**
 * WhatsApp Service usando Baileys (gratuito, sem Chromium)
 * Conecta via WebSocket direto ao WhatsApp - funciona em qualquer servidor
 */
class WhatsAppService {
  constructor() {
    this.sock = null;
    this.qrCode = null;
    this.status = 'disconnected'; // disconnected | initializing | qr | connecting | ready | error
    this.errorMessage = null;
    this.onMessageCallback = null;
    this.authPath = path.join(process.cwd(), 'whatsapp-session');
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  async initialize() {
    if (this.sock) return;

    this.status = 'initializing';
    this.errorMessage = null;
    logger.info('Inicializando WhatsApp via Baileys...');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      const { version } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: require('pino')({ level: 'silent' }),
      });

      // Salva credenciais quando atualizadas
      this.sock.ev.on('creds.update', saveCreds);

      // Evento de conexao
      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'qr';
          this.errorMessage = null;
          try {
            this.qrCode = await QRCode.toDataURL(qr);
            logger.info('QR Code gerado. Escaneie com o WhatsApp.');
          } catch (err) {
            logger.error('Erro ao gerar QR code:', err.message);
          }
        }

        if (connection === 'connecting') {
          this.status = 'connecting';
          this.qrCode = null;
          logger.info('Conectando ao WhatsApp...');
        }

        if (connection === 'open') {
          this.status = 'ready';
          this.qrCode = null;
          this.errorMessage = null;
          logger.info('WhatsApp conectado e pronto!');
        }

        if (connection === 'close') {
          this.qrCode = null;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (statusCode === DisconnectReason.loggedOut) {
            this.status = 'disconnected';
            this.sock = null;
            logger.info('WhatsApp deslogado. Necessario escanear QR novamente.');
          } else if (shouldReconnect) {
            logger.info(`WhatsApp desconectado (code ${statusCode}). Reconectando em 5s...`);
            this.status = 'disconnected';
            this.sock = null;
            setTimeout(() => this.initialize(), 5000);
          } else {
            this.status = 'error';
            this.errorMessage = `Conexao fechada (code ${statusCode})`;
            this.sock = null;
            logger.error('WhatsApp conexao fechada:', statusCode);
          }
        }
      });

      // Listener para mensagens recebidas
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
          if (msg.key.fromMe) continue;

          if (this.onMessageCallback) {
            try {
              // Adapta msg para formato compativel com nosso handler
              const adaptedMsg = {
                from: msg.key.remoteJid,
                fromMe: msg.key.fromMe,
                body: msg.message?.conversation ||
                      msg.message?.extendedTextMessage?.text ||
                      '',
                hasMedia: !!(msg.message?.imageMessage ||
                           msg.message?.videoMessage ||
                           msg.message?.audioMessage ||
                           msg.message?.documentMessage),
                type: Object.keys(msg.message || {})[0] || 'unknown',
                timestamp: msg.messageTimestamp,
              };
              await this.onMessageCallback(adaptedMsg);
            } catch (err) {
              logger.error('Erro ao processar mensagem recebida:', err.message);
            }
          }
        }
      });

    } catch (err) {
      logger.error('Erro ao inicializar WhatsApp:', err.message);
      this.status = 'error';
      this.errorMessage = err.message;
      this.sock = null;
    }
  }

  /**
   * Registra callback para mensagens recebidas
   */
  onMessage(callback) {
    this.onMessageCallback = callback;
  }

  /**
   * Envia mensagem de texto
   */
  async sendTextMessage(phoneNumber, text) {
    if (this.status !== 'ready' || !this.sock) {
      return { success: false, error: 'WhatsApp nao esta conectado' };
    }

    const jid = this.formatPhoneForBaileys(phoneNumber);

    try {
      const result = await this.sock.sendMessage(jid, { text });
      logger.info(`WhatsApp enviado para ${jid}`);
      return { success: true, data: { id: result.key.id } };
    } catch (error) {
      logger.error(`Erro ao enviar WhatsApp para ${jid}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formata numero para Baileys (DDI + numero + @s.whatsapp.net)
   */
  formatPhoneForBaileys(phone) {
    let cleaned = phone.replace(/\D/g, '');

    // Se nao comeca com 55, adiciona DDI Brasil
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned + '@s.whatsapp.net';
  }

  /**
   * Verifica status da conexao
   */
  async checkStatus() {
    return {
      connected: this.status === 'ready',
      status: this.status,
      hasQR: !!this.qrCode,
      error: this.errorMessage,
    };
  }

  /**
   * Retorna QR Code como base64 data URL
   */
  async getQRCode() {
    if (this.qrCode) {
      return { success: true, data: { qrCode: this.qrCode } };
    }
    return { success: false, error: 'QR code nao disponivel. Verifique o status.' };
  }

  /**
   * Desconecta o WhatsApp
   */
  async disconnect() {
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        logger.error('Erro ao desconectar WhatsApp:', err.message);
        try {
          this.sock.end();
        } catch (e) {
          // ignore
        }
      }
      this.sock = null;
      this.status = 'disconnected';
      this.qrCode = null;
      this.errorMessage = null;
      logger.info('WhatsApp desconectado manualmente');
    }
  }
}

// Singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
