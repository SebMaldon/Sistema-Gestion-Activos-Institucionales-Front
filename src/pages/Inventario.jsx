import React, { useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useBienes } from '../hooks/useBienes';
import { useCatalogosBienes } from '../hooks/useCatalogosBienes';
import { useCreateBien, useUpdateBien, useDeleteBien, useUpsertEspecificacionTI } from '../hooks/useBienMutations';
import { useAuthStore } from '../store/auth.store';
import { useApp } from '../context/AppContext';
import {
  Search, Plus, Eye, Edit, Trash2, QrCode,
  ChevronLeft, ChevronRight, X, AlertTriangle,
  Server, Monitor, Cpu, HardDrive, Wifi, Save,
  Package, Shield, Calendar, MapPin, User, Tag,
  ChevronDown, ChevronUp, Loader2, RefreshCw
} from 'lucide-react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { GET_UBICACIONES_POR_UNIDAD, CREATE_UBICACION } from '../api/inventario.queries';

// ─── Roles reales de BD ───────────────────────────────────────────────────────
const ROL_MAESTRO  = 2;
const ROL_ADMIN    = 1;

// Categorías TI (id_categoria = 1: Equipo de Cómputo, 3: Redes y Telecomunicaciones)
const CATEGORIAS_TI = [1, 3];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return v || '—'; }
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ─── Badge de Estatus ─────────────────────────────────────────────────────────
function EstatusBadge({ estatus }) {
  const map = {
    'ACTIVO':        { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'Activo':        { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    'EN_REPARACION': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'En Reparación': { bg: '#fef9c3', color: '#a16207', label: 'En Reparación' },
    'BAJA':          { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
    'Baja':          { bg: '#fee2e2', color: '#b91c1c', label: 'Baja' },
  };
  const s = map[estatus] ?? { bg: '#f3f4f6', color: '#374151', label: estatus };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

// ─── Estado inicial del formulario ────────────────────────────────────────────
const FORM_EMPTY = {
  id_categoria: '',
  id_unidad_medida: '',
  id_unidad: '',
  id_ubicacion: '',
  num_inv: '',
  cantidad: 1,
  estatus_operativo: 'ACTIVO',
  clave_inmueble: '',
  clave_inmueble_ref: '',
  clave_modelo: '',
  id_usuario_resguardo: '',
  fecha_adquisicion: '',
};
const TI_EMPTY = {
  nom_pc: '', cpu_info: '', ram_gb: '', almacenamiento_gb: '',
  dir_ip: '', dir_mac: '', mac_address: '', modelo_so: '',
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function Inventario() {
  const { showToast } = useApp();
  const usuario = useAuthStore((s) => s.usuario);
  const idRol = usuario?.id_rol ?? 3;
  const canEdit   = [ROL_ADMIN, ROL_MAESTRO].includes(idRol);
  const canDelete = idRol === ROL_MAESTRO;

  // ── Estado de UI ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('Capitalizable');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState('');
  const [page, setPage]           = useState(1);
  const PER_PAGE = 10;

  // ── Modales ────────────────────────────────────────────────────────────────
  const [modalQR, setModalQR]           = useState(null);
  const [modalFicha, setModalFicha]     = useState(null);
  const [modalForm, setModalForm]       = useState(null); // null | 'create' | bien
  const [modalConfirmDel, setModalConfirmDel] = useState(null);
  const [showTI, setShowTI]             = useState(false);

  // ── Formulario ────────────────────────────────────────────────────────────
  const [form, setForm]   = useState(FORM_EMPTY);
  const [tiForm, setTiForm] = useState(TI_EMPTY);
  const [formErrors, setFormErrors] = useState({});

  // ── Datos ─────────────────────────────────────────────────────────────────
  const { data: bienesData, isLoading, isError, refetch } = useBienes({}, { first: 200 });
  const bienes = bienesData?.items ?? [];

  const { data: catalogos, isLoading: loadingCat } = useCatalogosBienes();
  
  const qc = useQueryClient();
  const [isAddingUbicacion, setIsAddingUbicacion] = useState(false);
  const [newUbicacionName, setNewUbicacionName] = useState('');

  const { data: ubicacionesData } = useQuery({
    queryKey: ['ubicaciones', form.id_unidad],
    queryFn: () => gqlClient.request(GET_UBICACIONES_POR_UNIDAD, { id_unidad: parseInt(form.id_unidad) }),
    enabled: !!form.id_unidad,
  });
  const ubicacionesUnidad = ubicacionesData?.ubicacionesPorUnidad ?? [];

  const { mutate: createUbicacion, isPending: creatingUbicacion } = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_UBICACION, vars),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ubicaciones', form.id_unidad] });
      setForm(f => ({ ...f, id_ubicacion: data.createUbicacion.id_ubicacion }));
      setIsAddingUbicacion(false);
      setNewUbicacionName('');
      showToast('Ubicación agregada correctamente', 'success');
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear ubicación', 'error'),
  });

  const handleCreateUbicacion = () => {
    if (!newUbicacionName.trim()) return;
    createUbicacion({ id_unidad: parseInt(form.id_unidad), nombre_ubicacion: newUbicacionName });
  };

  // ── Mutaciones ─────────────────────────────────────────────────────────────
  const { mutate: createBien, isPending: creating } = useCreateBien({
    onSuccess: () => { closeForm(); showToast('Bien registrado correctamente.', 'success'); },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear bien.', 'error'),
  });
  const { mutate: updateBien, isPending: updating } = useUpdateBien({
    onSuccess: () => { closeForm(); showToast('Bien actualizado correctamente.', 'success'); },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar bien.', 'error'),
  });
  const { mutate: deleteBien, isPending: deleting } = useDeleteBien({
    onSuccess: () => { setModalConfirmDel(null); showToast('Bien eliminado.', 'success'); },
    onError: (e) => {
      setModalConfirmDel(null);
      showToast(e?.response?.errors?.[0]?.message ?? 'No se pudo eliminar el bien.', 'error');
    },
  });
  const { mutate: upsertTI } = useUpsertEspecificacionTI({
    onSuccess: () => showToast('Especificaciones TI guardadas.', 'success'),
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al guardar TI.', 'error'),
  });

  // ── Filtrado local ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const tab = activeTab === 'Capitalizable';
    return bienes.filter((b) => {
      if (b.esCapitalizable !== tab) return false;
      if (filterStatus && b.estatusOperativo !== filterStatus) return false;
      const ub = b.ubicacion?.toLowerCase() ?? '';
      if (filterUbicacion && ub !== filterUbicacion.toLowerCase()) return false;
      if (search) {
        const q = search.toLowerCase();
        return [b.numSerie, b.equipo, b.resguardo, b.ubicacion]
          .some((f) => (f ?? '').toLowerCase().includes(q));
      }
      return true;
    });
  }, [bienes, activeTab, search, filterStatus, filterUbicacion]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const ubicaciones = useMemo(() => [...new Set(bienes.map((b) => b.ubicacion).filter(Boolean))], [bienes]);

  const capitalCount     = bienes.filter((b) => b.esCapitalizable).length;
  const noCapitalCount   = bienes.filter((b) => !b.esCapitalizable).length;

  // ── Formulario: abrir ───────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setForm(FORM_EMPTY);
    setTiForm(TI_EMPTY);
    setFormErrors({});
    setShowTI(false);
    setModalForm('create');
  }, []);

  const openEdit = useCallback((bien) => {
    setForm({
      id_categoria: bien.idCategoria ?? '',
      id_unidad_medida: bien.idUnidadMedida ?? '',
      id_unidad: bien.idUnidad ?? '',
      id_ubicacion: bien.id_ubicacion ?? '',
      num_inv: bien.numInv === 'N/D' ? '' : (bien.numInv ?? ''),
      cantidad: bien.cantidad ?? 1,
      estatus_operativo: bien.estatusOperativo ?? 'ACTIVO',
      clave_inmueble: bien.claveInmueble ?? '',
      clave_inmueble_ref: bien.claveInmuebleRef ?? '',
      clave_modelo: bien.claveModelo ?? '',
      id_usuario_resguardo: bien.idUsuarioResguardo ?? '',
      fecha_adquisicion: bien.fechaAdquisicion
        ? new Date(bien.fechaAdquisicion).toISOString().split('T')[0] : '',
    });
    setTiForm({
      nom_pc: bien.especificacionTI?.nom_pc ?? '',
      cpu_info: bien.especificacionTI?.cpu_info ?? '',
      ram_gb: bien.especificacionTI?.ram_gb ?? '',
      almacenamiento_gb: bien.especificacionTI?.almacenamiento_gb ?? '',
      dir_ip: bien.especificacionTI?.dir_ip ?? '',
      dir_mac: bien.especificacionTI?.dir_mac ?? '',
      mac_address: bien.especificacionTI?.mac_address ?? '',
      modelo_so: bien.especificacionTI?.modelo_so ?? '',
    });
    setShowTI(CATEGORIAS_TI.includes(Number(bien.idCategoria)));
    setFormErrors({});
    setModalForm(bien);
  }, []);

  const closeForm = useCallback(() => {
    setModalForm(null);
    setForm(FORM_EMPTY);
    setTiForm(TI_EMPTY);
    setFormErrors({});
  }, []);

  // ── Detectar categoría TI al cambiar en el formulario ─────────────────────
  const handleCatChange = (val) => {
    setForm((f) => ({ ...f, id_categoria: val }));
    setShowTI(CATEGORIAS_TI.includes(Number(val)));
  };

  // ── Validación básica ──────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.id_categoria)     errs.id_categoria     = 'Requerido';
    if (!form.id_unidad_medida) errs.id_unidad_medida = 'Requerido';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Enviar formulario ──────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;
    const vars = {
      id_categoria:      Number(form.id_categoria),
      id_unidad_medida:  Number(form.id_unidad_medida),
      id_unidad:         form.id_unidad ? Number(form.id_unidad) : null,
      id_ubicacion:      form.id_ubicacion ? Number(form.id_ubicacion) : null,
      num_inv:           form.num_inv || null,
      cantidad:          Number(form.cantidad) || 1,
      estatus_operativo: form.estatus_operativo,
      clave_inmueble:    form.clave_inmueble || null,
      clave_inmueble_ref: form.clave_inmueble_ref || null,
      clave_modelo:      form.clave_modelo || null,
      id_usuario_resguardo: form.id_usuario_resguardo ? Number(form.id_usuario_resguardo) : null,
      fecha_adquisicion: form.fecha_adquisicion || null,
    };

    if (modalForm === 'create') {
      createBien(vars, {
        onSuccess: (bien) => {
          if (showTI && bien?.id_bien) {
            upsertTI({ id_bien: bien.id_bien, ...parseTI() });
          }
        },
      });
    } else {
      updateBien({ id_bien: modalForm.id_bien, ...vars }, {
        onSuccess: () => {
          if (showTI && modalForm.id_bien) {
            upsertTI({ id_bien: modalForm.id_bien, ...parseTI() });
          }
        },
      });
    }
  };

  const parseTI = () => ({
    nom_pc:            tiForm.nom_pc || null,
    cpu_info:          tiForm.cpu_info || null,
    ram_gb:            tiForm.ram_gb ? Number(tiForm.ram_gb) : null,
    almacenamiento_gb: tiForm.almacenamiento_gb ? Number(tiForm.almacenamiento_gb) : null,
    dir_ip:            tiForm.dir_ip || null,
    dir_mac:           tiForm.dir_mac || null,
    mac_address:       tiForm.mac_address || null,
    modelo_so:         tiForm.modelo_so || null,
  });

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 space-y-5 fade-in">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventario de Bienes</h1>
          <p className="text-sm text-gray-500 mt-1">Padrón de activos institucionales — Delegación Nayarit</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            title="Refrescar"
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          {canEdit && (
            <button
              id="btn-nuevo-bien"
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
            >
              <Plus size={16} />
              Nuevo Bien
            </button>
          )}
        </div>
      </div>

      {/* ── Pestañas ────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto">
        {[
          { key: 'Capitalizable',    label: 'Bienes Capitalizables',     count: capitalCount },
          { key: 'No Capitalizable', label: 'Bienes No Capitalizables',  count: noCapitalCount },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: activeTab === tab.key ? '#dcfce7' : '#e5e7eb',
                color: activeTab === tab.key ? '#006341' : '#6b7280'
              }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por serie, modelo, resguardo o ubicación..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="">Todos los estatus</option>
              <option value="ACTIVO">Activo</option>
              <option value="EN_REPARACION">En Reparación</option>
              <option value="BAJA">Baja</option>
            </select>
            <select
              value={filterUbicacion}
              onChange={(e) => { setFilterUbicacion(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="">Todas las Ubicaciones</option>
              {ubicaciones.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} encontrados
        </p>
      </div>

      {/* ── Estado de carga / error ──────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm">Cargando inventario...</span>
        </div>
      )}
      {isError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center text-red-600 text-sm">
          Ocurrió un error al cargar el inventario. <button onClick={() => refetch()} className="underline font-semibold">Reintentar</button>
        </div>
      )}

      {/* ── TABLA (desktop) ──────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID / Serie</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Modelo / Categoría</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ubicación</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Resguardo</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-14 text-gray-400 text-sm">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    No se encontraron bienes con los filtros aplicados.
                  </td></tr>
                ) : paginated.map((bien) => (
                  <tr key={bien.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {fmt(bien.numSerie)}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5">Inv: {fmt(bien.numInv)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm">{bien.equipo}</p>
                      <p className="text-xs text-gray-400">{bien.categoria?.nombre_categoria}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[160px] truncate">{fmt(bien.ubicacion)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-600 max-w-[140px] truncate">{fmt(bien.resguardo)}</td>
                    <td className="px-4 py-3.5"><EstatusBadge estatus={bien.estatusOperativo} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {/* Ver ficha */}
                        <button onClick={() => setModalFicha(bien)} title="Ver Ficha Técnica"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                          <Eye size={14} />
                        </button>
                        {/* QR / Barcode */}
                        <button onClick={() => setModalQR(bien)} title="Ver Identificadores QR"
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                          <QrCode size={14} />
                        </button>
                        {/* Editar — solo Admin/Maestro */}
                        {canEdit && (
                          <button onClick={() => openEdit(bien)} title="Editar bien"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                            <Edit size={14} />
                          </button>
                        )}
                        {/* Eliminar — solo Maestro */}
                        {canDelete && (
                          <button onClick={() => setModalConfirmDel(bien)} title="Eliminar bien"
                            className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      )}

      {/* ── TARJETAS (mobile) ─────────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="md:hidden space-y-3">
          {paginated.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-400 text-sm">
              <Package size={32} className="mx-auto mb-2 opacity-30" />
              No se encontraron bienes.
            </div>
          ) : paginated.map((bien) => (
            <div key={bien.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{bien.equipo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bien.categoria?.nombre_categoria}</p>
                  <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                    {fmt(bien.numSerie)}
                  </span>
                </div>
                <EstatusBadge estatus={bien.estatusOperativo} />
              </div>
              <div className="text-xs text-gray-500 space-y-1 mb-3">
                <p><span className="text-gray-400">Ubicación:</span> {fmt(bien.ubicacion)}</p>
                <p><span className="text-gray-400">Resguardo:</span> {fmt(bien.resguardo)}</p>
                <p><span className="text-gray-400">Inv:</span> {fmt(bien.numInv)}</p>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-50 flex-wrap">
                <button onClick={() => setModalFicha(bien)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold">
                  <Eye size={13} /> Ficha
                </button>
                <button onClick={() => setModalQR(bien)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-semibold">
                  <QrCode size={13} /> QR
                </button>
                {canEdit && (
                  <button onClick={() => openEdit(bien)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold">
                    <Edit size={13} /> Editar
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setModalConfirmDel(bien)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors text-xs font-semibold">
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
          <Pagination page={page} totalPages={totalPages} onPage={setPage} mobile />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: FICHA TÉCNICA
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalFicha && (
        <Modal onClose={() => setModalFicha(null)} title="Ficha Técnica" wide>
          <div className="space-y-4 text-sm">
            {/* Encabezado del bien */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}>
                <Package size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-base leading-tight">{modalFicha.equipo}</p>
                <p className="text-xs text-gray-500">{modalFicha.categoria?.nombre_categoria}</p>
              </div>
              <EstatusBadge estatus={modalFicha.estatusOperativo} />
            </div>

            {/* Campos informativos en grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoField icon={<Tag size={14}/>}      label="No. Serie"          value={fmt(modalFicha.numSerie)} mono />
              <InfoField icon={<Tag size={14}/>}      label="No. Inventario"     value={fmt(modalFicha.numInv)} mono />
              <InfoField icon={<Shield size={14}/>}   label="Clave Presupuestal" value={fmt(modalFicha.clavePresupuestal)} mono />
              <InfoField icon={<MapPin size={14}/>}   label="Ubicación"          value={fmt(modalFicha.ubicacion)} />
              <InfoField icon={<User size={14}/>}     label="En Resguardo de"    value={fmt(modalFicha.resguardo)} />
              <InfoField icon={<Calendar size={14}/>} label="Fecha Adquisición"  value={fmtDate(modalFicha.fechaAdquisicion)} />
              <InfoField icon={<Calendar size={14}/>} label="Última Actualización" value={fmtDateTime(modalFicha.fechaActualizacion)} />
              <InfoField icon={<Package size={14}/>}  label="Cantidad"           value={modalFicha.cantidad} />
            </div>

            {/* Especificaciones TI */}
            {modalFicha.especificacionTI && CATEGORIAS_TI.includes(Number(modalFicha.idCategoria)) && (
              <div className="rounded-xl border border-blue-100 overflow-hidden">
                <div className="bg-blue-50 px-4 py-2.5 flex items-center gap-2">
                  <Monitor size={15} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Especificaciones TI</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                  <InfoField icon={<Server size={13}/>}    label="Nombre PC"      value={fmt(modalFicha.especificacionTI.nom_pc)} />
                  <InfoField icon={<Cpu size={13}/>}       label="CPU"            value={fmt(modalFicha.especificacionTI.cpu_info)} />
                  <InfoField icon={<Server size={13}/>}    label="RAM"            value={modalFicha.especificacionTI.ram_gb ? `${modalFicha.especificacionTI.ram_gb} GB` : '—'} />
                  <InfoField icon={<HardDrive size={13}/>} label="Almacenamiento" value={modalFicha.especificacionTI.almacenamiento_gb ? `${modalFicha.especificacionTI.almacenamiento_gb} GB` : '—'} />
                  <InfoField icon={<Wifi size={13}/>}      label="Dirección IP"   value={fmt(modalFicha.especificacionTI.dir_ip)} mono />
                  <InfoField icon={<Wifi size={13}/>}      label="MAC Address"    value={fmt(modalFicha.especificacionTI.mac_address)} mono />
                  <InfoField icon={<Monitor size={13}/>}   label="Sistema Op."    value={fmt(modalFicha.especificacionTI.modelo_so)} />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: QR / CÓDIGO DE BARRAS
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalQR && (
        <Modal onClose={() => setModalQR(null)} title="Identificadores" small>
          <div className="flex flex-col items-center gap-2 text-center mb-4">
            <p className="font-semibold text-gray-900">{modalQR.equipo}</p>
            <p className="text-xs text-gray-400 font-mono">Serie: {fmt(modalQR.numSerie)}</p>
            <p className="text-xs text-gray-400 font-mono">Inv: {fmt(modalQR.numInv)}</p>
          </div>
          {!modalQR.qrHash ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-center">
              Este bien no tiene un identificador único (qr_hash) en la base de datos.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Código QR</p>
                <QRCodeSVG value={modalQR.qrHash} size={170} level="H" includeMargin={false} />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col items-center overflow-hidden">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Código de Barras</p>
                <Barcode value={modalQR.qrHash} width={1.6} height={50} fontSize={12} background="transparent" margin={0} />
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: CREAR / EDITAR BIEN
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalForm && (
        <Modal
          onClose={closeForm}
          title={modalForm === 'create' ? 'Registrar Nuevo Bien' : 'Editar Bien'}
          wide
        >
          {loadingCat ? (
            <div className="flex justify-center py-10 text-gray-400 gap-3">
              <Loader2 size={20} className="animate-spin" /> Cargando catálogos...
            </div>
          ) : (
            <div className="space-y-5 text-sm">

              {/* — Campos de solo lectura (solo al editar) — */}
              {modalForm !== 'create' && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Información de Solo Lectura</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <ReadonlyField label="ID Bien" value={modalForm.id_bien} mono />
                    <ReadonlyField label="No. Serie" value={fmt(modalForm.numSerie)} mono />
                    <ReadonlyField label="Clave Presupuestal" value={fmt(modalForm.clavePresupuestal)} mono />
                  </div>
                </div>
              )}

              {/* — Sección principal — */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.id_categoria}
                    onChange={(e) => handleCatChange(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white ${formErrors.id_categoria ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccionar…</option>
                    {(catalogos?.categorias ?? []).map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria}</option>
                    ))}
                  </select>
                  {formErrors.id_categoria && <p className="text-xs text-red-500 mt-0.5">{formErrors.id_categoria}</p>}
                </div>

                {/* Unidad de Medida */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Unidad de Medida <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.id_unidad_medida}
                    onChange={(e) => setForm((f) => ({ ...f, id_unidad_medida: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white ${formErrors.id_unidad_medida ? 'border-red-400' : 'border-gray-200'}`}
                  >
                    <option value="">Seleccionar…</option>
                    {(catalogos?.unidadesMedida ?? []).map((u) => (
                      <option key={u.id_unidad_medida} value={u.id_unidad_medida}>{u.nombre_unidad} ({u.abreviatura})</option>
                    ))}
                  </select>
                  {formErrors.id_unidad_medida && <p className="text-xs text-red-500 mt-0.5">{formErrors.id_unidad_medida}</p>}
                </div>

                {/* Modelo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Modelo</label>
                  <select
                    value={form.clave_modelo}
                    onChange={(e) => setForm((f) => ({ ...f, clave_modelo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="">Sin modelo</option>
                    {(catalogos?.modelos ?? []).map((m) => (
                      <option key={m.clave_modelo} value={m.clave_modelo}>{m.descrip_disp || m.clave_modelo}</option>
                    ))}
                  </select>
                </div>

                {/* Número de Inventario */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Número de Inventario</label>
                  <input
                    type="text"
                    value={form.num_inv}
                    onChange={(e) => setForm((f) => ({ ...f, num_inv: e.target.value }))}
                    placeholder="Ej. INV-2024-001"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                {/* Estatus Operativo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estatus Operativo</label>
                  <select
                    value={form.estatus_operativo}
                    onChange={(e) => setForm((f) => ({ ...f, estatus_operativo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="EN_REPARACION">En Reparación</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    value={form.cantidad}
                    onChange={(e) => setForm((f) => ({ ...f, cantidad: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                {/* Unidad Operativa */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Unidad Operativa</label>
                  <select
                    value={form.id_unidad}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, id_unidad: e.target.value, id_ubicacion: '' }));
                      setIsAddingUbicacion(false);
                      setNewUbicacionName('');
                    }}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="">Sin unidad</option>
                    {(catalogos?.unidades ?? []).map((u) => (
                      <option key={u.id_unidad} value={u.id_unidad}>{u.nombre || u.clave}</option>
                    ))}
                  </select>
                </div>

                {/* Ubicacion Física (Depende de Unidad) */}
                {form.id_unidad && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Área / Ubicación Física</label>
                    {isAddingUbicacion ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newUbicacionName}
                          onChange={e => setNewUbicacionName(e.target.value)}
                          placeholder="Nombre de ubicación..."
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          autoFocus
                        />
                        <button type="button" onClick={handleCreateUbicacion} disabled={creatingUbicacion || !newUbicacionName.trim()}
                          className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
                          Guardar
                        </button>
                        <button type="button" onClick={() => { setIsAddingUbicacion(false); setNewUbicacionName(''); }}
                          className="px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={form.id_ubicacion}
                          onChange={(e) => setForm((f) => ({ ...f, id_ubicacion: e.target.value }))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                        >
                          <option value="">Seleccionar ubicación...</option>
                          {ubicacionesUnidad.map((u) => (
                            <option key={u.id_ubicacion} value={u.id_ubicacion}>{u.nombre_ubicacion}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setIsAddingUbicacion(true)} title="Añadir nueva ubicación a la Unidad"
                          className="px-3 py-2 border border-gray-200 text-gray-500 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
                          <Plus size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Inmueble */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Inmueble / Ubicación</label>
                  <select
                    value={form.clave_inmueble_ref}
                    onChange={(e) => setForm((f) => ({ ...f, clave_inmueble_ref: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="">Sin inmueble</option>
                    {(catalogos?.inmuebles ?? []).map((i) => (
                      <option key={i.clave} value={i.clave}>{i.desc_corta || i.descripcion || i.clave}</option>
                    ))}
                  </select>
                </div>

                {/* Usuario Resguardo */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Usuario en Resguardo</label>
                  <select
                    value={form.id_usuario_resguardo}
                    onChange={(e) => setForm((f) => ({ ...f, id_usuario_resguardo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
                  >
                    <option value="">Sin resguardo</option>
                    {(catalogos?.usuarios ?? []).map((u) => (
                      <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo} ({u.matricula})</option>
                    ))}
                  </select>
                </div>

                {/* Fecha Adquisición */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha de Adquisición</label>
                  <input
                    type="date"
                    value={form.fecha_adquisicion}
                    onChange={(e) => setForm((f) => ({ ...f, fecha_adquisicion: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* — Sección Especificaciones TI — */}
              {showTI && (
                <div className="rounded-xl border border-blue-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTI((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wide"
                  >
                    <span className="flex items-center gap-2"><Monitor size={14}/> Especificaciones TI</span>
                    {showTI ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showTI && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
                      {[
                        { key: 'nom_pc',            label: 'Nombre PC / Hostname', placeholder: 'IMSS-PC-001' },
                        { key: 'cpu_info',           label: 'CPU',                  placeholder: 'Intel Core i5-12400' },
                        { key: 'ram_gb',             label: 'RAM (GB)',              placeholder: '8', type: 'number' },
                        { key: 'almacenamiento_gb',  label: 'Almacenamiento (GB)',   placeholder: '256', type: 'number' },
                        { key: 'dir_ip',             label: 'Dirección IP',          placeholder: '192.168.1.100' },
                        { key: 'mac_address',        label: 'MAC Address',           placeholder: 'AA:BB:CC:DD:EE:FF' },
                        { key: 'dir_mac',            label: 'Dir. MAC Alt.',         placeholder: '—' },
                        { key: 'modelo_so',          label: 'Sistema Operativo',     placeholder: 'Windows 11 Pro' },
                      ].map(({ key, label, placeholder, type = 'text' }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
                          <input
                            type={type}
                            value={tiForm[key]}
                            onChange={(e) => setTiForm((f) => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* — Botones — */}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={creating || updating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg,#006341,#004d32)' }}
                >
                  {(creating || updating) ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {modalForm === 'create' ? 'Registrar Bien' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: CONFIRMAR ELIMINACIÓN
      ═══════════════════════════════════════════════════════════════════════ */}
      {modalConfirmDel && (
        <Modal onClose={() => setModalConfirmDel(null)} title="Confirmar Eliminación" small>
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle size={26} className="text-red-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">¿Eliminar este bien?</p>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-mono font-semibold">{modalConfirmDel.equipo}</span>
                {' '}— Serie: <span className="font-mono">{fmt(modalConfirmDel.numSerie)}</span>
              </p>
              <p className="text-xs text-red-500 mt-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                Esta acción es irreversible. Si el bien tiene incidencias o movimientos asociados, la eliminación será bloqueada por el sistema.
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setModalConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteBien(modalConfirmDel.id_bien)}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

import { createPortal } from 'react-dom';

function Modal({ onClose, title, children, wide = false, small = false }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 fade-in" />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] ${
        small ? 'max-w-sm' : wide ? 'max-w-3xl' : 'max-w-lg'
      } fade-in`} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        {/* Body scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoField({ label, value, icon, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 flex items-center gap-1 mb-0.5">
        {icon}{label}
      </p>
      <p className={`text-sm font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function ReadonlyField({ label, value, mono = false }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className={`text-xs py-1.5 px-2 bg-white border border-gray-200 rounded-lg text-gray-600 truncate ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
      </p>
    </div>
  );
}

function Pagination({ page, totalPages, onPage, mobile = false }) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between ${
      mobile ? 'bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3' : 'px-5 py-3 border-t border-gray-100'
    }`}>
      <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
      <div className="flex gap-1">
        <PageBtn onClick={() => onPage((p) => Math.max(1, p - 1))} disabled={page === 1} icon={<ChevronLeft size={14} />} />
        {!mobile && Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => onPage(n)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
              page === n ? 'text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            style={page === n ? { backgroundColor: '#006341' } : {}}>
            {n}
          </button>
        ))}
        <PageBtn onClick={() => onPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} icon={<ChevronRight size={14} />} />
      </div>
    </div>
  );
}

function PageBtn({ onClick, disabled, icon }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
      {icon}
    </button>
  );
}
