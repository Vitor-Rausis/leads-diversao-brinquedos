import client from './client';

export const getApiKeys = () => client.get('/settings/api-keys');
export const createApiKey = (data) => client.post('/settings/api-keys', data);
export const deactivateApiKey = (id) => client.put(`/settings/api-keys/${id}/deactivate`);
