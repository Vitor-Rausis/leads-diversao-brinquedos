import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { importLeads } from '../../api/leadApi';
import toast from 'react-hot-toast';

export default function LeadImport({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    onDrop: (accepted) => {
      if (accepted.length > 0) {
        setFile(accepted[0]);
        setResult(null);
      }
    },
  });

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await importLeads(formData);
      setResult(res.data);
      toast.success(res.data.message);
      onSuccess?.();
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.errors) {
        setResult({ errors: errorData.errors });
      }
      toast.error(errorData?.error || 'Erro ao importar');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Importar Leads" size="md">
      <div className="space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-400 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          {file ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
              <FileSpreadsheet className="w-5 h-5 text-success-500" />
              {file.name}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Arraste o arquivo aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-400 mt-1">CSV ou Excel (.xlsx, .xls)</p>
            </>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-700 mb-1">Formato esperado:</p>
          <p className="text-xs text-gray-500">
            Colunas: <strong>nome</strong>, <strong>whatsapp</strong> (obrigatorias),{' '}
            <strong>observacoes</strong> (opcional)
          </p>
        </div>

        {result?.errors?.length > 0 && (
          <div className="bg-danger-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-danger-600 mb-1">
              <AlertCircle className="w-4 h-4" />
              {result.errors.length} linha(s) com erro
            </div>
            <div className="max-h-32 overflow-y-auto">
              {result.errors.map((err, i) => (
                <p key={i} className="text-xs text-danger-500">
                  Linha {err.row}: {err.reason}
                </p>
              ))}
            </div>
          </div>
        )}

        {result?.imported && (
          <div className="bg-success-50 rounded-lg p-3 text-sm text-success-600">
            {result.imported} leads importados com sucesso!
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            Fechar
          </Button>
          <Button onClick={handleImport} loading={loading} disabled={!file}>
            Importar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
