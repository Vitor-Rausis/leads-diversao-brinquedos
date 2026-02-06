const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');
const { formatPhone } = require('../utils/formatPhone');

class WhatsAppService {
  constructor() {
    this.baseUrl = env.EVOLUTION_API_URL;
    this.instance = env.EVOLUTION_API_INSTANCE;
    this.apiKey = env.EVOLUTION_API_KEY;
  }

  async sendTextMessage(phoneNumber, text) {
    const url = `${this.baseUrl}/message/sendText/${this.instance}`;
    const number = formatPhone(phoneNumber);

    const payload = {
      number,
      options: {
        delay: 1200,
        presence: 'composing',
      },
      textMessage: {
        text,
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          apikey: this.apiKey,
        },
        timeout: 30000,
      });

      logger.info(`WhatsApp enviado para ${number}`);
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
}

module.exports = new WhatsAppService();
