import client from './client';

export const getReports = (params) => client.get('/reports', { params });
export const generateReport = (data) => client.post('/reports/generate', data);
export const downloadReportCSV = (id) =>
  client.get(`/reports/${id}/csv`, { responseType: 'blob' });
