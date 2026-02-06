import client from './client';

export const getStats = () => client.get('/dashboard/stats');
export const getFunnel = () => client.get('/dashboard/funnel');
export const getProgress = (period) => client.get('/dashboard/progress', { params: { period } });
export const getOrigins = () => client.get('/dashboard/origins');
