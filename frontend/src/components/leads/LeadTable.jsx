import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Phone } from 'lucide-react';
import { format } from 'date-fns';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';

export default function LeadTable({ leads, total, page, limit, onPageChange, onEdit, onDelete }) {
  const navigate = useNavigate();

  if (!leads || leads.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Nenhum lead encontrado"
          description="Cadastre um novo lead ou importe via planilha"
        />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">WhatsApp</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Origem</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Data</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{lead.nome}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-success-500" />
                    {lead.whatsapp}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge status={lead.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">{lead.origem}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {lead.data_cadastro
                    ? format(new Date(lead.data_cadastro), 'dd/MM/yyyy HH:mm')
                    : '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(lead)}
                      className="p-1.5 text-gray-400 hover:text-warning-600 rounded-lg hover:bg-warning-50 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(lead)}
                      className="p-1.5 text-gray-400 hover:text-danger-600 rounded-lg hover:bg-danger-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={limit} onPageChange={onPageChange} />
    </Card>
  );
}
