import { useState } from 'react';
import { Users } from 'lucide-react';
import Modal from '../ui/Modal';
import { bulkScheduleMessages } from '../../api/messageApi';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'Novo', label: 'Novo' },
  { value: 'Em Contato', label: 'Em Contato' },
  { value: 'Respondeu', label: 'Respondeu' },
  { value: 'Convertido', label: 'Convertido' },
  { value: 'Perdido', label: 'Perdido' },
];

export default function BulkScheduleModal({ isOpen, onClose, initialMessage = '', onSuccess }) {
  const [statusLeads, setStatusLeads] = useState([]);
  const [conteudo, setConteudo] = useState(initialMessage);
  const [dataAgendada, setDataAgendada] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleStatus = (value) => {
    setStatusLeads((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (statusLeads.length === 0) {
      toast.error('Selecione ao menos um status de lead');
      return;
    }
    if (!conteudo.trim()) {
      toast.error('Digite a mensagem');
      return;
    }
    if (!dataAgendada) {
      toast.error('Selecione a data e hora');
      return;
    }

    try {
      setSaving(true);
      const res = await bulkScheduleMessages({
        status_leads: statusLeads,
        conteudo: conteudo.trim(),
        data_agendada: new Date(dataAgendada).toISOString(),
      });
      toast.success(`${res.data.agendadas} mensagem(ns) agendada(s) com sucesso!`);
      onClose();
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao agendar mensagens';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setStatusLeads([]);
    setConteudo(initialMessage);
    setDataAgendada('');
    onClose();
  };

  // Data mínima: agora + 1 minuto (formato datetime-local)
  const minDateTime = new Date(Date.now() + 60000).toISOString().slice(0, 16);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Agendar Mensagem em Massa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Seleção de status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 inline mr-1" />
            Enviar para leads com status
          </label>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStatus(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  statusLeads.includes(opt.value)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {statusLeads.length > 0 && (
            <p className="text-xs text-gray-500 mt-1.5">
              Selecionado: {statusLeads.join(', ')}
            </p>
          )}
        </div>

        {/* Data e hora */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data e hora do envio
          </label>
          <input
            type="datetime-local"
            value={dataAgendada}
            min={minDateTime}
            onChange={(e) => setDataAgendada(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            required
          />
        </div>

        {/* Mensagem */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensagem
          </label>
          <textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm resize-none"
            placeholder="Use {{nome}} para inserir o nome do lead..."
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Use <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code> para personalizar com o nome do lead.
          </p>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || statusLeads.length === 0}
            className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Agendando...' : 'Agendar para todos'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
