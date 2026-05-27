import React from 'react';
import SalidasForm from '../components/SalidasForm';

export default function Movimientos() {
  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in h-full flex flex-col">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Salidas de Bienes</h1>
        <p className="text-sm text-gray-500 mt-1">Generación de formatos de salida de equipo</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pb-10">
        <SalidasForm />
      </div>
    </div>
  );
}
