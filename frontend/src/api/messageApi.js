import client from './client';

export const getMessages = (params) => client.get('/messages', { params });
export const getScheduledMessages = (params) => client.get('/messages/scheduled', { params });
export const createScheduledMessage = (data) => client.post('/messages/scheduled', data);
export const updateScheduledMessage = (id, data) => client.put(`/messages/scheduled/${id}`, data);
export const cancelScheduledMessage = (id) => client.delete(`/messages/scheduled/${id}`);
