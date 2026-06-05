import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function SinAcceso() {
  const logout = useAuthStore(s => s.logout);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center fade-in">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={40} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
        <p className="text-gray-500 mb-8">
          Tu cuenta no tiene los permisos necesarios para acceder al sistema. Por favor contacta al administrador.
        </p>
        <button 
          onClick={() => logout()}
          className="w-full py-3 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-colors shadow-sm"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
