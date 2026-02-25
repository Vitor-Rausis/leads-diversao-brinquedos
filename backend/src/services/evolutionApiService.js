const axios = require('axios');
const logger = require('../utils/logger');

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_API_INSTANCE || process.env.EVOLUTION_INSTANCE || 'diversao-brinquedos';

/**
 * Formata telefone para WhatsApp (formato Brasil).
 * (11)99999-9999 → 5511999999999
 */
function formatPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return '55' + digits;
  return digits;
}

/**
 * Verifica se a Evolution API esta conectada.
 */
async function isConnected() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) return false;
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY }, timeout: 5000 }
    );
    return response.data?.instance?.state === 'open';
  } catch {
    return false;
  }
}

/**
 * Envia mensagem de texto via Evolution API.
 */
async function sendText(to, text) {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { success: false, error: 'Evolution API not configured' };
  }
  const number = formatPhone(to);
  if (!number) return { success: false, error: 'Invalid phone number' };

  try {
    const response = await axios.post(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      { number, text },
      {
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
        timeout: 15000,
      }
    );
    logger.info(`[EvolutionAPI] Mensagem enviada para ${number}`);
    return {
      success: true,
      messageId: response.data?.key?.id,
      remoteJid: response.data?.key?.remoteJid,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    const errorStr = Array.isArray(msg) ? msg.join('; ') : msg;
    logger.error(`[EvolutionAPI] Erro ao enviar para ${number}: ${errorStr}`);
    return { success: false, error: errorStr };
  }
}

/**
 * Retorna estado detalhado da conexao.
 * Mapeia estados da Evolution API para os estados que o frontend espera.
 */
async function getConnectionState() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { state: 'disconnected', connected: false };
  }
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY }, timeout: 5000 }
    );
    const state = response.data?.instance?.state;
    // Evolution API states: open, close, connecting
    const connected = state === 'open';
    let mappedStatus = 'disconnected';
    if (state === 'open') mappedStatus = 'ready';
    else if (state === 'connecting') mappedStatus = 'connecting';
    else if (state === 'close') mappedStatus = 'disconnected';

    return { state: mappedStatus, connected };
  } catch (error) {
    logger.error('[EvolutionAPI] Erro ao buscar estado:', error.message);
    return { state: 'error', connected: false, error: error.message };
  }
}

/**
 * Solicita conexao e retorna QR code da instancia (base64).
 */
async function connectInstance() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { success: false, error: 'Evolution API not configured' };
  }
  try {
    const response = await axios.get(
      `${EVOLUTION_API_URL}/instance/connect/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY }, timeout: 15000 }
    );
    const data = response.data;
    // Evolution API retorna base64 do QR code
    const qrBase64 = data?.base64;
    const qrCode = data?.code;

    return {
      success: true,
      qrCode: qrBase64 || null,
      pairingCode: qrCode || null,
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    const errorStr = Array.isArray(msg) ? msg.join('; ') : msg;
    logger.error('[EvolutionAPI] Erro ao conectar instancia:', errorStr);
    return { success: false, error: errorStr };
  }
}

/**
 * Desconecta (logout) a instancia do WhatsApp.
 */
async function logoutInstance() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { success: false, error: 'Evolution API not configured' };
  }
  try {
    await axios.delete(
      `${EVOLUTION_API_URL}/instance/logout/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY }, timeout: 10000 }
    );
    logger.info('[EvolutionAPI] Instancia desconectada (logout)');
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    const errorStr = Array.isArray(msg) ? msg.join('; ') : msg;
    logger.error('[EvolutionAPI] Erro ao fazer logout:', errorStr);
    return { success: false, error: errorStr };
  }
}

/**
 * Reinicia a instancia da Evolution API.
 */
async function restartInstance() {
  if (!EVOLUTION_API_KEY || !EVOLUTION_API_URL) {
    return { success: false, error: 'Evolution API not configured' };
  }
  try {
    await axios.put(
      `${EVOLUTION_API_URL}/instance/restart/${EVOLUTION_INSTANCE}`,
      {},
      { headers: { apikey: EVOLUTION_API_KEY }, timeout: 10000 }
    );
    logger.info('[EvolutionAPI] Instancia reiniciada');
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    const errorStr = Array.isArray(msg) ? msg.join('; ') : msg;
    logger.error('[EvolutionAPI] Erro ao reiniciar:', errorStr);
    return { success: false, error: errorStr };
  }
}

module.exports = {
  sendText,
  isConnected,
  formatPhone,
  getConnectionState,
  connectInstance,
  logoutInstance,
  restartInstance,
};
