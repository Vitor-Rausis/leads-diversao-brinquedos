import { useState, useEffect } from 'react';
import { getMessages, getScheduledMessages } from '../api/messageApi';
import { format } from 'date-fns';
import { Send, Inbox, Clock } from 'lucide-react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Pagination from '../components/ui/Pagination';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';

export default function MessagesPage() {
  const [tab, setTab] = useState('log');
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [direcao, setDirecao] = useState('');
  const [scheduledStatus, setScheduledStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, [tab, page, direcao, scheduledStatus]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      if (tab === 'log') {
        const params = { page, limit: 30 };
        if (direcao) params.direcao = direcao;
        const res = await getMessages(params);
        setMessages(res.data.data);
        setTotal(res.data.total);
      } else {
        const params = { page, limit: 30 };
        if (scheduledStatus) params.status = scheduledStatus;
        const res = await getScheduledMessages(params);
        setMessages(res.data.data);
        setTotal(res.data.total);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
        <p className="text-sm text-gray-500 mt-1">Histórico de mensagens e agendamentos</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => { setTab('log'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'log' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Histórico
        </button>
        <button
          onClick={() => { setTab('scheduled'); setPage(1); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'scheduled' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Agendadas
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {tab === 'log' ? (
          <Select
            options={[
              { value: '', label: 'Todas' },
              { value: 'enviada', label: 'Enviadas' },
              { value: 'recebida', label: 'Recebidas' },
            ]}
            value={direcao}
            onChange={(e) => { setDirecao(e.target.value); setPage(1); }}
            className="w-40"
          />
        ) : (
          <Select
            options={[
              { value: '', label: 'Todos status' },
              { value: 'pendente', label: 'Pendentes' },
              { value: 'enviada', label: 'Enviadas' },
              { value: 'falha', label: 'Falha' },
              { value: 'cancelada', label: 'Canceladas' },
            ]}
            value={scheduledStatus}
            onChange={(e) => { setScheduledStatus(e.target.value); setPage(1); }}
            className="w-40"
          />
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : messages.length === 0 ? (
        <Card>
          <EmptyState
            icon={tab === 'log' ? Send : Clock}
            title="Nenhuma mensagem encontrada"
            description={tab === 'log' ? 'O histórico de mensagens aparecerá aqui' : 'Mensagens agendadas aparecerão aqui'}
          />
        </Card>
      ) : tab === 'log' ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Direcao</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Lead</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">WhatsApp</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Conteudo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {msg.direcao === 'enviada' ? (
                          <Send className="w-4 h-4 text-primary-500" />
                        ) : (
                          <Inbox className="w-4 h-4 text-success-500" />
                        )}
                        <span className="text-xs font-medium">
                          {msg.direcao === 'enviada' ? 'Enviada' : 'Recebida'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {msg.leads?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{msg.whatsapp}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{msg.conteudo}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {msg.criado_em ? format(new Date(msg.criado_em), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={30} onPageChange={setPage} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Lead</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Agendada para</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tentativas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {msg.leads?.nome || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {msg.tipo === 'dia_3' && '3 dias'}
                      {msg.tipo === 'dia_7' && '7 dias'}
                      {msg.tipo === 'mes_10' && '10 meses'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {msg.data_agendada ? format(new Date(msg.data_agendada), 'dd/MM/yyyy HH:mm') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={msg.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{msg.tentativas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} limit={30} onPageChange={setPage} />
        </Card>
      )}
    </div>
  );
}
