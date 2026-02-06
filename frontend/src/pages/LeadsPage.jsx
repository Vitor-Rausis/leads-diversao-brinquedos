import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload } from 'lucide-react';
import { getLeads, createLead, updateLead, deleteLead } from '../api/leadApi';
import LeadTable from '../components/leads/LeadTable';
import LeadFilters from '../components/leads/LeadFilters';
import LeadForm from '../components/leads/LeadForm';
import LeadImport from '../components/leads/LeadImport';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: '',
    origem: '',
    search: '',
  });

  const debouncedSearch = useDebounce(filters.search);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit,
      };
      if (filters.status) params.status = filters.status;
      if (filters.origem) params.origem = filters.origem;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await getLeads(params);
      setLeads(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      toast.error('Erro ao carregar leads');
    } finally {
      setLoading(false);
    }
  }, [filters.page, filters.limit, filters.status, filters.origem, debouncedSearch]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (editingLead) {
        await updateLead(editingLead.id, formData);
        toast.success('Lead atualizado');
      } else {
        await createLead(formData);
        toast.success('Lead cadastrado');
      }
      setFormOpen(false);
      setEditingLead(null);
      loadLeads();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar lead');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormOpen(true);
  };

  const handleDelete = async (lead) => {
    if (!window.confirm(`Excluir o lead "${lead.nome}"?`)) return;
    try {
      await deleteLead(lead.id);
      toast.success('Lead excluido');
      loadLeads();
    } catch (err) {
      toast.error('Erro ao excluir lead');
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingLead(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{total} leads cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <Upload className="w-4 h-4" />
            Importar
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      <LeadFilters filters={filters} onChange={setFilters} />

      {loading && leads.length === 0 ? (
        <Spinner />
      ) : (
        <LeadTable
          leads={leads}
          total={total}
          page={filters.page}
          limit={filters.limit}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <LeadForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        lead={editingLead}
        loading={submitting}
      />

      <LeadImport
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={loadLeads}
      />
    </div>
  );
}
