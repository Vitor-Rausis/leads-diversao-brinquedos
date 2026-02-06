import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200">404</h1>
        <p className="text-lg text-gray-600 mt-2">Pagina nao encontrada</p>
        <Button className="mt-6" onClick={() => navigate('/dashboard')}>
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  );
}
