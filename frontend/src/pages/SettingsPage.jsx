import { useState, useEffect, useRef } from 'react';
import { getApiKeys, createApiKey, deactivateApiKey } from '../api/settingsApi';
import { getWhatsAppStatus, disconnectWhatsApp, reconnectWhatsApp } from '../api/whatsappApi';
import { Key, Plus, Copy, XCircle, Smartphone, Wifi, WifiOff, RefreshCw, QrCode, Loader2 } from 'lucide-react';
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

  // WhatsApp state
  const [waStatus, setWaStatus] = useState({ connected: false, status: 'disconnected', hasQR: false });
  const [qrCode, setQrCode] = useState(null);
  const [waLoading, setWaLoading] = useState(true);
  const [waAction, setWaAction] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    loadApiKeys();
    checkWhatsAppStatus();

    // Poll WhatsApp status every 5 seconds
    pollRef.current = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(pollRef.current);
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

  const checkWhatsAppStatus = async () => {
    try {
      const res = await getWhatsAppStatus();
      setWaStatus(res.data);

      // QR code vem direto no status response
      if (res.data.qrCode) {
        setQrCode(res.data.qrCode);
      } else {
        setQrCode(null);
      }
    } catch (err) {
      console.error('Erro ao verificar status WhatsApp:', err);
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setWaAction(true);
    try {
      await disconnectWhatsApp();
      toast.success('WhatsApp desconectado');
      await checkWhatsAppStatus();
    } catch (err) {
      toast.error('Erro ao desconectar');
    } finally {
      setWaAction(false);
    }
  };

  const handleReconnect = async () => {
    setWaAction(true);
    try {
      await reconnectWhatsApp();
      toast.success('Reconectando... Aguarde o QR code.');
      setTimeout(checkWhatsAppStatus, 3000);
    } catch (err) {
      toast.error('Erro ao reconectar');
    } finally {
      setWaAction(false);
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

  const statusLabel = {
    disconnected: 'Desconectado',
    initializing: 'Inicializando...',
    qr: 'Aguardando QR Code',
    connecting: 'Conectando...',
    ready: 'Conectado',
    error: 'Erro',
  };

  const statusColor = {
    disconnected: 'text-red-500',
    initializing: 'text-blue-500',
    qr: 'text-yellow-500',
    connecting: 'text-blue-500',
    ready: 'text-green-500',
    error: 'text-red-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie WhatsApp e API keys</p>
      </div>

      {/* WhatsApp Connection Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${waStatus.connected ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Smartphone className={`w-5 h-5 ${waStatus.connected ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">WhatsApp</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {waStatus.connected ? (
                  <Wifi className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-red-500" />
                )}
                <span className={`text-sm font-medium ${statusColor[waStatus.status] || 'text-gray-500'}`}>
                  {statusLabel[waStatus.status] || waStatus.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {waStatus.connected ? (
              <Button size="sm" variant="danger" onClick={handleDisconnect} loading={waAction}>
                <WifiOff className="w-4 h-4" />
                Desconectar
              </Button>
            ) : (
              <Button size="sm" onClick={handleReconnect} loading={waAction}>
                <RefreshCw className="w-4 h-4" />
                Reconectar
              </Button>
            )}
          </div>
        </div>

        {/* QR Code Display */}
        {waStatus.status === 'qr' && qrCode && (
          <div className="flex flex-col items-center py-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="w-5 h-5 text-primary-600" />
              <p className="text-sm font-medium text-gray-700">
                Escaneie o QR Code com seu WhatsApp
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <img src={qrCode} alt="QR Code WhatsApp" className="w-64 h-64" />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Abra o WhatsApp &gt; Menu &gt; Dispositivos conectados &gt; Conectar dispositivo
            </p>
          </div>
        )}

        {/* Initializing state */}
        {waStatus.status === 'initializing' && (
          <div className="flex flex-col items-center py-6 border-t border-gray-100">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Inicializando WhatsApp (pode levar até 30s)...</p>
          </div>
        )}

        {/* Connecting state */}
        {waStatus.status === 'connecting' && (
          <div className="flex flex-col items-center py-6 border-t border-gray-100">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Conectando ao WhatsApp...</p>
          </div>
        )}

        {/* Connected state */}
        {waStatus.connected && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <Wifi className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-700">
                WhatsApp conectado e pronto para enviar mensagens automáticas!
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {waStatus.status === 'error' && (
          <div className="border-t border-gray-100 pt-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700 font-medium">Erro ao conectar WhatsApp</p>
              {waStatus.error && (
                <p className="text-xs text-red-500 mt-1 font-mono">{waStatus.error}</p>
              )}
              <p className="text-xs text-red-400 mt-2">
                Clique em "Reconectar" para tentar novamente.
              </p>
            </div>
          </div>
        )}

        {/* Disconnected - initial state */}
        {waStatus.status === 'disconnected' && !waLoading && (
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <WifiOff className="w-4 h-4 text-yellow-600" />
              <p className="text-sm text-yellow-700">
                WhatsApp desconectado. Clique em "Reconectar" para gerar um novo QR code.
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* API Keys Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">API Keys</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Use API keys para enviar leads via formulário externo
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
              label="Descrição"
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
            description="Crie uma API key para integrar formulários externos"
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
