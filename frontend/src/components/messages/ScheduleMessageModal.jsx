import { useState } from 'react';
import { format } from 'date-fns';
import Modal from '../ui/Modal';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { createScheduledMessage } from '../../api/messageApi';

const TIPOS = [
  { value: 'dia_3', label: 'Mensagem 3 dias' },
  { value: 'dia_7', label: 'Mensagem 7 dias' },
  { value: 'mes_10', label: 'Mensagem 10 meses' },
];

export default function ScheduleMessageModal({ isOpen, onClose, onSuccess, lead }) {
  const [tipo, setTipo] = useState('dia_3');
  const [dataHora, setDataHora] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!dataHora) {
      setError('Informe a data e hora');
      return;
    }

    const dataAgendada = new Date(dataHora).toISOString();
    if (new Date(dataAgendada) <= new Date()) {
      setError('A data deve ser no futuro');
      return;
    }

    setLoading(true);
    try {
      await createScheduledMessage({
        lead_id: lead.id,
        tipo,
        data_agendada: dataAgendada,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao agendar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTipo('dia_3');
    setDataHora('');
    setError('');
    onClose();
  };

  // Mínimo: agora + 1 minuto, formatado para datetime-local
  const minDatetime = format(new Date(Date.now() + 60000), "yyyy-MM-dd'T'HH:mm");

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agendar Mensagem" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-medium text-gray-800">{lead?.nome}</p>
          <p>{lead?.whatsapp}</p>
        </div>

        <Select
          label="Template"
          options={TIPOS}
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        />

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
            Agendar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
