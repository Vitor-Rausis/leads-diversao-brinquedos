import { Menu } from 'lucide-react';

export default function Header({ onMenuClick, title }) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden text-gray-500 hover:text-gray-700"
      >
        <Menu className="w-6 h-6" />
      </button>
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
    </header>
  );
}
