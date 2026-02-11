const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const logger = require('../utils/logger');

/**
 * WhatsApp Service usando whatsapp-web.js (gratuito)
 * Conecta diretamente ao WhatsApp Web via Puppeteer
 */
class WhatsAppService {
  constructor() {
    this.client = null;
    this.qrCode = null;
    this.status = 'disconnected'; // disconnected | qr | connecting | ready
    this.onMessageCallback = null;
  }

  /**
   * Inicializa o cliente WhatsApp
   */
  initialize() {
    if (this.client) return;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
        ],
      },
    });

    this.client.on('qr', async (qr) => {
      this.status = 'qr';
      try {
        this.qrCode = await QRCode.toDataURL(qr);
      } catch (err) {
        logger.error('Erro ao gerar QR code:', err);
      }
      logger.info('QR Code gerado. Escaneie com o WhatsApp.');
    });

    this.client.on('ready', () => {
      this.status = 'ready';
      this.qrCode = null;
      logger.info('WhatsApp conectado e pronto!');
    });

    this.client.on('authenticated', () => {
      this.status = 'connecting';
      this.qrCode = null;
      logger.info('WhatsApp autenticado, carregando sessao...');
    });

    this.client.on('auth_failure', (msg) => {
      this.status = 'disconnected';
      this.qrCode = null;
      logger.error('Falha na autenticacao WhatsApp:', msg);
    });

    this.client.on('disconnected', (reason) => {
      this.status = 'disconnected';
      this.qrCode = null;
      logger.warn('WhatsApp desconectado:', reason);
      // Tenta reconectar apos 5 segundos
      setTimeout(() => {
        logger.info('Tentando reconectar WhatsApp...');
        this.client.initialize().catch((err) => {
          logger.error('Erro ao reconectar:', err);
        });
      }, 5000);
    });

    // Listener para mensagens recebidas
    this.client.on('message', async (msg) => {
      if (this.onMessageCallback) {
        try {
          await this.onMessageCallback(msg);
        } catch (err) {
          logger.error('Erro ao processar mensagem recebida:', err);
        }
      }
    });

    this.client.initialize().catch((err) => {
      logger.error('Erro ao inicializar WhatsApp:', err);
    });
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
    if (this.status !== 'ready') {
      return { success: false, error: 'WhatsApp nao esta conectado' };
    }

    const chatId = this.formatPhoneForWWJS(phoneNumber);

    try {
      const msg = await this.client.sendMessage(chatId, text);
      logger.info(`WhatsApp enviado para ${chatId}`);
      return { success: true, data: { id: msg.id._serialized } };
    } catch (error) {
      logger.error(`Erro ao enviar WhatsApp para ${chatId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Formata numero para whatsapp-web.js (DDI + numero + @c.us)
   */
  formatPhoneForWWJS(phone) {
    let cleaned = phone.replace(/\D/g, '');

    // Se nao comeca com 55, adiciona DDI Brasil
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned + '@c.us';
  }

  /**
   * Verifica status da conexao
   */
  async checkStatus() {
    return {
      connected: this.status === 'ready',
      status: this.status,
      hasQR: !!this.qrCode,
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
    if (this.client) {
      try {
        await this.client.destroy();
        this.status = 'disconnected';
        this.qrCode = null;
        logger.info('WhatsApp desconectado manualmente');
      } catch (err) {
        logger.error('Erro ao desconectar WhatsApp:', err);
      }
    }
  }
}

// Singleton
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
