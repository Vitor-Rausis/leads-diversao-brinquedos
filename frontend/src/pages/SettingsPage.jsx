import { useState, useEffect } from 'react';
import { getApiKeys, createApiKey, deactivateApiKey } from '../api/settingsApi';
import { Key, Plus, Copy, XCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const res = await getApiKeys();
      setApiKeys(res.data);
    } catch (err) {
      console.error('Erro ao carregar API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await createApiKey({ descricao });
      setApiKeys([res.data, ...apiKeys]);
      setDescricao('');
      setShowForm(false);
      toast.success('API Key criada! Copie e guarde em local seguro.');
    } catch (err) {
      toast.error('Erro ao criar API key');
    } finally {
      setCreating(false);
    }
  };

  const handleDeactivate = async (key) => {
    if (!window.confirm('Desativar esta API key?')) return;
    try {
      await deactivateApiKey(key.id);
      loadApiKeys();
      toast.success('API key desativada');
    } catch (err) {
      toast.error('Erro ao desativar API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiada para a area de transferencia');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie API keys para integracao externa</p>
      </div>

      {/* API Keys Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">API Keys</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Use API keys para enviar leads via formulario externo
            </p>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" />
            Nova Key
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="flex items-end gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
            <Input
              label="Descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Formulario do site principal"
              className="flex-1"
              required
            />
            <Button type="submit" loading={creating} size="md">
              Criar
            </Button>
          </form>
        )}

        {apiKeys.length === 0 ? (
          <EmptyState
            icon={Key}
            title="Nenhuma API key criada"
            description="Crie uma API key para integrar formularios externos"
          />
        ) : (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {key.descricao || 'API Key'}
                    </span>
                    <Badge status={key.ativo ? 'enviada' : 'cancelada'} />
                  </div>
                  <p className="text-xs font-mono text-gray-500 mt-1 truncate">{key.key_value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Criada em {format(new Date(key.criado_em), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(key.key_value)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {key.ativo && (
                    <button
                      onClick={() => handleDeactivate(key)}
                      className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      title="Desativar"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Integration Instructions */}
      <Card className="p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Como integrar</h2>
        <div className="bg-gray-900 rounded-lg p-4 text-sm font-mono text-gray-300 overflow-x-auto">
          <pre>{`POST /api/v1/public/leads
Headers:
  Content-Type: application/json
  x-api-key: sua_api_key_aqui

Body:
{
  "nome": "Nome do Lead",
  "whatsapp": "5511999999999",
  "origem": "Formulario do site"
}`}</pre>
        </div>
      </Card>
    </div>
  );
}
