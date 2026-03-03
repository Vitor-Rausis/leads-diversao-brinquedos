import Card from '../ui/Card';

const STAGES = [
  { status: 'Novo',       color: 'bg-blue-500',   light: 'bg-blue-50',   text: 'text-blue-700',   label: 'Novos' },
  { status: 'Em Contato', color: 'bg-amber-500',  light: 'bg-amber-50',  text: 'text-amber-700',  label: 'Em Contato' },
  { status: 'Respondeu',  color: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', label: 'Responderam' },
  { status: 'Convertido', color: 'bg-emerald-500',light: 'bg-emerald-50',text: 'text-emerald-700',label: 'Convertidos' },
  { status: 'Perdido',    color: 'bg-red-400',    light: 'bg-red-50',    text: 'text-red-700',    label: 'Perdidos' },
];

export default function FunnelChart({ data }) {
  if (!data || data.length === 0) return null;

  const countMap = Object.fromEntries(data.map((d) => [d.status, d.count]));
  const total = STAGES.reduce((sum, s) => sum + (countMap[s.status] || 0), 0);
  const maxCount = Math.max(...STAGES.map((s) => countMap[s.status] || 0), 1);

  // Calcula taxa de conversão: Convertidos / (todos exceto Perdido)
  const convertidos = countMap['Convertido'] || 0;
  const ativos = total - (countMap['Perdido'] || 0);
  const taxaConversao = ativos > 0 ? ((convertidos / ativos) * 100).toFixed(1) : '0.0';

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-800">Funil de Conversão</h3>
        <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full font-medium">
          {taxaConversao}% conversão
        </span>
      </div>

      <div className="space-y-3">
        {STAGES.map((stage) => {
          const count = countMap[stage.status] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={stage.status}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${stage.light} ${stage.text}`}>
                    {pct}%
                  </span>
                  <span className="text-sm font-semibold text-gray-800 w-6 text-right">{count}</span>
                </div>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.color}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>{total} leads no total</span>
        <span>{convertidos} fechamentos</span>
      </div>
    </Card>
  );
}
