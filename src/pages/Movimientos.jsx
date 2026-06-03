import React from 'react';
import SalidasForm from '../components/SalidasForm';
import { useAuthStore } from '../store/auth.store';
import { AlertCircle } from 'lucide-react';

export default function Movimientos() {
  const usuario = useAuthStore((s) => s.usuario);
  const isStandardUser = usuario?.id_rol === 3;
  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in h-full flex flex-col">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Salidas de Bienes</h1>
        <p className="text-sm text-gray-500 mt-1">Generación de formatos de salida de equipo</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-10">
        {isStandardUser ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center h-full">
            <AlertCircle size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Acceso de solo lectura</h2>
            <p className="text-gray-500 max-w-md">
              Como usuario estándar, no tienes los permisos necesarios para generar o registrar formatos de salida de bienes.
            </p>
          </div>
        ) : (
          <SalidasForm />
        )}
      </div>
    </div>
  );
}
