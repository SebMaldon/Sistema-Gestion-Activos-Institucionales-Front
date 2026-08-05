import React from 'react';
import { useAuthStore } from '../store/auth.store';
import PrestamosForm from '../components/PrestamosForm';

export default function Prestamos() {
  const usuario = useAuthStore((s) => s.usuario);
  const isMaestro = usuario?.id_rol === 1 || usuario?.Rol?.nombre === 'Maestro'; 
  const isAdmin = usuario?.id_rol === 2 || usuario?.Rol?.nombre === 'Administrador';

  if (!isMaestro && !isAdmin) {
    return (
      <div className="p-6 md:p-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-800/50">
          <p className="font-bold">Acceso Denegado</p>
          <p className="text-sm mt-1">
            No tienes los permisos necesarios para acceder a esta sección de préstamos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 md:p-8 animate-fade-in custom-scrollbar overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Préstamos de Bienes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generación y registro de formatos de préstamo de equipo</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 custom-scrollbar overflow-hidden">
        <PrestamosForm />
      </div>
    </div>
  );
}
