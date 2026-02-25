import client from './client';

export const getDripCampaigns = () => client.get('/drip-campaigns');
export const getDripCampaign = (id) => client.get(`/drip-campaigns/${id}`);
export const createDripCampaign = (data) => client.post('/drip-campaigns', data);
export const updateDripCampaign = (id, data) => client.put(`/drip-campaigns/${id}`, data);
export const deleteDripCampaign = (id) => client.delete(`/drip-campaigns/${id}`);
export const getDripStats = () => client.get('/drip-campaigns/stats');

export const enqueueDrip = (leadId, campaignId) =>
  client.post('/drip-campaigns/enqueue', { lead_id: leadId, campaign_id: campaignId });
export const getDripQueueByLead = (leadId) =>
  client.get(`/drip-campaigns/lead/${leadId}/queue`);
export const cancelDripByLead = (leadId) =>
  client.delete(`/drip-campaigns/lead/${leadId}/cancel`);
