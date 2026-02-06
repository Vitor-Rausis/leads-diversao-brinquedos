import { Search } from 'lucide-react';
import Select from '../ui/Select';

const statusOptions = [
  { value: '', label: 'Todos os status' },
  { value: 'Novo', label: 'Novo' },
  { value: 'Em Contato', label: 'Em Contato' },
  { value: 'Respondeu', label: 'Respondeu' },
  { value: 'Convertido', label: 'Convertido' },
  { value: 'Perdido', label: 'Perdido' },
];

const origemOptions = [
  { value: '', label: 'Todas as origens' },
  { value: 'Manual', label: 'Manual' },
  { value: 'Planilha', label: 'Planilha' },
  { value: 'Formulario do site', label: 'Formulario do site' },
];

export default function LeadFilters({ filters, onChange }) {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
      <Select
        options={statusOptions}
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value)}
        className="sm:w-40"
      />
      <Select
        options={origemOptions}
        value={filters.origem || ''}
        onChange={(e) => handleChange('origem', e.target.value)}
        className="sm:w-44"
      />
    </div>
  );
}
