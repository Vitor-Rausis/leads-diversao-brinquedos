import client from './client';

export const getMessages = (params) => client.get('/messages', { params });
export const getScheduledMessages = (params) => client.get('/messages/scheduled', { params });
export const createScheduledMessage = (data) => client.post('/messages/scheduled', data);
