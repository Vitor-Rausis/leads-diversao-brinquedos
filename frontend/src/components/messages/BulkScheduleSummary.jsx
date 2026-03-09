import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Users, Calendar, X, RefreshCw } from 'lucide-react';
import { getBulkSummary, cancelBulkBatch } from '../../api/messageApi';
import toast from 'react-hot-toast';

const STATUS_LABELS = {
  Novo: 'Novo',
  'Em Contato': 'Em Contato',
  Respondeu: 'Respondeu',
  Convertido: 'Convertido',
  Perdido: 'Perdido',
};

const STATUS_COLORS = {
  Novo: 'bg-blue-100 text-blue-700',
  'Em Contato': 'bg-yellow-100 text-yellow-700',
  Respondeu: 'bg-green-100 text-green-700',
  Convertido: 'bg-emerald-100 text-emerald-700',
  Perdido: 'bg-red-100 text-red-700',
};

export default function BulkScheduleSummary({ onRefresh }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await getBulkSummary();
      setBatches(res.data);
    } catch (err) {
      console.error('Erro ao carregar agendamentos em massa:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (batch) => {
    if (!window.confirm(`Cancelar agendamento em massa para ${batch.total} lead(s)?`)) return;
    try {
      setCancelling(batch.data_agendada + batch.conteudo);
      await cancelBulkBatch(batch.ids);
      toast.success(`${batch.total} agendamento(s) cancelado(s)`);
      load();
      onRefresh?.();
    } catch (err) {
      toast.error('Erro ao cancelar agendamentos');
    } finally {
      setCancelling(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        Carregando agendamentos...
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">Nenhum agendamento em massa pendente.</p>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((batch) => {
        const key = batch.data_agendada + batch.conteudo;
        const isCancelling = cancelling === key;
        return (
          <div key={key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Status de leads alvo */}
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-500">Para leads:</span>
                  {(batch.status_leads || []).map((s) => (
                    <span
                      key={s}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUS_LABELS[s] || s}
                    </span>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">({batch.total} lead{batch.total !== 1 ? 's' : ''})</span>
                </div>

                {/* Data agendada */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    Envio em:{' '}
                    <span className="font-medium text-gray-700">
                      {format(new Date(batch.data_agendada), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </span>
                </div>

                {/* Mensagem */}
                <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 bg-white border border-gray-100 rounded px-3 py-2">
                  {batch.conteudo}
                </p>

                {/* Agendado em */}
                {batch.agendado_em && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Agendado em {format(new Date(batch.agendado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>

              {/* Cancelar batch */}
              <button
                onClick={() => handleCancel(batch)}
                disabled={isCancelling}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                title="Cancelar este agendamento em massa"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
