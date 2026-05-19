import React, { useState, useEffect } from 'react';
import { X, Save, Info, MapPin, Phone, Settings, Loader2, Plus, Network, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useCatTipoUnidades } from '../hooks/useUnidades';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_USUARIOS } from '../api/usuarios.queries';

export default function UnidadModal({ isOpen, onClose, unidadToEdit, onSubmit, isLoading }) {
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
    zona_reporte: '',
    nivel: '',
    no_inmueble: '',
    regimen: '',
    tipo_unidad: '',
    encargado_usuario: '',
    administrador_usuario: '',
    informatica_usuario: '',
    contacto_telefonico: [''],
    contacto_correo: [''],
    segmentos: []
  });

  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'ubicacion' | 'tecnico' | 'segmentos'
  const [errors, setErrors] = useState({});
  const [expandedSegmentIndex, setExpandedSegmentIndex] = useState(null);

  // Catalogs for consistency (Using the ones from Unidades)
  const { data: tipoUnidades, isLoading: loadingTipos } = useCatTipoUnidades();
  
  const { data: usuariosData, isLoading: loadingUsuarios } = useQuery({
    queryKey: ['usuariosList'],
    queryFn: () => gqlClient.request(GET_USUARIOS, { pagination: { first: 500 } }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000
  });
  const usuarios = usuariosData?.usuarios?.edges?.map(e => e.node) || [];
  

  useEffect(() => {
    if (unidadToEdit) {
      const tels = unidadToEdit.contactos?.filter(c => c.tipo_contacto === 'telefonico').map(c => c.contacto);
      const cors = unidadToEdit.contactos?.filter(c => c.tipo_contacto === 'correo electronico').map(c => c.contacto);
      setFormData({
        clave: unidadToEdit.clave ?? '',
        descripcion: unidadToEdit.descripcion ?? '',
        desc_corta: unidadToEdit.desc_corta ?? '',
        encargado: unidadToEdit.encargado ?? '',
        direccion: unidadToEdit.direccion ?? '',
        calle: unidadToEdit.calle ?? '',
        numero: unidadToEdit.numero ?? '',
        colonia: unidadToEdit.colonia ?? '',
        ciudad: unidadToEdit.ciudad ?? '',
        municipio: unidadToEdit.municipio ?? '',
        cp: unidadToEdit.cp ?? '',
        ppal: unidadToEdit.ppal ?? '',
        clave_zona: unidadToEdit.clave_zona ?? '',
        clave_a: unidadToEdit.clave_a ?? '',
        zona_reporte: unidadToEdit.zona_reporte ?? '',
        nivel: unidadToEdit.nivel ?? '',
        no_inmueble: unidadToEdit.no_inmueble ?? '',
        regimen: unidadToEdit.regimen ?? '',
        tipo_unidad: unidadToEdit.tipo_unidad ?? '',
        encargado_usuario: unidadToEdit.unidadesACargo?.find(u => u.id_rol_empleado === 1)?.id_usuario || '',
        administrador_usuario: unidadToEdit.unidadesACargo?.find(u => u.id_rol_empleado === 2)?.id_usuario || '',
        informatica_usuario: unidadToEdit.unidadesACargo?.find(u => u.id_rol_empleado === 3)?.id_usuario || '',
        contacto_telefonico: tels?.length ? tels : [''],
        contacto_correo: cors?.length ? cors : [''],
        segmentos: unidadToEdit.segmentos ? unidadToEdit.segmentos.map(s => ({
          ...s,
          fecha_migracion: s.fecha_migracion ? new Date(s.fecha_migracion).toISOString().split('T')[0] : ''
        })) : []
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
        zona_reporte: '',
        nivel: '',
        no_inmueble: '',
        regimen: '',
        tipo_unidad: '',
        encargado_usuario: '',
        administrador_usuario: '',
        informatica_usuario: '',
        contacto_telefonico: [''],
        contacto_correo: [''],
        segmentos: []
      });
    }
    setErrors({});
    setActiveTab('general');
    setExpandedSegmentIndex(null);
  }, [unidadToEdit, isOpen]);

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

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  const handleAddArrayItem = (field) => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  const handleRemoveArrayItem = (field, index) => {
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleAddSegment = () => {
    setFormData(prev => {
      const currentSegs = prev.segmentos || [];
      return {
        ...prev,
        segmentos: [
          ...currentSegs,
          {
            no_ref: '',
            nombre: '',
            ip: '',
            bits: '',
            ip_init: '',
            estatus: 1,
            vlan: '',
            monitorear: 0,
            proveedor: '',
            fecha_migracion: '',
            velocidad: '',
            tipo_enlace: ''
          }
        ]
      };
    });
    setFormData(prev => {
      setExpandedSegmentIndex(prev.segmentos.length - 1);
      return prev;
    });
  };

  const handleRemoveSegment = (index) => {
    setFormData(prev => ({
      ...prev,
      segmentos: prev.segmentos.filter((_, i) => i !== index)
    }));
    if (expandedSegmentIndex === index) {
      setExpandedSegmentIndex(null);
    } else if (expandedSegmentIndex > index) {
      setExpandedSegmentIndex(expandedSegmentIndex - 1);
    }
  };

  const handleSegmentChange = (index, field, value) => {
    setFormData(prev => {
      const newSegments = [...prev.segmentos];
      newSegments[index] = {
        ...newSegments[index],
        [field]: value
      };
      return {
        ...prev,
        segmentos: newSegments
      };
    });
    
    // Clear segment specific errors if any
    const errorKey = `segmento_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: null }));
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

    // Validar segmentos
    if (formData.segmentos) {
      formData.segmentos.forEach((seg, index) => {
        if (!seg.no_ref.trim()) {
          newErrors[`segmento_${index}_no_ref`] = 'El número de referencia es obligatorio';
        } else if (seg.no_ref.length > 50) {
          newErrors[`segmento_${index}_no_ref`] = 'Máximo 50 caracteres';
        }

        if (!seg.nombre.trim()) {
          newErrors[`segmento_${index}_nombre`] = 'El nombre es obligatorio';
        } else if (seg.nombre.length > 200) {
          newErrors[`segmento_${index}_nombre`] = 'Máximo 200 caracteres';
        }

        if (!seg.ip.trim()) {
          newErrors[`segmento_${index}_ip`] = 'La dirección IP es obligatoria';
        } else {
          const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          if (!ipRegex.test(seg.ip)) {
            newErrors[`segmento_${index}_ip`] = 'IP inválida (ej: 10.0.0.1)';
          }
        }

        if (seg.bits !== '' && seg.bits !== null && (seg.bits < 0 || seg.bits > 32)) {
          newErrors[`segmento_${index}_bits`] = 'Debe estar entre 0 y 32';
        }

        if (seg.vlan !== '' && seg.vlan !== null && (seg.vlan < 1 || seg.vlan > 4094)) {
          newErrors[`segmento_${index}_vlan`] = 'Debe estar entre 1 y 4094';
        }

        if (seg.ip_init !== '' && seg.ip_init !== null && (seg.ip_init < 0 || seg.ip_init > 255)) {
          newErrors[`segmento_${index}_ip_init`] = 'Debe estar entre 0 y 255';
        }
      });
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
      
      const unidadesACargo = [];
      if (formData.encargado_usuario) unidadesACargo.push({ id_rol_empleado: 1, id_usuario: parseInt(formData.encargado_usuario) });
      if (formData.administrador_usuario) unidadesACargo.push({ id_rol_empleado: 2, id_usuario: parseInt(formData.administrador_usuario) });
      if (formData.informatica_usuario) unidadesACargo.push({ id_rol_empleado: 3, id_usuario: parseInt(formData.informatica_usuario) });

      const contactos = [];
      if (formData.contacto_telefonico) {
        formData.contacto_telefonico.map(s => typeof s === 'string' ? s.trim() : s).filter(s => s).forEach(c => {
          contactos.push({ contacto: c, tipo_contacto: 'telefonico' });
        });
      }
      if (formData.contacto_correo) {
        formData.contacto_correo.map(s => typeof s === 'string' ? s.trim() : s).filter(s => s).forEach(c => {
          contactos.push({ contacto: c, tipo_contacto: 'correo electronico' });
        });
      }

      // Format segments
      const segmentosFormatted = (formData.segmentos || []).map(seg => {
        const s = { ...seg };
        ['bits', 'ip_init', 'estatus', 'vlan', 'monitorear', 'tipo_enlace'].forEach(field => {
          if (s[field] === '' || s[field] === null || s[field] === undefined) {
            s[field] = null;
          } else {
            s[field] = parseInt(s[field]);
          }
        });
        if (s.fecha_migracion === '' || s.fecha_migracion === null) {
          s.fecha_migracion = null;
        } else {
          s.fecha_migracion = new Date(s.fecha_migracion).toISOString();
        }
        delete s.__typename;
        return s;
      });

      submissionData.unidadesACargo = unidadesACargo;
      submissionData.contactos = contactos;
      submissionData.segmentos = segmentosFormatted;
      
      delete submissionData.encargado_usuario;
      delete submissionData.administrador_usuario;
      delete submissionData.informatica_usuario;
      delete submissionData.contacto_telefonico;
      delete submissionData.contacto_correo;

      onSubmit(submissionData);
    } else {
      showToast('Por favor, revisa los errores en el formulario', 'error');
      
      const generalFields = ['clave', 'descripcion', 'desc_corta', 'encargado'];
      const locationFields = ['direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp'];
      
      const hasGeneralErrors = generalFields.some(f => !!currentErrors[f]);
      const hasLocationErrors = locationFields.some(f => !!currentErrors[f]);
      const hasTechnicalErrors = Object.keys(currentErrors).some(f => !generalFields.includes(f) && !locationFields.includes(f) && !f.startsWith('segmento_'));
      const hasSegmentErrors = Object.keys(currentErrors).some(f => f.startsWith('segmento_'));

      if (activeTab === 'general' && (hasLocationErrors || hasTechnicalErrors || hasSegmentErrors) && !hasGeneralErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasLocationErrors ? 'Ubicación' : ''} ${hasTechnicalErrors ? 'Técnico' : ''} ${hasSegmentErrors ? 'Segmentos' : ''})`, 'info');
      } else if (activeTab === 'ubicacion' && (hasGeneralErrors || hasTechnicalErrors || hasSegmentErrors) && !hasLocationErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasGeneralErrors ? 'General' : ''} ${hasTechnicalErrors ? 'Técnico' : ''} ${hasSegmentErrors ? 'Segmentos' : ''})`, 'info');
      } else if (activeTab === 'tecnico' && (hasGeneralErrors || hasLocationErrors || hasSegmentErrors) && !hasTechnicalErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasGeneralErrors ? 'General' : ''} ${hasLocationErrors ? 'Ubicación' : ''} ${hasSegmentErrors ? 'Segmentos' : ''})`, 'info');
      } else if (activeTab === 'segmentos' && (hasGeneralErrors || hasLocationErrors || hasTechnicalErrors) && !hasSegmentErrors) {
        showToast(`Hay errores pendientes en otras pestañas (${hasGeneralErrors ? 'General' : ''} ${hasLocationErrors ? 'Ubicación' : ''} ${hasTechnicalErrors ? 'Técnico' : ''})`, 'info');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 transition-opacity" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{unidadToEdit ? 'Editar Unidad' : 'Nueva Unidad'}</h2>
            <p className="text-sm text-gray-500">Gestión de datos de unidades físicas.</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 bg-gray-50/50">
          <button 
            type="button"
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
            type="button"
            onClick={() => setActiveTab('ubicacion')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'ubicacion' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <MapPin size={16} /> 
            Ubicación y Contacto
            {Object.keys(errors).some(f => ['direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp'].includes(f)) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('tecnico')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'tecnico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Settings size={16} /> 
            Datos Técnicos
            {Object.keys(errors).some(f => !['clave', 'descripcion', 'desc_corta', 'encargado', 'direccion', 'calle', 'numero', 'colonia', 'ciudad', 'municipio', 'cp'].includes(f) && !f.startsWith('segmento_')) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('segmentos')}
            className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 relative ${activeTab === 'segmentos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Network size={16} /> 
            Segmentos ({formData.segmentos?.length || 0})
            {Object.keys(errors).some(f => f.startsWith('segmento_')) && (
              <span className="absolute top-2 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <form id="unidad-form" onSubmit={handleSubmit} className="space-y-6">
            
            {activeTab === 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Clave *</label>
                  <input
                    type="text"
                    name="clave"
                    value={formData.clave}
                    onChange={handleChange}
                    disabled={!!unidadToEdit}
                    placeholder="Ej: INM-001"
                    className={`w-full px-3 py-2 text-sm border ${errors.clave ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${unidadToEdit ? 'bg-gray-50' : ''}`}
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Encargado (Físico - Legado)</label>
                  <input
                    type="text"
                    name="encargado"
                    value={formData.encargado}
                    onChange={handleChange}
                    placeholder="Nombre del responsable (opcional)..."
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
                
                <div className="col-span-1 md:col-span-3 mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 text-blue-700">Responsables de la Unidad</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Encargado de Unidad</label>
                      <select
                        name="encargado_usuario"
                        value={formData.encargado_usuario}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loadingUsuarios}
                      >
                        <option value="">-- Seleccionar --</option>
                        {usuarios.map(u => (
                          <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Administrador</label>
                      <select
                        name="administrador_usuario"
                        value={formData.administrador_usuario}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loadingUsuarios}
                      >
                        <option value="">-- Seleccionar --</option>
                        {usuarios.map(u => (
                          <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Encargado de Informática</label>
                      <select
                        name="informatica_usuario"
                        value={formData.informatica_usuario}
                        onChange={handleChange}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        disabled={loadingUsuarios}
                      >
                        <option value="">-- Seleccionar --</option>
                        {usuarios.map(u => (
                          <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-3 mt-4 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 text-green-700">Contactos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono(s)</label>
                      <div className="space-y-2">
                        {formData.contacto_telefonico.map((tel, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={tel}
                              onChange={(e) => handleArrayChange('contacto_telefonico', i, e.target.value)}
                              placeholder="Ej: 311 123 4567"
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {formData.contacto_telefonico.length > 1 && (
                              <button type="button" onClick={() => handleRemoveArrayItem('contacto_telefonico', i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Quitar">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddArrayItem('contacto_telefonico')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Agregar Teléfono
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Correo(s) Electrónico(s)</label>
                      <div className="space-y-2">
                        {formData.contacto_correo.map((correo, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={correo}
                              onChange={(e) => handleArrayChange('contacto_correo', i, e.target.value)}
                              placeholder="Ej: admin@ejemplo.com"
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            {formData.contacto_correo.length > 1 && (
                              <button type="button" onClick={() => handleRemoveArrayItem('contacto_correo', i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Quitar">
                                <X size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        <button type="button" onClick={() => handleAddArrayItem('contacto_correo')} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                          <Plus size={12} /> Agregar Correo
                        </button>
                      </div>
                    </div>
                  </div>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">No. Unidad</label>
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

            {activeTab === 'segmentos' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Segmentos de Red de esta Unidad</h3>
                    <p className="text-xs text-gray-500">Agrega o edita los segmentos que pertenecen a esta unidad física.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSegment}
                    className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Agregar Segmento
                  </button>
                </div>

                {!formData.segmentos || formData.segmentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Network size={32} className="text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 font-medium">No hay segmentos de red configurados</p>
                    <p className="text-xs text-gray-400 mb-4">Haz clic en el botón de arriba para agregar uno.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.segmentos.map((seg, index) => {
                      const isExpanded = expandedSegmentIndex === index;
                      const hasSegErrors = Object.keys(errors).some(k => k.startsWith(`segmento_${index}_`));
                      return (
                        <div key={index} className={`border ${hasSegErrors ? 'border-red-200 bg-red-50/10' : 'border-gray-200'} rounded-xl overflow-hidden transition-all bg-white shadow-sm`}>
                          
                          {/* Segment Header */}
                          <div 
                            className="px-4 py-3 bg-gray-50/50 hover:bg-gray-50 flex items-center justify-between cursor-pointer select-none"
                            onClick={() => setExpandedSegmentIndex(isExpanded ? null : index)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Network size={16} className={`${hasSegErrors ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                              <div className="truncate flex-1">
                                <span className="text-sm font-semibold text-gray-800">
                                  {seg.nombre || `Segmento #${index + 1}`}
                                </span>
                                {seg.ip && (
                                  <span className="ml-2 text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                    {seg.ip}{seg.bits ? `/${seg.bits}` : ''}
                                  </span>
                                )}
                                {seg.no_ref && (
                                  <span className="ml-2 text-[10px] text-gray-400">
                                    Ref: {seg.no_ref}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasSegErrors && (
                                <span className="text-[10px] text-red-500 font-semibold px-2 py-0.5 bg-red-100 rounded-full">
                                  Errores
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveSegment(index);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar Segmento"
                              >
                                <Trash2 size={14} />
                              </button>
                              {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                            </div>
                          </div>

                          {/* Segment Form Grid */}
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-200">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">No. Referencia *</label>
                                <input
                                  type="text"
                                  value={seg.no_ref}
                                  onChange={(e) => handleSegmentChange(index, 'no_ref', e.target.value)}
                                  placeholder="Ej: SEG-001"
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_no_ref`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_no_ref`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_no_ref`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Nombre *</label>
                                <input
                                  type="text"
                                  value={seg.nombre}
                                  onChange={(e) => handleSegmentChange(index, 'nombre', e.target.value)}
                                  placeholder="Nombre descriptivo..."
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_nombre`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_nombre`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_nombre`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Dirección IP Base *</label>
                                <input
                                  type="text"
                                  value={seg.ip}
                                  onChange={(e) => handleSegmentChange(index, 'ip', e.target.value)}
                                  placeholder="Ej: 10.102.95.0"
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_ip`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_ip`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_ip`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Bits (Mascara)</label>
                                <input
                                  type="number"
                                  value={seg.bits}
                                  onChange={(e) => handleSegmentChange(index, 'bits', e.target.value === '' ? '' : parseInt(e.target.value))}
                                  min="0"
                                  max="32"
                                  placeholder="Ej: 24"
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_bits`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_bits`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_bits`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">IP Inicial (Octeto)</label>
                                <input
                                  type="number"
                                  value={seg.ip_init}
                                  onChange={(e) => handleSegmentChange(index, 'ip_init', e.target.value === '' ? '' : parseInt(e.target.value))}
                                  min="0"
                                  max="255"
                                  placeholder="Ej: 1"
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_ip_init`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_ip_init`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_ip_init`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">VLAN</label>
                                <input
                                  type="number"
                                  value={seg.vlan}
                                  onChange={(e) => handleSegmentChange(index, 'vlan', e.target.value === '' ? '' : parseInt(e.target.value))}
                                  min="1"
                                  max="4094"
                                  placeholder="Ej: 50"
                                  className={`w-full px-3 py-1.5 text-sm border ${errors[`segmento_${index}_vlan`] ? 'border-red-500' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-blue-500 outline-none`}
                                />
                                {errors[`segmento_${index}_vlan`] && <p className="text-[10px] text-red-500 mt-1 font-semibold">{errors[`segmento_${index}_vlan`]}</p>}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Proveedor</label>
                                <input
                                  type="text"
                                  value={seg.proveedor || ''}
                                  onChange={(e) => handleSegmentChange(index, 'proveedor', e.target.value)}
                                  placeholder="Proveedor de enlace..."
                                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Velocidad</label>
                                <input
                                  type="text"
                                  value={seg.velocidad || ''}
                                  onChange={(e) => handleSegmentChange(index, 'velocidad', e.target.value)}
                                  placeholder="Ej: 100 Mbps"
                                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Tipo de Enlace</label>
                                <select
                                  value={seg.tipo_enlace || ''}
                                  onChange={(e) => handleSegmentChange(index, 'tipo_enlace', e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                  <option value="">-- Seleccionar --</option>
                                  <option value={1}>Fibra Óptica (1)</option>
                                  <option value={3}>Satelital (3)</option>
                                  <option value={4}>Microondas (4)</option>
                                  <option value={5}>Cobre / ADSL (5)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Estatus</label>
                                <select
                                  value={seg.estatus}
                                  onChange={(e) => handleSegmentChange(index, 'estatus', parseInt(e.target.value))}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                  <option value={1}>Activa</option>
                                  <option value={0}>Inactiva</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">Fecha de Migración</label>
                                <input
                                  type="date"
                                  value={seg.fecha_migracion || ''}
                                  onChange={(e) => handleSegmentChange(index, 'fecha_migracion', e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <input
                                  type="checkbox"
                                  id={`monitorear_${index}`}
                                  checked={seg.monitorear === 1}
                                  onChange={(e) => handleSegmentChange(index, 'monitorear', e.target.checked ? 1 : 0)}
                                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`monitorear_${index}`} className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 select-none cursor-pointer">
                                  Habilitar Monitoreo
                                  <Settings size={14} className="text-gray-400" />
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
                {unidadToEdit ? 'Actualizar Unidad' : 'Guardar Unidad'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
