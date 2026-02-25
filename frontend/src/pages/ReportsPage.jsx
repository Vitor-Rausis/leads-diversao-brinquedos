import { useState, useEffect } from 'react';
import { getReports, generateReport, downloadReportCSV } from '../api/reportApi';
import { format } from 'date-fns';
import { FileDown, Plus, BarChart3 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await getReports();
      setReports(res.data.data);
    } catch (err) {
      console.error('Erro ao carregar relatorios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!periodoInicio || !periodoFim) {
      toast.error('Informe o período');
      return;
    }
    setGenerating(true);
    try {
      await generateReport({ periodo_inicio: periodoInicio, periodo_fim: periodoFim });
      toast.success('Relatório gerado com sucesso');
      setShowForm(false);
      setPeriodoInicio('');
      setPeriodoFim('');
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
      a.download = `relatório_${report.periodo_inicio}_${report.periodo_fim}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Erro ao baixar CSV');
    }
  };

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-1">Relatórios mensais de desempenho</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Gerar Relatório
        </Button>
      </div>

      {showForm && (
        <Card className="p-6">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Novo Relatório</h3>
          <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row items-end gap-4">
            <Input
              label="Início"
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
              className="flex-1"
              required
            />
            <Input
              label="Fim"
              type="date"
              value={periodoFim}
              onChange={(e) => setPeriodoFim(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" loading={generating}>
              Gerar
            </Button>
          </form>
        </Card>
      )}

      {reports.length === 0 ? (
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Nenhum relatório gerado"
            description="Clique em 'Gerar Relatório' para criar o primeiro"
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Periodo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Total Leads</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Convertidos</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Msg Enviadas</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Msg Recebidas</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Taxa Resposta</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Gerado em</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">CSV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {report.periodo_inicio} a {report.periodo_fim}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{report.total_leads}</td>
                    <td className="px-4 py-3 text-success-600 font-medium">{report.leads_convertidos}</td>
                    <td className="px-4 py-3 text-gray-600">{report.mensagens_enviadas}</td>
                    <td className="px-4 py-3 text-gray-600">{report.mensagens_recebidas}</td>
                    <td className="px-4 py-3 text-primary-600 font-medium">
                      {report.dados_json?.taxa_resposta || '0'}%
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {report.criado_em ? format(new Date(report.criado_em), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownload(report)}
                        className="p-1.5 text-gray-400 hover:text-success-600 rounded-lg hover:bg-success-50 transition-colors"
                        title="Baixar CSV"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
