import { useState, useEffect } from 'react';
import { getReports, getLiveReport, generateReport, downloadReportCSV } from '../api/reportApi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileDown, Plus, TrendingUp, Users, MessageSquare, Send,
  X, ChevronDown, ChevronUp, RefreshCw, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
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

const PIE_COLORS = {
  Novo: '#3B82F6',
  'Em Contato': '#F59E0B',
  Respondeu: '#8B5CF6',
  Convertido: '#10B981',
  Perdido: '#EF4444',
};

export default function ReportsPage() {
  const [live, setLive] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [liveRes, reportsRes] = await Promise.all([
        getLiveReport(),
        getReports(),
      ]);
      setLive(liveRes.data);
      setReports(reportsRes.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getLiveReport();
      setLive(res.data);
      toast.success('Dados atualizados');
    } catch {
      toast.error('Erro ao atualizar');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!periodoInicio || !periodoFim) { toast.error('Informe o período'); return; }
    setGenerating(true);
    try {
      await generateReport({ periodo_inicio: periodoInicio, periodo_fim: periodoFim });
      toast.success('Relatório salvo com sucesso');
      setShowForm(false);
      setPeriodoInicio(''); setPeriodoFim('');
      const res = await getReports();
      setReports(res.data.data || []);
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

  // Pie chart data (status atual de todos os leads)
  const pieData = live?.por_status
    ? Object.entries(live.por_status).map(([name, value]) => ({ name, value }))
    : [];

  // Dados históricos para gráficos
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
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Dados em tempo real + histórico por período</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleRefresh} loading={refreshing}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancelar' : 'Salvar Período'}
          </Button>
        </div>
      </div>

      {/* Formulário salvar relatório histórico */}
      {showForm && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-1">Salvar Relatório do Período</h3>
          <p className="text-sm text-gray-500 mb-4">Gera um snapshot dos dados e salva no histórico.</p>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-end gap-4">
            <Input label="Início" type="date" value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)} className="flex-1" required />
            <Input label="Fim" type="date" value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)} className="flex-1" required />
            <Button type="submit" loading={generating}>Salvar</Button>
          </form>
        </Card>
      )}

      {/* === PAINEL AO VIVO === */}
      {live && (
        <>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Visão Geral — Dados em Tempo Real
            </h2>
          </div>

          {/* Cards principais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total de Leads" value={live.total_leads}
              subtitle={`${live.leads_no_mes} cadastrados este mês`}
              color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={Users} />
            <StatCard title="Convertidos" value={live.leads_convertidos}
              subtitle={`${live.taxa_conversao}% de conversão`}
              color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }} icon={TrendingUp} />
            <StatCard title="Msgs Enviadas (mês)" value={live.mensagens_enviadas}
              subtitle={`${live.mensagens_recebidas} recebidas`}
              color={{ bg: 'bg-amber-50', text: 'text-amber-600' }} icon={Send} />
            <StatCard title="Taxa de Resposta" value={`${live.taxa_resposta}%`}
              subtitle="leads que responderam / total"
              color={{ bg: 'bg-purple-50', text: 'text-purple-600' }} icon={MessageSquare} />
          </div>

          {/* Pipeline + Origem */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funil por status */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-5">Pipeline de Leads</h3>
              {pieData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value">
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[entry.name] || '#94A3B8' }} />
                          <span className="text-sm text-gray-600">{entry.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
                          <span className="text-xs text-gray-400">
                            ({live.total_leads > 0
                              ? ((entry.value / live.total_leads) * 100).toFixed(0)
                              : 0}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Nenhum lead cadastrado</p>
              )}
            </Card>

            {/* Origem dos leads */}
            <Card className="p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-5">Origem dos Leads</h3>
              {live.por_origem && Object.keys(live.por_origem).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(live.por_origem)
                    .sort((a, b) => b[1] - a[1])
                    .map(([origem, count]) => {
                      const pct = live.total_leads > 0
                        ? Math.round((count / live.total_leads) * 100)
                        : 0;
                      return (
                        <div key={origem}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 truncate">{origem}</span>
                            <span className="text-gray-800 font-medium ml-2">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Sem dados de origem</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* === HISTÓRICO === */}
      {reports.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Histórico por Período
            </h2>
          </div>

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
              <span>Dados detalhados por período ({reports.length} registros)</span>
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

      {/* Estado vazio (sem histórico) */}
      {reports.length === 0 && (
        <Card className="p-8 text-center">
          <TrendingUp className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum período salvo ainda</p>
          <p className="text-sm text-gray-400 mt-1">
            Clique em "Salvar Período" para guardar um snapshot no histórico
          </p>
        </Card>
      )}
    </div>
  );
}
