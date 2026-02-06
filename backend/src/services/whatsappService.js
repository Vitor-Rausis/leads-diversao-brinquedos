const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { formatPhone } = require('../utils/formatPhone');

/**
 * WhatsApp Service usando Z-API
 * Documentacao: https://developer.z-api.io/
 */
class WhatsAppService {
  constructor() {
    this.instanceId = env.ZAPI_INSTANCE_ID;
    this.token = env.ZAPI_TOKEN;
    this.securityToken = env.ZAPI_SECURITY_TOKEN;
    this.baseUrl = `https://api.z-api.io/instances/${this.instanceId}/token/${this.token}`;
  }

  /**
   * Envia mensagem de texto via Z-API
   */
  async sendTextMessage(phoneNumber, text) {
    const url = `${this.baseUrl}/send-text`;
    const number = this.formatPhoneForZAPI(phoneNumber);

    const payload = {
      phone: number,
      message: text,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.securityToken,
        },
        timeout: 30000,
      });

      logger.info(`WhatsApp enviado para ${number} via Z-API`);
      return { success: true, data: response.data };
    } catch (error) {
      logger.error(`Erro ao enviar WhatsApp para ${number}:`, {
        error: error.response?.data || error.message,
      });
      return {
        success: false,
        error: error.response?.data || error.message,
      };
    }
  }

  /**
   * Formata numero para Z-API (apenas numeros, com DDI 55)
   */
  formatPhoneForZAPI(phone) {
    // Remove tudo que nao e numero
    let cleaned = phone.replace(/\D/g, '');

    // Se nao comeca com 55, adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }

  /**
   * Verifica status da conexao
   */
  async checkStatus() {
    const url = `${this.baseUrl}/status`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Client-Token': this.securityToken,
        },
        timeout: 10000,
      });

      return { connected: response.data?.connected || false, data: response.data };
    } catch (error) {
      logger.error('Erro ao verificar status Z-API:', error.message);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Obtem QR Code para conectar
   */
  async getQRCode() {
    const url = `${this.baseUrl}/qr-code/image`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Client-Token': this.securityToken,
        },
        timeout: 10000,
      });

      return { success: true, data: response.data };
    } catch (error) {
      logger.error('Erro ao obter QR Code Z-API:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WhatsAppService();
