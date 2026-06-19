import React, { useState } from 'react';
import SalidasForm from '../components/SalidasForm';
import HistorialSalidas from '../components/HistorialSalidas';
import { useAuthStore } from '../store/auth.store';
import { AlertCircle, FileText, History } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

export default function Movimientos() {
 const usuario = useAuthStore((s) => s.usuario);
 const isStandardUser = usuario?.id_rol === 3;
 const [activeTab, setActiveTab] = useState('generar');

 return (
 <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in h-full flex flex-col">
 <div>
 <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 ">Salidas de Bienes</h1>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generación y registro de salidas de equipo</p>
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
 <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
 <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
 <Tabs.Trigger
 value="generar"
 className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-colors relative
 ${activeTab === 'generar' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}
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
 ${activeTab === 'historial' ? 'text-teal-700 dark:text-teal-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 '}
 `}
 >
 <History size={16} />
 Historial de Salidas
 {activeTab === 'historial' && (
 <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full" />
 )}
 </Tabs.Trigger>
 </Tabs.List>

 <Tabs.Content value="generar" className="flex-1 min-h-0 overflow-y-auto pr-1">
 <SalidasForm />
 </Tabs.Content>
 <Tabs.Content value="historial" className="flex-1 min-h-0 overflow-y-auto pr-1">
 <HistorialSalidas />
 </Tabs.Content>
 </Tabs.Root>
 )}
 </div>
 </div>
 );
}
