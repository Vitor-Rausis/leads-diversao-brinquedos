import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import Card from '../ui/Card';

const STATUS_COLORS = {
  'Novo': '#3B82F6',
  'Em Contato': '#F59E0B',
  'Respondeu': '#8B5CF6',
  'Convertido': '#10B981',
  'Perdido': '#EF4444',
};

export default function FunnelChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Funil de Leads</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <XAxis type="number" fontSize={12} />
          <YAxis type="category" dataKey="status" width={90} fontSize={12} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} name="Leads">
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] || '#6B7280'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
