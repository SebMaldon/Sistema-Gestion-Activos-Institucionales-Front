import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

// Mocks simulados (reemplazarás con los que vengan de tu BD)
const mockTecnicos = [
    { id: 101, nombre: 'Ing. Carlos Mendoza' },
    { id: 102, nombre: 'Lic. Ana Torres' }
];

export default function ResolucionModal({ isOpen, onClose, onConfirm, incidenciaId }) {
    const [tecnicoResuelve, setTecnicoResuelve] = useState('');
    const [resolucion, setResolucion] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        // Pasamos los datos al componente padre (Incidencias.jsx)
        onConfirm(incidenciaId, {
            tecnicoResuelve,
            resolucion,
            fechaResolucion: new Date().toISOString() // Genera la fecha actual automáticamente
        });

        // Limpiamos los campos para la próxima vez
        setTecnicoResuelve('');
        setResolucion('');
    };

    const handleCerrar = () => {
        setTecnicoResuelve('');
        setResolucion('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-green-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Finalizar Incidencia</h2>
                            <p className="text-xs text-gray-500">ID: {incidenciaId}</p>
                        </div>
                    </div>
                    <button onClick={handleCerrar} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <form id="resolucion-form" onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Personal que resolvió <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={tecnicoResuelve}
                            onChange={(e) => setTecnicoResuelve(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        >
                            <option value="">Seleccione al técnico...</option>
                            {mockTecnicos.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            Detalles de la Resolución <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={resolucion}
                            onChange={(e) => setResolucion(e.target.value)}
                            rows="4"
                            placeholder="Describa detalladamente cómo se solucionó la falla, piezas cambiadas, etc..."
                            required
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        />
                    </div>
                </form>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleCerrar}
                        className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="resolucion-form"
                        className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle size={16} />
                        Marcar como Resuelto
                    </button>
                </div>

            </div>
        </div>
    );
}