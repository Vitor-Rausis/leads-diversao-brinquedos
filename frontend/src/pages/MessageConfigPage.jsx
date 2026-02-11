import { useState, useEffect } from 'react';
import { configApi } from '../api/configApi';
import toast from 'react-hot-toast';
import { Save, Clock, Calendar, MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';

const tipoLabels = {
  dia_3: 'Primeira Mensagem',
  dia_7: 'Segunda Mensagem',
  mes_10: 'Terceira Mensagem (Reengajamento)',
};

export default function MessageConfigPage() {
  const [scheduleConfigs, setScheduleConfigs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const [scheduleRes, templatesRes] = await Promise.all([
        configApi.getSchedule(),
        configApi.getTemplates(),
      ]);
      setScheduleConfigs(scheduleRes.data || []);
      setTemplates(templatesRes.data || []);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleChange = (tipo, field, value) => {
    setScheduleConfigs(prev =>
      prev.map(config =>
        config.tipo === tipo ? { ...config, [field]: value } : config
      )
    );
  };

  const handleTemplateChange = (tipo, conteudo) => {
    setTemplates(prev =>
      prev.map(template =>
        template.tipo === tipo ? { ...template, conteudo } : template
      )
    );
  };

  const handleSaveSchedule = async () => {
    try {
      setSaving(true);
      await configApi.updateSchedule(scheduleConfigs);
      toast.success('Agendamentos salvos com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar agendamentos');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async (tipo) => {
    try {
      const template = templates.find(t => t.tipo === tipo);
      if (!template) return;

      await configApi.updateTemplate(tipo, template.conteudo);
      toast.success('Template salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar template');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuração de Mensagens</h1>
        <p className="text-gray-600">Configure os dias, horários e conteúdo das mensagens automáticas</p>
      </div>

      {/* Configuracoes de Agendamento */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Agendamento de Envio
          </h2>
          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Agendamentos'}
          </button>
        </div>

        <div className="space-y-4">
          {scheduleConfigs.map((config) => (
            <div
              key={config.tipo}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">
                  {tipoLabels[config.tipo] || config.tipo}
                </h3>
                <button
                  onClick={() => handleScheduleChange(config.tipo, 'ativo', !config.ativo)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    config.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {config.ativo ? (
                    <>
                      <ToggleRight className="w-4 h-4" /> Ativo
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-4 h-4" /> Inativo
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Dias após cadastro
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.dias}
                    onChange={(e) =>
                      handleScheduleChange(config.tipo, 'dias', parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {config.dias === 1 ? '1 dia' : `${config.dias} dias`} após o cadastro do lead
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Horário de envio
                  </label>
                  <input
                    type="time"
                    value={config.hora?.substring(0, 5) || '09:00'}
                    onChange={(e) =>
                      handleScheduleChange(config.tipo, 'hora', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Templates de Mensagem */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          Templates de Mensagem
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Use <code className="bg-gray-100 px-1 rounded">{'{{nome}}'}</code> para inserir o nome do lead automaticamente.
        </p>

        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.tipo}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">
                  {tipoLabels[template.tipo] || template.tipo}
                </h3>
                <button
                  onClick={() => handleSaveTemplate(template.tipo)}
                  className="flex items-center gap-1 px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                  Salvar
                </button>
              </div>

              <textarea
                value={template.conteudo}
                onChange={(e) => handleTemplateChange(template.tipo, e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Digite o template da mensagem..."
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
