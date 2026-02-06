import { Users, Send, MessageSquare, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';

export default function StatsCards({ stats }) {
  const cards = [
    {
      title: 'Total de Leads',
      value: stats?.total_leads || 0,
      icon: Users,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
    },
    {
      title: 'Convertidos',
      value: stats?.por_status?.Convertido || 0,
      icon: TrendingUp,
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
    {
      title: 'Mensagens Enviadas',
      value: stats?.mensagens_enviadas || 0,
      icon: Send,
      color: 'text-warning-600',
      bg: 'bg-warning-50',
    },
    {
      title: 'Taxa de Resposta',
      value: `${stats?.taxa_resposta || 0}%`,
      icon: MessageSquare,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={`${card.bg} p-3 rounded-xl`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
