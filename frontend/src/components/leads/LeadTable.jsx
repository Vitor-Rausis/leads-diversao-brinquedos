import { useNavigate } from 'react-router-dom';
import { Eye, Pencil, Trash2, Phone } from 'lucide-react';
import { format, differenceInHours } from 'date-fns';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';

function formatWhatsAppNumber(whatsapp) {
  const digits = String(whatsapp).replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return '55' + digits;
}

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
            {leads.map((lead) => {
              const esquecido =
                lead.status === 'Respondeu' &&
                lead.atualizado_em &&
                differenceInHours(new Date(), new Date(lead.atualizado_em)) >= 4;

              return (
                <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${esquecido ? 'bg-orange-50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {lead.nome}
                      {esquecido && (
                        <span
                          className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium"
                          title="Lead respondeu mas não recebeu retorno há mais de 4 horas"
                        >
                          ⚠ Esquecido
                        </span>
                      )}
                    </div>
                  </td>
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
                      <a
                        href={`https://wa.me/${formatWhatsAppNumber(lead.whatsapp)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 transition-colors"
                        title="Abrir no WhatsApp"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                      </a>
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
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} limit={limit} onPageChange={onPageChange} />
    </Card>
  );
}
