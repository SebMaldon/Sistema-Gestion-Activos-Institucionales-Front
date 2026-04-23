import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Info, Network, Settings } from 'lucide-react';
import { useCatTipoUnidades } from '../hooks/useUnidades';

export default function UnidadModal({ isOpen, onClose, unidadToEdit, onSubmit }) {
  const [formData, setFormData] = useState({
    no_ref: '',
    nombre: '',
    ip: '',
    encargado: '',
    telefono: '',
    clave: '',
    tipo_unidad: '',
    bits: '',
    ip_init: '',
    estatus: 1,
    regimen: '',
    vlan: '',
    monitorear: 0,
    proveedor: '',
    fecha_migracion: '',
    velocidad: '',
    tipo_enlace: ''
  });

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'tecnico'
  const [errors, setErrors] = useState({});

  // Catalogs
  const { data: tipoUnidades, isLoading: loadingTipos } = useCatTipoUnidades();
  
  const REGIMENES = [
    { value: 19, label: 'Ordinario (19)' },
    { value: 64, label: 'IMSS-Bienestar (64)' },
    { value: 69, label: 'OPD IMSS-Bienestar (69)' }
  ];

  const ENLACES = [
    { value: 1, label: 'Fibra Óptica (1)' },
    { value: 3, label: 'Satelital (3)' },
    { value: 4, label: 'Microondas (4)' },
    { value: 5, label: 'Cobre / ADSL (5)' }
  ];

  useEffect(() => {
    if (unidadToEdit) {
      setFormData({
        no_ref: unidadToEdit.no_ref ?? '',
        nombre: unidadToEdit.nombre ?? '',
        ip: unidadToEdit.ip ?? '',
        encargado: unidadToEdit.encargado ?? '',
        telefono: unidadToEdit.telefono ?? '',
        clave: unidadToEdit.clave ?? '',
        tipo_unidad: unidadToEdit.tipo_unidad ?? '',
        bits: unidadToEdit.bits ?? '',
        ip_init: unidadToEdit.ip_init ?? '',
        estatus: unidadToEdit.estatus ?? 1,
        regimen: unidadToEdit.regimen ?? '',
        vlan: unidadToEdit.vlan ?? '',
        monitorear: unidadToEdit.monitorear ?? 0,
        proveedor: unidadToEdit.proveedor ?? '',
        fecha_migracion: unidadToEdit.fecha_migracion ? new Date(unidadToEdit.fecha_migracion).toISOString().split('T')[0] : '',
        velocidad: unidadToEdit.velocidad ?? '',
        tipo_enlace: unidadToEdit.tipo_enlace ?? ''
      });
    } else {
      setFormData({
        no_ref: '',
        nombre: '',
        ip: '',
        encargado: '',
        telefono: '',
        clave: '',
        tipo_unidad: '',
        bits: '',
        ip_init: '',
        estatus: 1,
        regimen: '',
        vlan: '',
        monitorear: 0,
        proveedor: '',
        fecha_migracion: '',
        velocidad: '',
        tipo_enlace: ''
      });
    }
    setErrors({});
    setActiveTab('general');
  }, [unidadToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : 
              (type === 'number' ? (value === '' ? '' : parseInt(value)) : value)
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    // Validaciones de Campos Obligatorios
    if (!formData.no_ref.trim()) {
      newErrors.no_ref = 'El número de referencia es obligatorio';
    } else if (formData.no_ref.length > 50) {
      newErrors.no_ref = 'Máximo 50 caracteres';
    }

    if (formData.nombre && formData.nombre.length > 200) {
      newErrors.nombre = 'Máximo 200 caracteres';
    }

    if (!formData.ip.trim()) {
      newErrors.ip = 'La dirección IP es obligatoria';
    } else {
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(formData.ip)) {
        newErrors.ip = 'Formato de IP inválido (ej: 192.168.1.1)';
      }
    }

    if (formData.clave && formData.clave.length > 13) {
      newErrors.clave = 'La clave no puede exceder 13 caracteres';
    }

    if (formData.telefono && formData.telefono.length > 50) {
      newErrors.telefono = 'Máximo 50 caracteres';
    }

    if (formData.proveedor && formData.proveedor.length > 500) {
      newErrors.proveedor = 'Máximo 500 caracteres';
    }

    if (formData.velocidad && formData.velocidad.length > 50) {
      newErrors.velocidad = 'Máximo 50 caracteres';
    }

    // Validaciones Numéricas
    if (formData.bits !== '' && (formData.bits < 0 || formData.bits > 32)) {
      newErrors.bits = 'La máscara (bits) debe estar entre 0 y 32';
    }

    if (formData.vlan !== '' && (formData.vlan < 1 || formData.vlan > 4094)) {
      newErrors.vlan = 'VLAN inválida (1-4094)';
    }

    if (formData.ip_init !== '' && (formData.ip_init < 0 || formData.ip_init > 255)) {
      newErrors.ip_init = 'Debe ser un valor entre 0 y 255';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Clean numeric fields before sending
      const submissionData = { ...formData };
      ['tipo_unidad', 'bits', 'ip_init', 'estatus', 'regimen', 'vlan', 'monitorear', 'tipo_enlace'].forEach(field => {
        if (submissionData[field] === '') {
          delete submissionData[field];
        } else {
          submissionData[field] = parseInt(submissionData[field]);
        }
      });
      
      if (submissionData.fecha_migracion === '') delete submissionData.fecha_migracion;

      onSubmit(submissionData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{unidadToEdit ? 'Editar Unidad' : 'Nueva Unidad'}</h2>
            <p className="text-sm text-gray-500">Gestión de datos de unidades operativas.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Info size={16} /> Datos Generales
          </button>
          <button 
            onClick={() => setActiveTab('tecnico')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'tecnico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Network size={16} /> Detalles Técnicos
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="unidad-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">No. Referencia *</label>
                  <input
                    type="text"
                    name="no_ref"
                    value={formData.no_ref}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder="Ej: UNID-001"
                    className={`w-full px-3 py-2 text-sm border ${errors.no_ref ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.no_ref && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.no_ref}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Unidad</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    maxLength={200}
                    placeholder="Nombre descriptivo..."
                    className={`w-full px-3 py-2 text-sm border ${errors.nombre ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.nombre && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.nombre}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección IP *</label>
                  <input
                    type="text"
                    name="ip"
                    value={formData.ip}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="192.168.1.1"
                    className={`w-full px-3 py-2 text-sm border ${errors.ip ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.ip && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.ip}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clave de Unidad</label>
                  <input
                    type="text"
                    name="clave"
                    value={formData.clave}
                    onChange={handleChange}
                    maxLength={13}
                    placeholder="Clave interna..."
                    className={`w-full px-3 py-2 text-sm border ${errors.clave ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.clave && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.clave}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Encargado</label>
                  <input
                    type="text"
                    name="encargado"
                    value={formData.encargado}
                    onChange={handleChange}
                    placeholder="Nombre completo..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder="55-0000-0000"
                    className={`w-full px-3 py-2 text-sm border ${errors.telefono ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.telefono && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.telefono}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Estatus</label>
                  <select
                    name="estatus"
                    value={formData.estatus}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>Activa</option>
                    <option value={0}>Inactiva</option>
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    name="proveedor"
                    value={formData.proveedor}
                    onChange={handleChange}
                    maxLength={500}
                    placeholder="Proveedor de servicios..."
                    className={`w-full px-3 py-2 text-sm border ${errors.proveedor ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.proveedor && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.proveedor}</p>}
                </div>
              </div>
            )}

            {activeTab === 'tecnico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Unidad</label>
                  <select
                    name="tipo_unidad"
                    value={formData.tipo_unidad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={loadingTipos}
                  >
                    <option value="">-- Seleccionar Tipo --</option>
                    {tipoUnidades?.map(t => (
                      <option key={t.id_tipo} value={t.id_tipo}>{t.tipo_unidad}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bits (Mascara)</label>
                  <input
                    type="number"
                    name="bits"
                    value={formData.bits}
                    onChange={handleChange}
                    min="0"
                    max="32"
                    placeholder="Ej: 24, 25, 26"
                    className={`w-full px-3 py-2 text-sm border ${errors.bits ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.bits && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.bits}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">IP Inicial (Octeto)</label>
                  <input
                    type="number"
                    name="ip_init"
                    value={formData.ip_init}
                    onChange={handleChange}
                    min="0"
                    max="255"
                    placeholder="Ej: 1"
                    className={`w-full px-3 py-2 text-sm border ${errors.ip_init ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.ip_init && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.ip_init}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">VLAN</label>
                  <input
                    type="number"
                    name="vlan"
                    value={formData.vlan}
                    onChange={handleChange}
                    min="1"
                    max="4094"
                    placeholder="Ej: 55"
                    className={`w-full px-3 py-2 text-sm border ${errors.vlan ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.vlan && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.vlan}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Régimen</label>
                  <select
                    name="regimen"
                    value={formData.regimen}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Seleccionar Régimen --</option>
                    {REGIMENES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Velocidad</label>
                  <input
                    type="text"
                    name="velocidad"
                    value={formData.velocidad}
                    onChange={handleChange}
                    maxLength={50}
                    placeholder="Ej: 100 Mbps"
                    className={`w-full px-3 py-2 text-sm border ${errors.velocidad ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.velocidad && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.velocidad}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Enlace</label>
                  <select
                    name="tipo_enlace"
                    value={formData.tipo_enlace}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Seleccionar Enlace --</option>
                    {ENLACES.map(e => (
                      <option key={e.value} value={e.value}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Migración</label>
                  <input
                    type="date"
                    name="fecha_migracion"
                    value={formData.fecha_migracion}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input
                    type="checkbox"
                    id="monitorear"
                    name="monitorear"
                    checked={formData.monitorear === 1}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="monitorear" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    Habilitar Monitoreo
                    <Settings size={14} className="text-gray-400" />
                  </label>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            form="unidad-form"
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200"
          >
            <Save size={16} />
            {unidadToEdit ? 'Actualizar Unidad' : 'Guardar Unidad'}
          </button>
        </div>
      </div>
    </div>
  );
}
