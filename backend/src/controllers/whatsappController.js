const whatsappService = require('../services/whatsappService');

async function getStatus(req, res) {
  const status = await whatsappService.checkStatus();
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
  await whatsappService.disconnect();
  // Aguarda um pouco antes de reinicializar
  setTimeout(() => {
    whatsappService.client = null;
    whatsappService.initialize();
  }, 2000);
  res.json({ ok: true, message: 'Reconectando WhatsApp...' });
}

module.exports = { getStatus, getQRCode, disconnect, reconnect };
