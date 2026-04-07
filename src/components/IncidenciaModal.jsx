import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Save, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

// Datos simulados (Mocks) mientras conectas el backend
const mockTipos = [
    { id: 1, nombre: 'Hardware' },
    { id: 2, nombre: 'Software' },
    { id: 3, nombre: 'Redes e Internet' }
];

const mockUnidades = ['Almacén General Delegacional', 'Hospital General de Zona No. 1', 'UMF No. 24'];
const mockTecnicos = [{ id: 101, nombre: 'Ing. Carlos Mendoza' }, { id: 102, nombre: 'Lic. Ana Torres' }];

export default function IncidenciaModal({ isOpen, onClose }) {
    const usuarioLogueado = useAuthStore((s) => s.usuario) || { matricula: 'ABC12345', nombre: 'Juan Becerra' };

    // --- ESTADOS DEL FORMULARIO ---
    const [tipoIncidencia, setTipoIncidencia] = useState('');
    const [nuevoTipo, setNuevoTipo] = useState('');
    const [isAddingTipo, setIsAddingTipo] = useState(false);

    const [numSerie, setNumSerie] = useState('');
    const [equipoEncontrado, setEquipoEncontrado] = useState(null);

    const [reportanteManual, setReportanteManual] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [unidad, setUnidad] = useState('');
    const [estatus, setEstatus] = useState('Pendiente');

    // Fechas y horas automáticas
    const [fechaCreacion, setFechaCreacion] = useState('');
    const [horaCreacion, setHoraCreacion] = useState('');

    // Campos condicionales
    const [notaSeguimiento, setNotaSeguimiento] = useState('');
    const [tecnicoResuelve, setTecnicoResuelve] = useState('');
    const [resolucion, setResolucion] = useState('');
    const [fechaFinalizacion, setFechaFinalizacion] = useState('');

    // Inicializar fecha y hora al abrir el modal
    useEffect(() => {
        if (isOpen) {
            const now = new Date();
            setFechaCreacion(now.toISOString().split('T')[0]); // YYYY-MM-DD
            setHoraCreacion(now.toTimeString().split(' ')[0].substring(0, 5)); // HH:MM
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- LÓGICA DE SIMULACIÓN ---
    const handleBuscarSerie = () => {
        if (!numSerie.trim()) return;

        // Simulamos una búsqueda exitosa en la BD
        const dataEquipo = {
            nni: '12345-67890',
            dispositivo: 'Impresora Multifuncional',
            marca: 'HP',
            modelo: 'OfficeJet Pro 9015',
            unidad: 'Hospital General de Zona No. 1',
            ubicacion: 'Área de Urgencias',
            tecnicoAsignado: 'Ing. Carlos Mendoza'
        };

        setEquipoEncontrado(dataEquipo);

        // Auto-llenamos el campo "Unidad" del formulario para ahorrar tiempo al usuario
        if (dataEquipo.unidad) {
            setUnidad(dataEquipo.unidad);
        }
    };

    const handleGuardar = (e) => {
        e.preventDefault();
        // Validar fecha de finalización
        if (estatus === 'Finalizado' && fechaFinalizacion < fechaCreacion) {
            alert('La fecha de finalización no puede ser menor a la fecha de creación.');
            return;
        }

        console.log("Guardando incidencia...", {
            tipoIncidencia: isAddingTipo ? nuevoTipo : tipoIncidencia,
            id_bien: equipoEncontrado?.nni,
            matriculaGenera: usuarioLogueado.matricula,
            reportanteManual,
            descripcion,
            estatus,
            notaSeguimiento: estatus === 'En revisión' ? notaSeguimiento : null,
            tecnicoResuelve: estatus === 'Finalizado' ? tecnicoResuelve : null,
            resolucion: estatus === 'Finalizado' ? resolucion : null,
            fechaFinalizacion: estatus === 'Finalizado' ? fechaFinalizacion : null,
            unidad
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

                {/* HEADER */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Crear Nueva Incidencia</h2>
                        <p className="text-sm text-gray-500">Completa los datos para generar el reporte de servicio.</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* BODY CON SCROLL */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    <form id="incidencia-form" onSubmit={handleGuardar} className="space-y-8">

                        {/* SECCIÓN 1: Identificación del Equipo */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                                Identificación del Equipo
                            </h3>

                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Número de Serie</label>
                                    <input
                                        type="text"
                                        value={numSerie}
                                        onChange={(e) => setNumSerie(e.target.value)}
                                        placeholder="Ingrese el número de serie..."
                                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleBuscarSerie}
                                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 flex items-center gap-2"
                                >
                                    <Search size={16} /> Buscar
                                </button>
                            </div>

                            {/* Tarjeta de Equipo Encontrado (Solo Lectura) */}
                            {equipoEncontrado && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-4 p-5 bg-gray-50 rounded-xl border border-gray-200 text-sm mt-2 fade-in">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">N.N.I.</p>
                                        <p className="font-semibold text-gray-800">{equipoEncontrado.nni}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Dispositivo</p>
                                        <p className="font-semibold text-gray-800">{equipoEncontrado.dispositivo}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Unidad</p>
                                        <p className="font-semibold text-blue-700">{equipoEncontrado.unidad}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Marca</p>
                                        <p className="font-semibold text-gray-800">{equipoEncontrado.marca}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Modelo</p>
                                        <p className="font-semibold text-gray-800">{equipoEncontrado.modelo}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-0.5">Ubicación / Área</p>
                                        <p className="font-semibold text-gray-800">{equipoEncontrado.ubicacion}</p>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* SECCIÓN 2: Detalles del Reporte */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
                                Detalles del Reporte
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                {/* Tipo de Incidencia con opción de agregar */}
                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Incidencia</label>
                                    {!isAddingTipo ? (
                                        <select
                                            value={tipoIncidencia}
                                            onChange={(e) => {
                                                if (e.target.value === 'nuevo') setIsAddingTipo(true);
                                                else setTipoIncidencia(e.target.value);
                                            }}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            required
                                        >
                                            <option value="">Seleccione un tipo...</option>
                                            {mockTipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                            <option value="nuevo" className="font-bold text-blue-600">+ Agregar nuevo tipo...</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={nuevoTipo}
                                                onChange={(e) => setNuevoTipo(e.target.value)}
                                                placeholder="Escriba el nuevo tipo..."
                                                className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                autoFocus
                                                required
                                            />
                                            <button type="button" onClick={() => setIsAddingTipo(false)} className="text-xs text-red-500 hover:underline px-1">
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Matrícula (Genera Reporte)</label>
                                    <input type="text" value={usuarioLogueado.matricula} readOnly className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Matrícula Usuario Afectado (Reportante)</label>
                                    <input type="text" value={reportanteManual} onChange={(e) => setReportanteManual(e.target.value)} placeholder="Nombre de quien reporta" required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>

                                <div className="md:col-span-3">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Descripción de la Falla</label>
                                    <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows="3" placeholder="Describa detalladamente el problema..." required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidad</label>
                                    <select value={unidad} onChange={(e) => setUnidad(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="">Seleccione unidad...</option>
                                        {mockUnidades.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha</label>
                                    <input type="date" value={fechaCreacion} onChange={(e) => setFechaCreacion(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                                </div>

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hora (24 hrs)</label>
                                    <input type="time" value={horaCreacion} onChange={(e) => setHoraCreacion(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* SECCIÓN 3: Estatus y Resolución */}
                        <section className="space-y-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                                <div className="md:col-span-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Estatus</label>
                                    <select value={estatus} onChange={(e) => setEstatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold">
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En revisión">En revisión</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Técnico Asignado (Por defecto)</label>
                                    <input type="text" value={equipoEncontrado?.tecnicoAsignado || 'Por asignar...'} readOnly className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed" />
                                </div>

                                {/* CONDICIONAL: EN REVISIÓN */}
                                {estatus === 'En revisión' && (
                                    <div className="md:col-span-3 fade-in mt-2">
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                                            <Plus size={14} className="text-blue-500" /> Notas de Seguimiento (Opcional)
                                        </label>
                                        <textarea value={notaSeguimiento} onChange={(e) => setNotaSeguimiento(e.target.value)} rows="2" placeholder="Agregue avances o notas sobre la revisión..." className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white" />
                                    </div>
                                )}

                                {/* CONDICIONAL: FINALIZADO */}
                                {estatus === 'Finalizado' && (
                                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5 fade-in mt-2 border-t border-blue-200 pt-4">
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Personal que resolvió</label>
                                            <select value={tecnicoResuelve} onChange={(e) => setTecnicoResuelve(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white">
                                                <option value="">Seleccione técnico...</option>
                                                {mockTecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                            </select>
                                        </div>

                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fecha de Finalización</label>
                                            <input type="date" min={fechaCreacion} value={fechaFinalizacion} onChange={(e) => setFechaFinalizacion(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Detalles de la Resolución</label>
                                            <textarea value={resolucion} onChange={(e) => setResolucion(e.target.value)} rows="3" placeholder="Describa cómo se solucionó el problema..." required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none bg-white" />
                                        </div>
                                    </div>
                                )}

                            </div>
                        </section>
                    </form>
                </div>

                {/* FOOTER */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="incidencia-form"
                        disabled={!equipoEncontrado}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={16} />
                        Finalizar y Guardar
                    </button>
                </div>

            </div>
        </div>
    );
}