import React, { useState, useEffect } from 'react';
import { X, Save, Info, MapPin, Phone, Settings, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCatTipoUnidades } from '../hooks/useUnidades';

export default function InmuebleModal({ isOpen, onClose, inmuebleToEdit, onSubmit, isLoading }) {
  const { showToast } = useApp();
  const [formData, setFormData] = useState({
    clave: '',
    descripcion: '',
    desc_corta: '',
    encargado: '',
    direccion: '',
    calle: '',
    numero: '',
    colonia: '',
    ciudad: '',
    municipio: '',
    cp: '',
    ppal: '',
    clave_zona: '',
    clave_a: '',
    telefono: '',
    zona_reporte: '',
    nivel: '',
    no_inmueble: '',
    regimen: '',
    tipo_unidad: ''
  });

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'ubicacion' | 'tecnico'
  const [errors, setErrors] = useState({});

  // Catalogs for consistency (Using the ones from Unidades)
  const { data: tipoUnidades, isLoading: loadingTipos } = useCatTipoUnidades();
  

  useEffect(() => {
    if (inmuebleToEdit) {
      setFormData({
        clave: inmuebleToEdit.clave ?? '',
        descripcion: inmuebleToEdit.descripcion ?? '',
        desc_corta: inmuebleToEdit.desc_corta ?? '',
        encargado: inmuebleToEdit.encargado ?? '',
        direccion: inmuebleToEdit.direccion ?? '',
        calle: inmuebleToEdit.calle ?? '',
        numero: inmuebleToEdit.numero ?? '',
        colonia: inmuebleToEdit.colonia ?? '',
        ciudad: inmuebleToEdit.ciudad ?? '',
        municipio: inmuebleToEdit.municipio ?? '',
        cp: inmuebleToEdit.cp ?? '',
        ppal: inmuebleToEdit.ppal ?? '',
        clave_zona: inmuebleToEdit.clave_zona ?? '',
        clave_a: inmuebleToEdit.clave_a ?? '',
        telefono: inmuebleToEdit.telefono ?? '',
        zona_reporte: inmuebleToEdit.zona_reporte ?? '',
        nivel: inmuebleToEdit.nivel ?? '',
        no_inmueble: inmuebleToEdit.no_inmueble ?? '',
        regimen: inmuebleToEdit.regimen ?? '',
        tipo_unidad: inmuebleToEdit.tipo_unidad ?? ''
      });
    } else {
      setFormData({
        clave: '',
        descripcion: '',
        desc_corta: '',
        encargado: '',
        direccion: '',
        calle: '',
        numero: '',
        colonia: '',
        ciudad: '',
        municipio: '',
        cp: '',
        ppal: '',
        clave_zona: '',
        clave_a: '',
        telefono: '',
        zona_reporte: '',
        nivel: '',
        no_inmueble: '',
        regimen: '',
        tipo_unidad: ''
      });
    }
    setErrors({});
    setActiveTab('general');
  }, [inmuebleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value)) : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!formData.clave.trim()) newErrors.clave = 'La clave es obligatoria';
    else if (formData.clave.length > 50) newErrors.clave = 'Máximo 50 caracteres';

    if (!formData.clave_zona.trim()) newErrors.clave_zona = 'La clave de zona es obligatoria';
    else if (formData.clave_zona.length > 5) newErrors.clave_zona = 'Máximo 5 caracteres';

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'La descripción es obligatoria';
    } else if (formData.descripcion.length > 100) {
      newErrors.descripcion = 'Máximo 100 caracteres';
    }

    if (!formData.tipo_unidad) {
      newErrors.tipo_unidad = 'Debes seleccionar un tipo de unidad';
    }

    if (formData.desc_corta && formData.desc_corta.length > 15) newErrors.desc_corta = 'Máximo 15 caracteres';
    if (formData.encargado && formData.encargado.length > 200) newErrors.encargado = 'Máximo 200 caracteres';
    if (formData.direccion && formData.direccion.length > 200) newErrors.direccion = 'Máximo 200 caracteres';
    if (formData.calle && formData.calle.length > 70) newErrors.calle = 'Máximo 70 caracteres';
    if (formData.numero && formData.numero.length > 5) newErrors.numero = 'Máximo 5 caracteres';
    if (formData.colonia && formData.colonia.length > 50) newErrors.colonia = 'Máximo 50 caracteres';
    if (formData.ciudad && formData.ciudad.length > 50) newErrors.ciudad = 'Máximo 50 caracteres';
    if (formData.municipio && formData.municipio.length > 50) newErrors.municipio = 'Máximo 50 caracteres';
    if (formData.cp && formData.cp.length > 50) newErrors.cp = 'Máximo 50 caracteres';
    
    if (formData.telefono) {
      const telRegex = /^[0-9\s\-()+]+$/;
      if (!telRegex.test(formData.telefono)) {
        newErrors.telefono = 'Formato de teléfono inválido';
      } else if (formData.telefono.length > 18) {
        newErrors.telefono = 'Máximo 18 caracteres';
      }
    }

    setErrors(newErrors);
    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    };
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const { isValid, errors: currentErrors } = validate();

    if (isValid) {
      const submissionData = { ...formData };
      // Convert numeric fields
      ['clave_a', 'nivel', 'no_inmueble', 'tipo_unidad'].forEach(field => {
        if (submissionData[field] === '' || submissionData[field] === null) {
          submissionData[field] = null;
        } else {
          submissionData[field] = parseInt(submissionData[field]);
        }
      });
      onSubmit(submissionData);
    } else {
      showToast('Por favor, revisa los errores en el formulario', 'error');
      
      const generalFields = ['clave', 'descripcion', 'desc_corta', 'encargado'];
      const locationFields = ['direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp', 'telefono'];
      
      const hasGeneralErrors = generalFields.some(f => !!currentErrors[f]);
      const hasLocationErrors = locationFields.some(f => !!currentErrors[f]);
      const hasTechnicalErrors = Object.keys(currentErrors).some(f => !generalFields.includes(f) && !locationFields.includes(f));

      if (activeTab === 'general' && (hasLocationErrors || hasTechnicalErrors) && !hasGeneralErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasLocationErrors ? 'Ubicación' : ''} ${hasTechnicalErrors ? 'Técnico' : ''})`, 'info');
      } else if (activeTab === 'ubicacion' && (hasGeneralErrors || hasTechnicalErrors) && !hasLocationErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasGeneralErrors ? 'General' : ''} ${hasTechnicalErrors ? 'Técnico' : ''})`, 'info');
      } else if (activeTab === 'tecnico' && (hasGeneralErrors || hasLocationErrors) && !hasTechnicalErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasGeneralErrors ? 'General' : ''} ${hasLocationErrors ? 'Ubicación' : ''})`, 'info');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{inmuebleToEdit ? 'Editar Inmueble' : 'Nuevo Inmueble'}</h2>
            <p className="text-sm text-gray-500">Gestión de datos de inmuebles (Catálogo Legacy).</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button 
            onClick={() => setActiveTab('general')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Info size={16} /> 
            Datos Generales
            {Object.keys(errors).some(f => ['clave', 'descripcion', 'desc_corta', 'encargado'].includes(f)) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('ubicacion')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'ubicacion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin size={16} /> 
            Ubicación y Contacto
            {Object.keys(errors).some(f => ['direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp', 'telefono'].includes(f)) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('tecnico')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'tecnico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Settings size={16} /> 
            Datos Técnicos
            {Object.keys(errors).some(f => !['clave', 'descripcion', 'desc_corta', 'encargado', 'direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp', 'telefono'].includes(f)) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="inmueble-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clave *</label>
                  <input
                    type="text"
                    name="clave"
                    value={formData.clave}
                    onChange={handleChange}
                    disabled={!!inmuebleToEdit}
                    placeholder="Ej: INM-001"
                    className={`w-full px-3 py-2 text-sm border ${errors.clave ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${inmuebleToEdit ? 'bg-gray-50' : ''}`}
                  />
                  {errors.clave && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.clave}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Descripción *</label>
                  <input
                    type="text"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Descripción completa..."
                    className={`w-full px-3 py-2 text-sm border ${errors.descripcion ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.descripcion && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.descripcion}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Descripción Corta</label>
                  <input
                    type="text"
                    name="desc_corta"
                    value={formData.desc_corta}
                    onChange={handleChange}
                    maxLength={15}
                    placeholder="Máx 15 carac."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Encargado</label>
                  <input
                    type="text"
                    name="encargado"
                    value={formData.encargado}
                    onChange={handleChange}
                    placeholder="Nombre del responsable..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'ubicacion' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dirección Completa</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    placeholder="Calle, número, colonia..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Calle</label>
                  <input
                    type="text"
                    name="calle"
                    value={formData.calle}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Número</label>
                  <input
                    type="text"
                    name="numero"
                    value={formData.numero}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Colonia</label>
                  <input
                    type="text"
                    name="colonia"
                    value={formData.colonia}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">C.P.</label>
                  <input
                    type="text"
                    name="cp"
                    value={formData.cp}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Municipio</label>
                  <input
                    type="text"
                    name="municipio"
                    value={formData.municipio}
                    onChange={handleChange}
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
                    placeholder="18 carac. máx"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'tecnico' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clave Zona *</label>
                  <input
                    type="text"
                    name="clave_zona"
                    value={formData.clave_zona}
                    onChange={handleChange}
                    maxLength={5}
                    placeholder="Ej: 001"
                    className={`w-full px-3 py-2 text-sm border ${errors.clave_zona ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                  />
                  {errors.clave_zona && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.clave_zona}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clave A</label>
                  <input
                    type="number"
                    name="clave_a"
                    value={formData.clave_a}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nivel</label>
                  <input
                    type="number"
                    name="nivel"
                    value={formData.nivel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">No. Inmueble</label>
                  <input
                    type="number"
                    name="no_inmueble"
                    value={formData.no_inmueble}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Unidad *</label>
                  <select
                    name="tipo_unidad"
                    value={formData.tipo_unidad}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 text-sm border ${errors.tipo_unidad ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                    disabled={loadingTipos}
                  >
                    <option value="">-- Seleccionar Tipo --</option>
                    {tipoUnidades?.map(t => (
                      <option key={t.id_tipo} value={t.id_tipo}>{t.tipo_unidad}</option>
                    ))}
                  </select>
                  {errors.tipo_unidad && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors.tipo_unidad}</p>}
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Régimen</label>
                  <input
                    type="text"
                    name="regimen"
                    value={formData.regimen}
                    onChange={handleChange}
                    placeholder="Escriba el régimen..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ppal</label>
                  <input
                    type="text"
                    name="ppal"
                    value={formData.ppal}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Zona Reporte</label>
                  <input
                    type="text"
                    name="zona_reporte"
                    value={formData.zona_reporte}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isLoading}
            className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Save size={16} />
                {inmuebleToEdit ? 'Actualizar Inmueble' : 'Guardar Inmueble'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
