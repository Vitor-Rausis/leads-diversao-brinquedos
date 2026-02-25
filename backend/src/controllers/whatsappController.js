const evolutionApi = require('../services/evolutionApiService');
const logger = require('../utils/logger');

// Cache do QR code para evitar chamadas excessivas
let qrCache = { qrCode: null, timestamp: 0 };
const QR_CACHE_TTL = 20000; // 20 segundos

async function getStatus(req, res) {
  try {
    const connState = await evolutionApi.getConnectionState();

    const response = {
      connected: connState.connected,
      status: connState.state, // 'ready', 'connecting', 'disconnected', 'error'
      service: 'Evolution API',
    };

    // Se nao esta conectado e nao esta com erro, tenta buscar QR code do cache
    if (!connState.connected && connState.state !== 'error') {
      // Se temos QR em cache e ainda e valido
      if (qrCache.qrCode && (Date.now() - qrCache.timestamp) < QR_CACHE_TTL) {
        response.status = 'qr';
        response.hasQR = true;
        response.qrCode = qrCache.qrCode;
      }
    }

    if (connState.error) {
      response.error = connState.error;
    }

    res.json(response);
  } catch (error) {
    logger.error('[WhatsAppCtrl] Erro ao buscar status:', error.message);
    res.json({
      connected: false,
      status: 'error',
      error: error.message,
    });
  }
}

async function getQRCode(req, res) {
  try {
    const result = await evolutionApi.connectInstance();

    if (result.success && result.qrCode) {
      // Salva no cache
      qrCache = { qrCode: result.qrCode, timestamp: Date.now() };

      res.json({
        hasQR: true,
        qrCode: result.qrCode,
        pairingCode: result.pairingCode || null,
      });
    } else {
      res.json({
        hasQR: false,
        error: result.error || 'QR code nao disponivel',
      });
    }
  } catch (error) {
    logger.error('[WhatsAppCtrl] Erro ao buscar QR:', error.message);
    res.status(500).json({ hasQR: false, error: error.message });
  }
}

async function disconnect(req, res) {
  try {
    const result = await evolutionApi.logoutInstance();
    // Limpa cache do QR
    qrCache = { qrCode: null, timestamp: 0 };

    if (result.success) {
      res.json({ ok: true, message: 'WhatsApp desconectado com sucesso' });
    } else {
      res.json({ ok: false, message: result.error || 'Erro ao desconectar' });
    }
  } catch (error) {
    logger.error('[WhatsAppCtrl] Erro ao desconectar:', error.message);
    res.status(500).json({ ok: false, message: error.message });
  }
}

async function reconnect(req, res) {
  try {
    // Reinicia a instancia
    await evolutionApi.restartInstance();

    // Aguarda um pouco e solicita nova conexao (gera QR)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const result = await evolutionApi.connectInstance();

    if (result.success && result.qrCode) {
      // Salva QR no cache
      qrCache = { qrCode: result.qrCode, timestamp: Date.now() };

      res.json({
        ok: true,
        connected: false,
        status: 'qr',
        hasQR: true,
        qrCode: result.qrCode,
        message: 'QR Code gerado. Escaneie com seu WhatsApp.',
      });
    } else {
      // Verifica se ja esta conectado
      const connState = await evolutionApi.getConnectionState();
      res.json({
        ok: true,
        connected: connState.connected,
        status: connState.state,
        message: connState.connected
          ? 'WhatsApp ja esta conectado'
          : 'Reconectando... Aguarde o QR code no proximo poll.',
      });
    }
  } catch (error) {
    logger.error('[WhatsAppCtrl] Erro ao reconectar:', error.message);
    res.status(500).json({
      ok: false,
      connected: false,
      status: 'error',
      error: error.message,
    });
  }
}

module.exports = { getStatus, getQRCode, disconnect, reconnect };
