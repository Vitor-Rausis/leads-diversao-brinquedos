import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import Card from '../ui/Card';

export default function LeadProgressChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Leads ao Longo do Tempo</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="data"
            fontSize={11}
            tickFormatter={(val) => {
              const parts = val.split('-');
              return `${parts[2]}/${parts[1]}`;
            }}
          />
          <YAxis fontSize={12} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
            labelFormatter={(val) => {
              const parts = val.split('-');
              return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#colorLeads)"
            name="Leads"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
