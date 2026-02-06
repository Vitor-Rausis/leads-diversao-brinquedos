import client from './client';

export const getLeads = (params) => client.get('/leads', { params });
export const getLead = (id) => client.get(`/leads/${id}`);
export const createLead = (data) => client.post('/leads', data);
export const updateLead = (id, data) => client.put(`/leads/${id}`, data);
export const deleteLead = (id) => client.delete(`/leads/${id}`);
export const importLeads = (formData) =>
  client.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
