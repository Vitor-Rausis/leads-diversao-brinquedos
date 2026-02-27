import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Calendar, Tag, MessageSquare, Clock, Plus } from 'lucide-react';
import { getLead } from '../api/leadApi';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import ScheduleMessageModal from '../components/messages/ScheduleMessageModal';
import { format } from 'date-fns';

export default function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    try {
      const res = await getLead(id);
      setLead(res.data);
    } catch (err) {
      console.error('Erro ao carregar lead:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner size="lg" />;
  if (!lead) return <p className="text-center text-gray-500 py-12">Lead não encontrado</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      {/* Lead Info */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{lead.nome}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4" /> {lead.whatsapp}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {lead.data_cadastro ? format(new Date(lead.data_cadastro), 'dd/MM/yyyy HH:mm') : '-'}
              </span>
              <span className="flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> {lead.origem}
              </span>
            </div>
          </div>
          <Badge status={lead.status} className="text-sm px-3 py-1" />
        </div>
        {lead.observacoes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">{lead.observacoes}</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mensagens Agendadas */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Mensagens Agendadas
            </h2>
            <Button size="sm" onClick={() => setScheduleModalOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Agendar
            </Button>
          </div>
          {lead.mensagens_agendadas?.length > 0 ? (
            <div className="space-y-3">
              {lead.mensagens_agendadas.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-700">
                      {msg.conteudo_custom
                        ? <span className="truncate block" title={msg.conteudo_custom}>{msg.conteudo_custom.length > 60 ? msg.conteudo_custom.substring(0, 60) + '…' : msg.conteudo_custom}</span>
                        : msg.tipo === 'dia_3' ? 'Mensagem 3 dias'
                        : msg.tipo === 'dia_7' ? 'Mensagem 7 dias'
                        : 'Mensagem 10 meses'
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Agendada: {msg.data_agendada ? format(new Date(msg.data_agendada), 'dd/MM/yyyy HH:mm') : '-'}
                    </p>
                  </div>
                  <Badge status={msg.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem agendada</p>
          )}
        </Card>

        {/* Histórico de Mensagens */}
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            Histórico de Mensagens
          </h2>
          {lead.mensagens_log?.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
              {[...lead.mensagens_log].reverse().map((msg) => {
                const enviada = msg.direcao === 'enviada';
                return (
                  <div key={msg.id} className={`flex flex-col ${enviada ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                        enviada
                          ? 'bg-primary-500 text-white rounded-tr-sm'
                          : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.conteudo}</p>
                    </div>
                    <span className="text-[11px] text-gray-400 mt-0.5 px-1">
                      {enviada ? 'Sistema' : lead.nome} · {msg.criado_em ? format(new Date(msg.criado_em), 'dd/MM HH:mm') : '-'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem registrada</p>
          )}
        </Card>
      </div>

      <ScheduleMessageModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onSuccess={() => { loadLead(); setScheduleModalOpen(false); }}
        lead={lead}
      />
    </div>
  );
}
