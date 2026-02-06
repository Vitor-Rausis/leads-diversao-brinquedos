import client from './client';

export const configApi = {
  // Configuracoes de agendamento
  getSchedule: () => client.get('/config/schedule'),
  updateSchedule: (configs) => client.put('/config/schedule', { configs }),

  // Templates de mensagem
  getTemplates: () => client.get('/config/templates'),
  updateTemplate: (tipo, conteudo) => client.put(`/config/templates/${tipo}`, { conteudo }),
};
