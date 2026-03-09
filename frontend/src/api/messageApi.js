import client from './client';

export const getMessages = (params) => client.get('/messages', { params });
export const getScheduledMessages = (params) => client.get('/messages/scheduled', { params });
export const createScheduledMessage = (data) => client.post('/messages/scheduled', data);
export const updateScheduledMessage = (id, data) => client.put(`/messages/scheduled/${id}`, data);
export const cancelScheduledMessage = (id) => client.delete(`/messages/scheduled/${id}`);
export const bulkScheduleMessages = (data) => client.post('/messages/scheduled/bulk', data);
export const getBulkSummary = () => client.get('/messages/scheduled/bulk-summary');
export const cancelBulkBatch = (ids) => client.post('/messages/scheduled/bulk-cancel', { ids });
