import client from './client';

export const getWhatsAppStatus = () => client.get('/whatsapp/status');
export const getWhatsAppQR = () => client.get('/whatsapp/qr-code');
export const disconnectWhatsApp = () => client.post('/whatsapp/disconnect');
export const reconnectWhatsApp = () => client.post('/whatsapp/reconnect');
