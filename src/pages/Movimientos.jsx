import React, { useState, useRef } from 'react';
import SalidasForm from '../components/SalidasForm';
import HistorialSalidas from '../components/HistorialSalidas';
import HistorialSalidasAntiguas from '../components/HistorialSalidasAntiguas';
import { useAuthStore } from '../store/auth.store';
import { AlertCircle, FileText, History, Archive, RefreshCw, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

export default function Movimientos() {
  const _usuario = useAuthStore((s) => s.usuario);
  const isStandardUser = false; // usuario?.id_rol === 3; // Permiso total concedido a usuarios estándar
  const [activeTab, setActiveTab] = useState('generar');
  const historialRef = useRef(null);
  const historialAntiguoRef = useRef(null);
  const [activeActions, setActiveActions] = useState({ isLoading: false, isExporting: false });

  const handleTabChange = (val) => {
    setActiveTab(val);
    setActiveActions({ isLoading: false, isExporting: false });
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in h-full flex flex-col">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Salidas de Bienes</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generación y registro de salidas de equipo</p>
        </div>

        {(activeTab === 'historial' || activeTab === 'historial_antiguo') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (activeTab === 'historial') historialRef.current?.refetch?.();
                if (activeTab === 'historial_antiguo') historialAntiguoRef.current?.refetch?.();
              }}
              title="Refrescar"
              className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <RefreshCw size={16} className={activeActions.isLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => {
                if (activeTab === 'historial') historialRef.current?.handleExportExcel?.();
                if (activeTab === 'historial_antiguo') historialAntiguoRef.current?.handleExportExcel?.();
              }}
              disabled={activeActions.isExporting}
              className="flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #107c41, #185c37)' }}
              title="Exportar listado actual a Excel"
            >
              {activeActions.isExporting ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
              <span className="hidden sm:inline">Exportar a Excel</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0 pb-10">
        {isStandardUser ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col items-center justify-center text-center h-full">
            <AlertCircle size={48} className="text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Acceso de solo lectura</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Como usuario estándar, no tienes los permisos necesarios para generar o registrar formatos de salida de bienes.
            </p>
          </div>
        ) : (
          <Tabs.Root value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full">
            <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6 flex-wrap">
              <Tabs.Trigger
                value="generar"
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative
                  ${activeTab === 'generar' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                `}
              >
                <FileText size={16} />
                Generar Salida
                {activeTab === 'generar' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
                )}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="historial"
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative
                  ${activeTab === 'historial' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                `}
              >
                <History size={16} />
                Historial de Salidas
                {activeTab === 'historial' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
                )}
              </Tabs.Trigger>
              <Tabs.Trigger
                value="historial_antiguo"
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative
                  ${activeTab === 'historial_antiguo' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
                `}
              >
                <Archive size={16} />
                Salidas Antiguas (Consulta)
                {activeTab === 'historial_antiguo' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
                )}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="generar" className="flex-1 min-h-0 overflow-y-auto pr-1">
              <SalidasForm />
            </Tabs.Content>
            <Tabs.Content value="historial" className="flex-1 min-h-0 overflow-y-auto pr-1">
              <HistorialSalidas ref={historialRef} onStatusChange={setActiveActions} />
            </Tabs.Content>
            <Tabs.Content value="historial_antiguo" className="flex-1 min-h-0 overflow-y-auto pr-1">
              <HistorialSalidasAntiguas ref={historialAntiguoRef} onStatusChange={setActiveActions} />
            </Tabs.Content>
          </Tabs.Root>
        )}
 </div>
 </div>
 );
}
