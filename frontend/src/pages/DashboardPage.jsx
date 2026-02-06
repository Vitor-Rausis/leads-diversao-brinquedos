import { useState, useEffect } from 'react';
import { getStats, getFunnel, getProgress, getOrigins } from '../api/dashboardApi';
import StatsCards from '../components/dashboard/StatsCards';
import FunnelChart from '../components/dashboard/FunnelChart';
import LeadProgressChart from '../components/dashboard/LeadProgressChart';
import OriginPieChart from '../components/dashboard/OriginPieChart';
import Spinner from '../components/ui/Spinner';
import Select from '../components/ui/Select';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [funnel, setFunnel] = useState([]);
  const [progress, setProgress] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, funnelRes, progressRes, originsRes] = await Promise.all([
        getStats(),
        getFunnel(),
        getProgress(period),
        getOrigins(),
      ]);
      setStats(statsRes.data);
      setFunnel(funnelRes.data);
      setProgress(progressRes.data);
      setOrigins(originsRes.data);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Visao geral do sistema</p>
        </div>
        <Select
          options={[
            { value: '7', label: 'Ultimos 7 dias' },
            { value: '30', label: 'Ultimos 30 dias' },
            { value: '90', label: 'Ultimos 90 dias' },
            { value: '365', label: 'Ultimo ano' },
          ]}
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-44"
        />
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelChart data={funnel} />
        <OriginPieChart data={origins} />
      </div>

      <LeadProgressChart data={progress} />
    </div>
  );
}
