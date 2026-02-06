const supabase = require('../config/supabase');

class ReportService {
  static async generateReport(periodoInicio, periodoFim) {
    const startDate = `${periodoInicio}T00:00:00.000Z`;
    const endDate = `${periodoFim}T23:59:59.999Z`;

    // Total de leads no periodo
    const { data: leadsNoPeriodo, error: leadsError } = await supabase
      .from('leads')
      .select('id, status, origem')
      .gte('data_cadastro', startDate)
      .lte('data_cadastro', endDate);

    if (leadsError) throw leadsError;

    const totalLeads = leadsNoPeriodo.length;
    let leadsNovos = 0;
    let leadsConvertidos = 0;
    let leadsPerdidos = 0;
    let leadsResponderam = 0;
    const porOrigem = {};

    leadsNoPeriodo.forEach((lead) => {
      if (lead.status === 'Novo') leadsNovos++;
      if (lead.status === 'Convertido') leadsConvertidos++;
      if (lead.status === 'Perdido') leadsPerdidos++;
      if (lead.status === 'Respondeu') leadsResponderam++;
      porOrigem[lead.origem] = (porOrigem[lead.origem] || 0) + 1;
    });

    // Mensagens enviadas no periodo
    const { count: mensagensEnviadas } = await supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'enviada')
      .gte('criado_em', startDate)
      .lte('criado_em', endDate);

    // Mensagens recebidas no periodo
    const { count: mensagensRecebidas } = await supabase
      .from('mensagens_log')
      .select('id', { count: 'exact' })
      .eq('direcao', 'recebida')
      .gte('criado_em', startDate)
      .lte('criado_em', endDate);

    const taxaResposta = mensagensEnviadas > 0
      ? ((mensagensRecebidas / mensagensEnviadas) * 100).toFixed(1)
      : '0.0';

    return {
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      total_leads: totalLeads,
      leads_novos: leadsNovos,
      leads_convertidos: leadsConvertidos,
      leads_perdidos: leadsPerdidos,
      mensagens_enviadas: mensagensEnviadas || 0,
      mensagens_recebidas: mensagensRecebidas || 0,
      dados_json: {
        taxa_resposta: taxaResposta,
        leads_responderam: leadsResponderam,
        por_origem: porOrigem,
      },
    };
  }
}

module.exports = ReportService;
