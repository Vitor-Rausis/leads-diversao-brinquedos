import clsx from 'clsx';

const statusColors = {
  'Novo': 'bg-blue-100 text-blue-700',
  'Em Contato': 'bg-amber-100 text-amber-700',
  'Respondeu': 'bg-purple-100 text-purple-700',
  'Convertido': 'bg-emerald-100 text-emerald-700',
  'Perdido': 'bg-red-100 text-red-700',
  'pendente': 'bg-yellow-100 text-yellow-700',
  'enviada': 'bg-green-100 text-green-700',
  'falha': 'bg-red-100 text-red-700',
  'cancelada': 'bg-gray-100 text-gray-500',
};

export default function Badge({ status, className = '' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        statusColors[status] || 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {status}
    </span>
  );
}
