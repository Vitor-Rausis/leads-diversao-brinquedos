const whatsappService = require('../services/whatsappService');

async function getStatus(req, res) {
  const status = await whatsappService.checkStatus();
  // Inclui QR code diretamente no status para evitar race condition
  if (status.hasQR && whatsappService.qrCode) {
    status.qrCode = whatsappService.qrCode;
  }
  res.json(status);
}

async function getQRCode(req, res) {
  const result = await whatsappService.getQRCode();
  if (result.success) {
    res.json(result.data);
  } else {
    res.status(404).json({ error: result.error });
  }
}

async function disconnect(req, res) {
  await whatsappService.disconnect();
  res.json({ ok: true, message: 'WhatsApp desconectado' });
}

async function reconnect(req, res) {
  // Fecha conexao sem fazer logout (preserva sessao)
  if (whatsappService.sock) {
    try {
      whatsappService.sock.end();
    } catch (e) {
      // ignore
    }
    whatsappService.sock = null;
  }
  whatsappService.status = 'disconnected';
  whatsappService.qrCode = null;
  whatsappService.errorMessage = null;

  // Reinicializa
  await whatsappService.initialize();
  res.json({ ok: true, message: 'Reconectando WhatsApp...' });
}

module.exports = { getStatus, getQRCode, disconnect, reconnect };
