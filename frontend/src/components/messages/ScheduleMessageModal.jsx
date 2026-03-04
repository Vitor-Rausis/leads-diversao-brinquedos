import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { createScheduledMessage, updateScheduledMessage } from '../../api/messageApi';

export default function ScheduleMessageModal({ isOpen, onClose, onSuccess, lead, editingMsg }) {
  const [conteudo, setConteudo] = useState('');
  const [dataHora, setDataHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reseta os campos sempre que o modal abre ou muda o agendamento sendo editado
  useEffect(() => {
    if (isOpen) {
      if (editingMsg) {
        setConteudo(editingMsg.conteudo_custom || '');
        const d = new Date(editingMsg.data_agendada);
        setDataHora(format(d, "yyyy-MM-dd'T'HH:mm"));
      } else {
        setConteudo('');
        setDataHora('');
      }
      setError('');
    }
  }, [isOpen, editingMsg]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!conteudo.trim()) { setError('Escreva a mensagem'); return; }
    if (!dataHora) { setError('Informe a data e hora'); return; }

    const dataAgendada = new Date(dataHora).toISOString();
    if (new Date(dataAgendada) <= new Date()) {
      setError('A data deve ser no futuro');
      return;
    }

    setLoading(true);
    try {
      if (editingMsg) {
        await updateScheduledMessage(editingMsg.id, {
          conteudo_custom: conteudo.trim(),
          data_agendada: dataAgendada,
        });
      } else {
        await createScheduledMessage({
          lead_id: lead.id,
          tipo: 'dia_3',
          conteudo_custom: conteudo.trim(),
          data_agendada: dataAgendada,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConteudo('');
    setDataHora('');
    setError('');
    onClose();
  };

  const minDatetime = format(new Date(Date.now() + 60000), "yyyy-MM-dd'T'HH:mm");
  const isEditing = !!editingMsg;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? 'Editar Agendamento' : 'Agendar Mensagem'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium text-gray-800">{lead?.nome}</p>
          <p>{lead?.whatsapp}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={4}
            placeholder="Digite a mensagem que será enviada..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <p className="text-xs text-gray-400 mt-0.5">Use {'{{'} {'nome}}'} para inserir o nome do lead</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data e hora</label>
          <input
            type="datetime-local"
            value={dataHora}
            min={minDatetime}
            onChange={(e) => setDataHora(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {isEditing ? 'Salvar' : 'Agendar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
