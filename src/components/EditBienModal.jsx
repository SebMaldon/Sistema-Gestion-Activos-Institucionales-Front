import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { gql } from 'graphql-request';
import { Loader2, X, Save } from 'lucide-react';
import { useEditBien, useUpsertSpecsTI } from '../hooks/useEscaner';
import { useApp } from '../context/AppContext';
import UserSearchDropdown from './UserSearchDropdown';

const GET_CATALOGS_QUERY = gql`
  query GetCatalogs {
    catCategoriasActivo { id_categoria nombre_categoria }
    unidades { id_unidad nombre }
    usuarios(estatus: true, pagination: { first: 300 }) {
      edges {
        node {
          id_usuario
          nombre_completo
          matricula
        }
      }
    }
    ubicaciones { id_ubicacion nombre_ubicacion id_unidad }
  }
`;

export function EditBienModal({ asset, onClose }) {
  const { showToast } = useApp();
  const { mutateAsync: editBien, isLoading: isSavingData } = useEditBien();
  const { mutateAsync: upsertSpecs, isLoading: isSavingSpecs } = useUpsertSpecsTI();
  const isSaving = isSavingData || isSavingSpecs;

  const CATEGORIAS_TI = [1, 3];
  
  const [activeTab, setActiveTab] = useState('generales'); // 'generales' | 'specs'
  
  const { data: catalogs, isLoading } = useQuery({
    queryKey: ['catalogsSelect'],
    queryFn: async () => {
      const data = await gqlClient.request(GET_CATALOGS_QUERY);
      return data;
    }
  });

  const [formData, setFormData] = useState({
    num_serie: asset.numSerie || '',
    cantidad: asset.cantidad || 1,
    estatus_operativo: asset.estatus || 'Activo',
    id_categoria: asset.idCategoria || '',
    id_unidad: asset.idUnidad || '',
    id_ubicacion: asset.idUbicacion || '',
    id_usuario_resguardo: asset.idUsuarioResguardo || '',
    clave_inmueble: asset.claveInmueble || '',
    fecha_adquisicion: asset.adquisicion || ''
  });

  const [specsData, setSpecsData] = useState({
    nom_pc: '',
    cpu: '',
    ram: '',
    almacenamiento: '',
    mac_wifi: '',
    ip: '',
    mac_eth: '',
    puerto_red: '',
    switch_red: '',
    os: ''
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        num_serie: asset.numSerie || '',
        cantidad: asset.cantidad || 1,
        estatus_operativo: asset.estatus || 'Activo',
        id_categoria: asset.idCategoria || '',
        id_unidad: asset.idUnidad || '',
        id_ubicacion: asset.idUbicacion || '',
        id_usuario_resguardo: asset.idUsuarioResguardo || '',
        clave_inmueble: asset.claveInmueble || '',
        fecha_adquisicion: asset.adquisicion || ''
      });
      if (asset.specs) {
        setSpecsData({
          nom_pc: asset.specs.nom_pc || '',
          cpu: asset.specs.cpu || '',
          ram: asset.specs.ram || '',
          almacenamiento: asset.specs.almacenamiento || '',
          mac_wifi: asset.specs.mac_wifi || '',
          ip: asset.specs.ip || '',
          mac_eth: asset.specs.mac_eth || '',
          puerto_red: asset.specs.puerto_red || '',
          switch_red: asset.specs.switch_red || '',
          os: asset.specs.os || ''
        });
      }
    }
  }, [asset]);

  const hasTISpecs = asset.specs?.hasSpecs;
  const isTICategory = formData.id_categoria ? CATEGORIAS_TI.includes(Number(formData.id_categoria)) : false;
  const showTITab = hasTISpecs || isTICategory;

  useEffect(() => {
    if (!showTITab && activeTab === 'specs') {
      setActiveTab('generales');
    }
  }, [showTITab, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await editBien({
        id_bien: asset.id,
        input: {
          num_serie: formData.num_serie,
          cantidad: parseInt(formData.cantidad, 10),
          estatus_operativo: formData.estatus_operativo,
          id_categoria: formData.id_categoria ? parseInt(formData.id_categoria, 10) : undefined,
          id_unidad: formData.id_unidad ? parseInt(formData.id_unidad, 10) : undefined,
          id_ubicacion: formData.id_ubicacion ? parseInt(formData.id_ubicacion, 10) : undefined,
          id_usuario_resguardo: formData.id_usuario_resguardo ? parseInt(formData.id_usuario_resguardo, 10) : undefined,
          clave_inmueble: formData.clave_inmueble,
          fecha_adquisicion: formData.fecha_adquisicion || null
        }
      });
      
      // Checar si hay algun campo de specs lleno para proceder a actualizar BD
      const hasAnySpec = Object.values(specsData).some(val => val !== null && val !== '');
      if (hasAnySpec || asset.specs?.hasSpecs) {
        await upsertSpecs({
          id_bien: asset.id,
          specs: specsData
        });
      }
      
      showToast('Actualización exitosa', 'success');
      onClose();
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar: ' + (e.message || 'Desconocido'), 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl relative max-h-[90vh] overflow-y-auto flex flex-col overflow-hidden">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">Editar Registro</h2>

        <div className="flex bg-gray-100 p-1 rounded-lg mb-5 shrink-0">
          <button 
            type="button"
            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'generales' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('generales')}
          >
            Datos Generales
          </button>
          {showTITab && (
            <button 
              type="button"
              className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeTab === 'specs' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('specs')}
            >
              Especificaciones TI
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#006341]" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            
            {activeTab === 'generales' && (
              <div className="space-y-4 fade-in py-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Número de Serie</label>
                    <input required type="text" value={formData.num_serie} onChange={e => setFormData({...formData, num_serie: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Cantidad</label>
                    <input required type="number" value={formData.cantidad} onChange={e => setFormData({...formData, cantidad: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Estatus</label>
                    <select value={formData.estatus_operativo} onChange={e => setFormData({...formData, estatus_operativo: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50">
                      <option value="Activo">Activo</option>
                      <option value="Baja">Baja</option>
                      <option value="En Reparación">En Reparación</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Categoría</label>
                    <select value={formData.id_categoria} onChange={e => setFormData({...formData, id_categoria: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50">
                      <option value="">-- Seleccionar --</option>
                      {catalogs?.catCategoriasActivo?.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Unidad Base</label>
                    <select value={formData.id_unidad} onChange={e => setFormData({...formData, id_unidad: e.target.value, id_ubicacion: ''})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50">
                      <option value="">-- Seleccionar --</option>
                      {catalogs?.unidades?.map(u => <option key={u.id_unidad} value={u.id_unidad}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Ubicación</label>
                    <select value={formData.id_ubicacion} disabled={!formData.id_unidad} onChange={e => setFormData({...formData, id_ubicacion: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50 disabled:opacity-50">
                      <option value="">-- Seleccionar --</option>
                      {catalogs?.ubicaciones?.filter(u => String(u.id_unidad) === String(formData.id_unidad)).map(u => <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre_ubicacion}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Usuario de Resguardo</label>
                  <UserSearchDropdown 
                    usuarios={catalogs?.usuarios?.edges?.map(e => e.node) || []} 
                    value={formData.id_usuario_resguardo} 
                    onChange={val => setFormData({...formData, id_usuario_resguardo: val})} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Cve Inmueble</label>
                    <input type="text" value={formData.clave_inmueble} onChange={e => setFormData({...formData, clave_inmueble: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Adquisición</label>
                    <input type="date" value={formData.fecha_adquisicion} onChange={e => setFormData({...formData, fecha_adquisicion: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-gray-50/50" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="space-y-4 fade-in py-1">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Nombre Equipo</label>
                    <input type="text" value={specsData.nom_pc} onChange={e => setSpecsData({...specsData, nom_pc: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-blue-50/20" placeholder="Ej. PC-CAJA-03" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">SO</label>
                    <input type="text" value={specsData.os} onChange={e => setSpecsData({...specsData, os: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-blue-50/20" placeholder="Win 10, Mac OS..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">CPU Info</label>
                    <input type="text" value={specsData.cpu} onChange={e => setSpecsData({...specsData, cpu: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-blue-50/20" placeholder="Core i5 10ma" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">RAM (GB)</label>
                    <input type="number" value={specsData.ram} onChange={e => setSpecsData({...specsData, ram: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-blue-50/20" placeholder="8" />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Almacenaje (GB)</label>
                    <input type="number" value={specsData.almacenamiento} onChange={e => setSpecsData({...specsData, almacenamiento: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm bg-blue-50/20" placeholder="512" />
                  </div>
                </div>

                <div className="space-y-2 pt-3 mt-3 border-t border-gray-100">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Red y Conectividad</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">Dirección IP</label>
                      <input type="text" value={specsData.ip} onChange={e => setSpecsData({...specsData, ip: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm font-mono" placeholder="192.168.0.X" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">MAC (Ethernet)</label>
                      <input type="text" value={specsData.mac_eth} onChange={e => setSpecsData({...specsData, mac_eth: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm font-mono uppercase" placeholder="XX:XX:XX..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">MAC (WLAN)</label>
                      <input type="text" value={specsData.mac_wifi} onChange={e => setSpecsData({...specsData, mac_wifi: e.target.value})} className="w-full border border-gray-300 p-2 rounded-lg text-sm font-mono uppercase" placeholder="XX:XX:XX..." />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-gray-600">Switch / Puerto</label>
                      <div className="flex gap-2">
                         <input type="text" value={specsData.switch_red} onChange={e => setSpecsData({...specsData, switch_red: e.target.value})} className="w-2/3 border border-gray-300 p-2 rounded-lg text-sm" placeholder="ID Switch" />
                         <input type="text" value={specsData.puerto_red} onChange={e => setSpecsData({...specsData, puerto_red: e.target.value})} className="w-1/3 border border-gray-300 p-2 rounded-lg text-sm" placeholder="Pto." />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            <div className="pt-5 mt-5 flex justify-end gap-3 border-t border-gray-100 shrink-0">
              <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors flex items-center gap-2" style={{ backgroundColor: '#006341' }}>
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Guardar Cambios
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
