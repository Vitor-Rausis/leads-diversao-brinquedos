import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

const statusOptions = [
  { value: 'Novo', label: 'Novo' },
  { value: 'Em Contato', label: 'Em Contato' },
  { value: 'Respondeu', label: 'Respondeu' },
  { value: 'Convertido', label: 'Convertido' },
  { value: 'Perdido', label: 'Perdido' },
];

const origemOptions = [
  { value: 'Manual', label: 'Manual' },
  { value: 'Planilha', label: 'Planilha' },
  { value: 'Formulário do site', label: 'Formulário do site' },
  { value: 'Indicação', label: 'Indicação' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Google', label: 'Google' },
];

export default function LeadForm({ isOpen, onClose, onSubmit, lead = null, loading = false }) {
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    origem: 'Manual',
    status: 'Novo',
    observacoes: '',
  });

  useEffect(() => {
    if (lead) {
      setForm({
        nome: lead.nome || '',
        whatsapp: lead.whatsapp || '',
        origem: lead.origem || 'Manual',
        status: lead.status || 'Novo',
        observacoes: lead.observacoes || '',
      });
    } else {
      setForm({ nome: '', whatsapp: '', origem: 'Manual', status: 'Novo', observacoes: '' });
    }
  }, [lead, isOpen]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? 'Editar Lead' : 'Novo Lead'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome"
          value={form.nome}
          onChange={(e) => handleChange('nome', e.target.value)}
          placeholder="Nome do lead"
          required
        />
        <Input
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(e) => handleChange('whatsapp', e.target.value)}
          placeholder="5511999999999"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Origem"
            options={origemOptions}
            value={form.origem}
            onChange={(e) => handleChange('origem', e.target.value)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={form.status}
            onChange={(e) => handleChange('status', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            rows={3}
            value={form.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
            placeholder="Observações sobre o lead..."
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" loading={loading}>
            {lead ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
