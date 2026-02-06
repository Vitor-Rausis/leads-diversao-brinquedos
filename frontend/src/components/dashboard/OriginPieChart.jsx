import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import Card from '../ui/Card';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function OriginPieChart({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-gray-800 mb-4">Leads por Origem</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="origem"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={2}
            label={({ origem, percent }) =>
              `${origem} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={false}
            fontSize={11}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}
