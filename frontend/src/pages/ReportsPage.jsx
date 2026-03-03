import { useState, useEffect } from 'react';
import { getReports, generateReport, downloadReportCSV } from '../api/reportApi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileDown, Plus, TrendingUp, Users, MessageSquare, Send, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import toast from 'react-hot-toast';

function StatCard({ title, value, subtitle, color, icon: Icon }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color.bg}`}>
          <Icon className={`w-5 h-5 ${color.text}`} />
        </div>
      </div>
    </Card>
  );
}

function formatMonth(dateStr) {
  try {
    return format(parseISO(dateStr), 'MMM/yy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-medium text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  useEffect(() => { loadReports(); }, []);

  const loadReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    setGenerating(true);
    try {
      await generateReport({ periodo_inicio: periodoInicio, periodo_fim: periodoFim });
      toast.success('Relatório gerado com sucesso');
      setShowForm(false);
      setPeriodoInicio(''); setPeriodoFim('');
      loadReports();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao gerar relatório');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report) => {
    try {
      const res = await downloadReportCSV(report.id);
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${report.periodo_inicio}_${report.periodo_fim}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Erro ao baixar CSV'); }
  };

  if (loading) return <Spinner size="lg" />;

  // Prepara dados para gráficos (ordem cronológica)
  const sorted = [...reports].sort((a, b) =>
    new Date(a.periodo_inicio) - new Date(b.periodo_inicio)
  );

  const chartData = sorted.map((r) => ({
    mes: formatMonth(r.periodo_inicio),
    Leads: r.total_leads,
    Convertidos: r.leads_convertidos,
    Perdidos: r.leads_perdidos,
    'Msg Enviadas': r.mensagens_enviadas,
    'Msg Recebidas': r.mensagens_recebidas,
    taxa: parseFloat(r.dados_json?.taxa_resposta || 0),
  }));

  // Totais acumulados
  const totalLeads = reports.reduce((s, r) => s + (r.total_leads || 0), 0);
  const totalConvertidos = reports.reduce((s, r) => s + (r.leads_convertidos || 0), 0);
  const totalEnviadas = reports.reduce((s, r) => s + (r.mensagens_enviadas || 0), 0);
  const taxaMedia = reports.length
    ? (reports.reduce((s, r) => s + parseFloat(r.dados_json?.taxa_resposta || 0), 0) / reports.length).toFixed(1)
    : '0.0';
  const taxaConversao = totalLeads > 0 ? ((totalConvertidos / totalLeads) * 100).toFixed(1) : '0.0';

  // Melhor mês (mais convertidos)
  const melhorMes = sorted.reduce((best, r) =>
    (r.leads_convertidos || 0) > (best?.leads_convertidos || 0) ? r : best, null
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">{reports.length} períodos analisados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Gerar Relatório'}
        </Button>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Novo Relatório</h3>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-end gap-4">
            <Input label="Início" type="date" value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)} className="flex-1" required />
            <Input label="Fim" type="date" value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)} className="flex-1" required />
            <Button type="submit" loading={generating}>Gerar</Button>
          </form>
        </Card>
      )}

      {reports.length === 0 ? (
        <Card className="p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum relatório gerado ainda</p>
          <p className="text-sm text-gray-400 mt-1">Clique em "Gerar Relatório" para começar</p>
        </Card>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total de Leads" value={totalLeads}
              subtitle={`${reports.length} meses`}
              color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={Users} />
            <StatCard title="Convertidos" value={totalConvertidos}
              subtitle={`${taxaConversao}% de conversão`}
              color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={TrendingUp} />
            <StatCard title="Msgs Enviadas" value={totalEnviadas}
              subtitle={`~${Math.round(totalEnviadas / reports.length)}/mês`}
              color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} icon={Send} />
            <StatCard title="Taxa de Resposta" value={`${taxaMedia}%`}
              subtitle="média dos períodos"
              color={{ bg: 'bg-purple-50', text: 'text-purple-600' }} icon={MessageSquare} />
          </div>

          {/* Destaque melhor mês */}
          {melhorMes && (
            <Card className="p-4 bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Melhor período: {formatMonth(melhorMes.periodo_inicio)}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {melhorMes.leads_convertidos} conversões de {melhorMes.total_leads} leads
                    ({melhorMes.total_leads > 0
                      ? ((melhorMes.leads_convertidos / melhorMes.total_leads) * 100).toFixed(1)
                      : 0}% de conversão)
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Gráfico: Evolução de leads */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-5">Evolução de Leads por Mês</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" fontSize={12} tick={{ fill: '#9CA3AF' }} />
                <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Area type="monotone" dataKey="Leads" stroke="#3B82F6" fill="url(#gradLeads)"
                  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Area type="monotone" dataKey="Convertidos" stroke="#10B981" fill="url(#gradConv)"
                  strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Gráfico: Mensagens */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-5">Mensagens Enviadas vs Recebidas</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" fontSize={12} tick={{ fill: '#9CA3AF' }} />
                <YAxis fontSize={12} tick={{ fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                <Bar dataKey="Msg Enviadas" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Msg Recebidas" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tabela detalhada (colapsável) */}
          <Card className="overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setShowTable(!showTable)}
            >
              <span>Dados detalhados por período</span>
              {showTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTable && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Período</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Leads</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Convertidos</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Perdidos</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Msg Env.</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Msg Rec.</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Taxa Resp.</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Conversão</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">CSV</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((r) => {
                      const conv = r.total_leads > 0
                        ? ((r.leads_convertidos / r.total_leads) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {formatMonth(r.periodo_inicio)}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-700">{r.total_leads}</td>
                          <td className="px-4 py-3 text-center font-semibold text-emerald-600">{r.leads_convertidos}</td>
                          <td className="px-4 py-3 text-center text-red-500">{r.leads_perdidos}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{r.mensagens_enviadas}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{r.mensagens_recebidas}</td>
                          <td className="px-4 py-3 text-center text-purple-600 font-medium">
                            {r.dados_json?.taxa_resposta || '0'}%
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              parseFloat(conv) >= 40
                                ? 'bg-emerald-100 text-emerald-700'
                                : parseFloat(conv) >= 20
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {conv}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDownload(r)}
                              className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Baixar CSV"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
