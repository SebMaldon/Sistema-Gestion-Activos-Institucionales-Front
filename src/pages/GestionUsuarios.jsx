import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gqlClient } from '../api/client';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import {
  GET_USUARIOS, GET_ROLES, GET_CAT_SEGMENTOS, GET_CAT_UNIDADES_FISICAS,
  CREATE_USUARIO, UPDATE_USUARIO, DELETE_USUARIO, RESET_PASSWORD_ADMIN,
  TOGGLE_ESTATUS_USUARIO, HARD_DELETE_USUARIO,
} from '../api/usuarios.queries';
import {
  Users, Plus, Edit, UserX, Search, RefreshCw,
  ChevronLeft, ChevronRight, Shield,
  Trash2, UserCheck, UserMinus, X, Eye, EyeOff, Copy, CheckCircle,
  Building2, Radio,
} from 'lucide-react';
import MultiSelect from '../components/MultiSelect';
import SearchableSelect from '../components/SearchableSelect';


// ─── Constantes de roles ──────────────────────────────────────────────────────
const ROLE_BADGE = {
  1: { bg: '#ede9fe', color: '#6d28d9', label: 'Maestro' },
  2: { bg: '#dcfce7', color: '#166534', label: 'Administrador' },
  3: { bg: '#dbeafe', color: '#1e40af', label: 'Estándar' },
  4: { bg: '#fef3c7', color: '#b45309', label: 'Sin Acceso' },
};

// ─── Utilidades ──────────────────────────────────────────────────────────────
const getInitials = (name = '') => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
const avatarColor = (id) => {
  const colors = ['#006341', '#1d4ed8', '#7c3aed', '#b45309', '#0f766e', '#be185d'];
  return colors[id % colors.length];
};

/** Texto descriptivo de la unidad física de un usuario */
const unidadFisicaLabel = (u) => {
  if (!u.unidadFisica) return null;
  return u.unidadFisica.desc_corta || u.unidadFisica.descripcion || u.unidadFisica.clave;
};

/** Texto descriptivo del segmento de red de un usuario */
const segmentoLabel = (u) => {
  if (!u.segmento) return null;
  return u.segmento.nombre || u.segmento.no_ref;
};

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function StatCard({ label, val, color, bg }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-center">
      <p className="text-2xl font-bold" style={{ color }}>{val}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

import { createPortal } from 'react-dom';

function ModalOverlay({ children, onClose, wide = false }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/50 fade-in pointer-events-none" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] fade-in`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div className="bg-[#00472e] p-5 sm:px-6 flex items-center justify-between text-white flex-shrink-0">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-green-100 text-sm mt-1">{subtitle}</p>}
      </div>
      <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
        <X size={20} />
      </button>
    </div>
  );
}

// ─── Modal Crear / Editar Usuario ────────────────────────────────────────────
function UsuarioModal({ usuario, onClose, roles = [], segmentos = [], unidadesFisicas = [] }) {
  const qc = useQueryClient();
  const { showToast } = useApp();
  const isEdit = !!usuario;

  const [form, setForm] = useState({
    matricula: usuario?.matricula ?? '',
    nombre_completo: usuario?.nombre_completo ?? '',
    tipo_usuario: usuario?.tipo_usuario ?? '',
    correo_electronico: usuario?.correo_electronico ?? '',
    password: '',
    id_rol: usuario?.id_rol ?? 3,
    id_unidad: usuario?.id_unidad ?? '',          // FK segmento de red
    clave_unidad: usuario?.clave_unidad ?? '',    // FK unidad física
  });
  const [showPass, setShowPass] = useState(false);

  const createMut = useMutation({
    mutationFn: (vars) => gqlClient.request(CREATE_USUARIO, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      showToast('Usuario creado exitosamente', 'success');
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al crear usuario', 'error'),
  });

  const updateMut = useMutation({
    mutationFn: (vars) => gqlClient.request(UPDATE_USUARIO, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      showToast('Usuario actualizado', 'success');
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al actualizar', 'error'),
  });

  const isLoading = createMut.isPending || updateMut.isPending;

  const handleChange = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === 'clave_unidad') {
        next.id_unidad = '';
      } else if (k === 'id_unidad' && v) {
        const selectedSeg = segmentos.find(s => String(s.id_segmento) === String(v));
        if (selectedSeg && selectedSeg.clave) {
          next.clave_unidad = selectedSeg.clave;
        }
      }
      return next;
    });
  };

  const filteredSegmentos = React.useMemo(() => {
    if (!form.clave_unidad) return segmentos;
    return segmentos.filter(s => String(s.clave) === String(form.clave_unidad));
  }, [segmentos, form.clave_unidad]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nombre_completo) {
      showToast('El nombre es obligatorio', 'warning');
      return;
    }
    if (form.id_unidad && !form.clave_unidad) {
      showToast('Debe seleccionar la Unidad Física correspondiente al segmento', 'warning');
      return;
    }
    const vars = {
      matricula: form.matricula || null,
      nombre_completo: form.nombre_completo,
      tipo_usuario: form.tipo_usuario || null,
      correo_electronico: form.correo_electronico || null,
      id_rol: parseInt(form.id_rol),
      id_unidad: form.id_unidad ? parseInt(form.id_unidad) : null,
      clave_unidad: form.clave_unidad || null,
    };
    if (isEdit) {
      updateMut.mutate({ id_usuario: usuario.id_usuario, ...vars });
    } else {
      createMut.mutate({
        password: form.password || null,
        ...vars,
      });
    }
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <ModalOverlay onClose={onClose} wide>
      <ModalHeader 
        title={isEdit ? 'Editar Usuario' : 'Nuevo Usuario'} 
        subtitle={isEdit ? 'Modificar datos y permisos del usuario' : 'Registrar un nuevo usuario en el sistema'}
        onClose={onClose} 
      />
      <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Matrícula</label>
            <input className={inputCls} value={form.matricula} onChange={e => handleChange('matricula', e.target.value)}
              placeholder="Opcional" />
          </div>
          <div>
            <label className={labelCls}>Tipo de Usuario</label>
            <input className={inputCls} value={form.tipo_usuario} onChange={e => handleChange('tipo_usuario', e.target.value)} placeholder="Ej: Técnico" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Nombre Completo *</label>
          <input className={inputCls} value={form.nombre_completo} onChange={e => handleChange('nombre_completo', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Correo Electrónico</label>
          <input className={inputCls} type="email" value={form.correo_electronico} onChange={e => handleChange('correo_electronico', e.target.value)} />
        </div>
        {!isEdit && (
          <div>
            <label className={labelCls}>Contraseña (dejar vacío = sin acceso al sistema)</label>
            <div className="relative">
              <input className={inputCls + ' pr-10'} type={showPass ? 'text' : 'password'}
                value={form.password} onChange={e => handleChange('password', e.target.value)} />
              <button type="button" onClick={() => setShowPass(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Rol */}
        <div>
          <label className={labelCls}>Rol</label>
          <select className={inputCls} value={form.id_rol} onChange={e => handleChange('id_rol', e.target.value)}>
            {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
          </select>
        </div>

        {/* Asignación de unidad — separador visual */}
        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Asignación de Unidad</p>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Building2 size={11} className="text-green-600" />
                  Unidad Física
                </span>
              </label>
              <SearchableSelect
                value={form.clave_unidad}
                onChange={val => handleChange('clave_unidad', val || '')}
                options={[
                  { value: '', label: '— Ninguna —' },
                  ...unidadesFisicas.map(u => ({
                    value: u.clave,
                    label: (u.desc_corta ? `[${u.desc_corta}] ` : '') + (u.descripcion || u.clave)
                  }))
                ]}
                placeholder="Buscar unidad..."
                disabled={!!form.id_unidad}
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Clínica / Hospital / Delegación {!!form.id_unidad && "(Bloqueado por segmento seleccionado)"}</p>
            </div>

            {/* Segmento de red */}
            <div>
              <label className={labelCls}>
                <span className="inline-flex items-center gap-1">
                  <Radio size={11} className="text-blue-500" />
                  Segmento de Red
                </span>
              </label>
              <SearchableSelect
                value={form.id_unidad ? String(form.id_unidad) : ''}
                onChange={val => handleChange('id_unidad', val || '')}
                options={[
                  { value: '', label: '— Ninguno —' },
                  ...filteredSegmentos.map(s => ({
                    value: String(s.id_segmento),
                    label: s.nombre || s.no_ref
                  }))
                ]}
                placeholder="Buscar segmento..."
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Segmento de red / IP asignado</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
            {isLoading ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}

// ─── Modal Reset Contraseña ───────────────────────────────────────────────────
function ResetPasswordModal({ usuario, onClose }) {
  const { showToast } = useApp();
  const [adminPass, setAdminPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tempPassword, setTempPassword] = useState(null);
  const [copied, setCopied] = useState(false);

  const mut = useMutation({
    mutationFn: (vars) => gqlClient.request(RESET_PASSWORD_ADMIN, vars),
    onSuccess: (data) => {
      setTempPassword(data.resetPasswordAdmin);
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Contraseña de admin incorrecta', 'error'),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!adminPass) return;
    mut.mutate({ id_usuario_target: usuario.id_usuario, adminPassword: adminPass });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader 
        title="Resetear Contraseña" 
        subtitle="Generar una nueva contraseña de acceso"
        onClose={onClose} 
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
        {/* Info del usuario */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: avatarColor(usuario.id_usuario) }}>
            {getInitials(usuario.nombre_completo)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{usuario.nombre_completo}</p>
            <p className="text-xs text-gray-500">Matrícula: <strong>{usuario.matricula}</strong></p>
          </div>
        </div>

        {!tempPassword ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-gray-600">
              La contraseña temporal será: <strong className="text-green-700">IMSS + {usuario.matricula.toUpperCase()}</strong>
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tu contraseña (para confirmar)
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={adminPass}
                  onChange={e => setAdminPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
                  placeholder="Tu contraseña de administrador" required />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={mut.isPending}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                {mut.isPending ? 'Validando...' : 'Resetear contraseña'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={28} />
              <p className="text-sm text-gray-600 mb-3">Contraseña temporal generada. Comunícala al usuario:</p>
              <div className="flex items-center gap-2 bg-white border border-green-300 rounded-lg px-4 py-2 justify-center">
                <span className="font-mono font-bold text-green-800 text-lg tracking-widest">{tempPassword}</span>
                <button onClick={handleCopy} className="p-1 text-green-600 hover:text-green-800 transition-colors">
                  {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            <button onClick={onClose}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
              Listo
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Confirmar Desactivar/Activar ──────────────────────────────────────
function ConfirmToggleEstatusModal({ usuario, onClose }) {
  const qc = useQueryClient();
  const { showToast } = useApp();
  const isActive = usuario.estatus;

  const toggleMut = useMutation({
    mutationFn: (vars) => gqlClient.request(TOGGLE_ESTATUS_USUARIO, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      showToast(
        isActive
          ? `Usuario ${usuario.nombre_completo} desactivado`
          : `Usuario ${usuario.nombre_completo} activado`,
        isActive ? 'warning' : 'success'
      );
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al cambiar estatus', 'error'),
  });

  const handleConfirm = () => {
    toggleMut.mutate({ id_usuario: usuario.id_usuario, estatus: !isActive });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader 
        title={isActive ? 'Desactivar Usuario' : 'Activar Usuario'} 
        subtitle={isActive ? 'Suspender el acceso del usuario temporalmente' : 'Restaurar el acceso del usuario al sistema'}
        onClose={onClose} 
      />
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className={`border rounded-xl p-3 text-sm ${isActive ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <strong>{isActive ? `¿Desactivar a ${usuario.nombre_completo}?` : `¿Activar a ${usuario.nombre_completo}?`}</strong>
          <p className="mt-1 text-xs opacity-80">
            {isActive
              ? 'El usuario quedará inactivo y no podrá acceder al sistema. Sus datos históricos se conservan.'
              : 'El usuario podrá volver a acceder al sistema con sus credenciales anteriores.'}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: avatarColor(usuario.id_usuario) }}>
            {getInitials(usuario.nombre_completo)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{usuario.nombre_completo}</p>
            <p className="text-xs text-gray-500">Matrícula: <strong>{usuario.matricula}</strong></p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={toggleMut.isPending}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-colors ${isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {toggleMut.isPending ? 'Procesando...' : isActive ? 'Sí, desactivar' : 'Sí, activar'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Eliminar Permanente ────────────────────────────────────────────────
function ConfirmEliminarModal({ usuario, onClose }) {
  const qc = useQueryClient();
  const { showToast } = useApp();
  const [confirmText, setConfirmText] = useState('');

  const deleteMut = useMutation({
    mutationFn: (vars) => gqlClient.request(HARD_DELETE_USUARIO, vars),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      showToast(`Usuario ${usuario.nombre_completo} eliminado permanentemente`, 'error');
      onClose();
    },
    onError: (e) => showToast(e?.response?.errors?.[0]?.message ?? 'Error al eliminar usuario', 'error'),
  });

  const handleConfirm = () => {
    if (confirmText !== usuario.matricula) {
      showToast('La matrícula no coincide', 'warning');
      return;
    }
    deleteMut.mutate({ id_usuario: usuario.id_usuario });
  };

  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader 
        title="Eliminar Usuario Permanentemente" 
        subtitle="Esta acción no se puede deshacer"
        onClose={onClose} 
      />
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-sm text-red-800">
          <strong>⚠️ Esta acción es IRREVERSIBLE</strong>
          <p className="mt-1 text-xs text-red-600">
            Se eliminará permanentemente al usuario y todos sus registros asociados. No se puede deshacer.
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={{ background: '#ef4444' }}>
            {getInitials(usuario.nombre_completo)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{usuario.nombre_completo}</p>
            <p className="text-xs text-gray-500">Matrícula: <strong>{usuario.matricula}</strong></p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Escribe la matrícula <strong className="text-red-600">{usuario.matricula}</strong> para confirmar
          </label>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder={usuario.matricula}
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleteMut.isPending || confirmText !== usuario.matricula}
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {deleteMut.isPending ? 'Eliminando...' : 'Eliminar permanentemente'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────
export default function GestionUsuarios() {
  const { showToast } = useApp();
  const usuario = useAuthStore(s => s.usuario);
  const idRol = usuario?.id_rol ?? 3;

  const [tab, setTab] = useState('usuarios');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterEstatus, setFilterEstatus] = useState('');
  const [filterRoles, setFilterRoles] = useState([]);
  // Filtro por segmento de red (id_unidad → segmentos.id_segmento)
  const [filterSegmento, setFilterSegmento] = useState([]);
  // Filtro por unidad física (clave_unidad → unidades.clave) — filtrado en cliente
  const [filterUnidadesFisicas, setFilterUnidadesFisicas] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [cursors, setCursors] = useState([]);
  const [pageInput, setPageInput] = useState('');
  const PAGE_SIZE = 15;
  const currentPage = cursors.length + 1;

  // Debounce search
  const handleSearch = useCallback((val) => {
    setSearch(val);
    clearTimeout(window._searchTimer);
    window._searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setCursor(null);
      setCursors([]);
    }, 400);
  }, []);

  const resetPage = () => { setCursor(null); setCursors([]); };

  // Modales
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalReset, setModalReset] = useState(null);
  const [modalToggleEstatus, setModalToggleEstatus] = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);

  // ── Queries de catálogos
  const { data: catRoles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const d = await gqlClient.request(GET_ROLES);
      return d.roles ?? [];
    },
  });

  // Catálogo de segmentos de red
  const { data: catSegmentos = [] } = useQuery({
    queryKey: ['catSegmentos'],
    queryFn: async () => {
      const d = await gqlClient.request(GET_CAT_SEGMENTOS);
      return d.catSegmentos ?? [];
    },
  });

  // Catálogo de unidades físicas
  const { data: catUnidadesFisicas = [] } = useQuery({
    queryKey: ['catUnidadesFisicas'],
    queryFn: async () => {
      const d = await gqlClient.request(GET_CAT_UNIDADES_FISICAS);
      return d.catUnidades ?? [];
    },
  });

  // ── Query principal de usuarios
  const { data: usuariosData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['usuarios', filterEstatus, filterSegmento, filterRoles, debouncedSearch, cursor],
    queryFn: () => gqlClient.request(GET_USUARIOS, {
      estatus: filterEstatus === '' ? undefined : filterEstatus === 'activos',
      search: debouncedSearch || undefined,
      roles: filterRoles.length > 0 ? filterRoles.map(Number) : undefined,
      pagination: { first: PAGE_SIZE, after: cursor ?? undefined },
    }),
    select: d => d.usuarios,
  });

  // Filtro de unidad física y segmento aplicado en cliente
  const allUsuarios = usuariosData?.edges?.map(e => e.node) ?? [];
  const usuarios = allUsuarios.filter(u => {
    if (filterUnidadesFisicas.length > 0 && !filterUnidadesFisicas.includes(u.clave_unidad)) return false;
    if (filterSegmento.length > 0 && !filterSegmento.includes(String(u.id_unidad))) return false;
    return true;
  });

  const pageInfo = usuariosData?.pageInfo;
  const totalCount = pageInfo?.totalCount ?? 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

  const handleNextPage = () => {
    if (pageInfo?.hasNextPage && pageInfo.endCursor) {
      setCursors(p => [...p, cursor]);
      setCursor(pageInfo.endCursor);
    }
  };

  const handlePrevPage = () => {
    const prev = [...cursors];
    const prevCursor = prev.pop() ?? null;
    setCursors(prev);
    setCursor(prevCursor);
  };

  // Ir a página: solo páginas ya visitadas (cursors[0..currentPage-1])
  const handleJumpToPage = (e) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (isNaN(p) || p < 1 || p > currentPage) { setPageInput(''); return; }
    if (p === currentPage) { setPageInput(''); return; }
    const targetCursor = p === 1 ? null : cursors[p - 1];
    setCursors(cursors.slice(0, p - 1));
    setCursor(targetCursor ?? null);
    setPageInput('');
  };

  const qc = useQueryClient();

  const isAdmin = idRol <= 2;
  const isMaestro = idRol === 2;

  // Ordenar roles: Maestro(1), Admin(2), Estándar(3), Sin Acceso(4)
  const roleOrder = { '1': 1, '2': 2, '3': 3, '4': 4 };
  const sortedRoles = [...catRoles].sort((a, b) => (roleOrder[a.id_rol] || 99) - (roleOrder[b.id_rol] || 99));

  return (
    <div className="flex flex-col p-4 sm:p-6 gap-5 fade-in
      min-h-[calc(100dvh-70px)] overflow-y-auto
      sm:h-[calc(100vh-70px)] sm:overflow-hidden sm:min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administración de accesos y roles</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setModalCrear(true)}
            id="btn-nuevo-usuario"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-sm"
            style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
            <Plus size={16} /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-5">
        {/* Filtros rápidos (Roles y Totales) en una sola fila deslizable */}
        <div className="flex flex-nowrap overflow-x-auto pb-2 gap-3 sm:gap-4 scrollbar-hide">
          <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 bg-white shadow-sm w-1/3 min-w-[280px] flex-shrink-0 relative">
            <span className="text-3xl font-black text-gray-800">{totalCount}</span>
            <span className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-wider mt-0.5 text-center">Registros Totales</span>

            {/* Slider Toggle 3-estados */}
            <div className="flex bg-gray-100 rounded-lg p-1.5 mt-3 w-full relative max-w-[320px]">
              <button
                onClick={() => { setFilterEstatus(''); resetPage(); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === '' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
                Todos
              </button>
              <button
                onClick={() => { setFilterEstatus('activos'); resetPage(); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === 'activos' ? 'bg-green-500 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                Activos
              </button>
              <button
                onClick={() => { setFilterEstatus('inactivos'); resetPage(); }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === 'inactivos' ? 'bg-orange-500 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                Inact.
              </button>
            </div>
          </div>

          {sortedRoles.map(r => {
            const isSelected = filterRoles.includes(r.id_rol);
            // Default styling based on role ID
            let badge = { bg: '#f3f4f6', color: '#4b5563' };
            if (String(r.id_rol) === '1') badge = { bg: '#ede9fe', color: '#6d28d9' }; // Maestro
            if (String(r.id_rol) === '2') badge = { bg: '#dcfce7', color: '#166534' }; // Admin
            if (String(r.id_rol) === '3') badge = { bg: '#dbeafe', color: '#1e40af' }; // Estandar
            if (String(r.id_rol) === '4') badge = { bg: '#fef3c7', color: '#b45309' }; // Sin Acceso

            return (
              <button
                key={r.id_rol}
                onClick={() => {
                  setFilterRoles(prev => prev.includes(r.id_rol) ? prev.filter(id => id !== r.id_rol) : [...prev, r.id_rol]);
                  resetPage();
                }}
                className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl border transition-all duration-200 flex-1 min-w-[110px] flex-shrink-0 ${isSelected ? 'shadow-sm border-2' : 'hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: isSelected ? badge.bg : '#ffffff',
                  borderColor: isSelected ? badge.color : '#f3f4f6',
                  color: isSelected ? badge.color : '#6b7280'
                }}
              >
                {String(r.id_rol) <= '2' ? (
                  <Shield size={16} className="mb-1" style={{ color: isSelected ? badge.color : '#9ca3af' }} />
                ) : (
                  <Users size={16} className="mb-1" style={{ color: isSelected ? badge.color : '#9ca3af' }} />
                )}
                <span className="text-[10px] sm:text-xs font-bold leading-tight text-center uppercase tracking-wide">{r.nombre_rol}</span>
              </button>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm relative z-50">
          <div className="flex flex-col md:flex-row flex-wrap gap-3 items-center">
            {/* Búsqueda texto */}
            <div className="relative flex-1 min-w-[200px] w-full md:w-auto">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o matrícula..."
                value={search}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-[38px]"
              />
            </div>

            {/* Filtro por Unidad Física */}
            <div className="flex-1 min-w-[220px] w-full md:w-auto z-[60]">
              <MultiSelect
                options={catUnidadesFisicas.map(u => ({
                  value: u.clave,
                  label: (u.desc_corta ? `[${u.desc_corta}] ` : '') + (u.descripcion || u.clave)
                }))}
                selectedValues={filterUnidadesFisicas}
                onChange={vals => { setFilterUnidadesFisicas(vals); resetPage(); }}
                placeholder="🏥 Todas las unidades"
              />
            </div>

            <div className="flex-1 min-w-[180px] w-full md:w-auto z-[60]">
              <MultiSelect
                selectedValues={filterSegmento}
                onChange={vals => { setFilterSegmento(vals); resetPage(); }}
                options={[
                  ...catSegmentos
                    .filter(s => filterUnidadesFisicas.length === 0 || filterUnidadesFisicas.includes(String(s.clave)))
                    .map(s => ({
                      value: String(s.id_segmento),
                      label: s.nombre || s.no_ref
                    }))
                ]}
                placeholder="📡 Todos los segmentos"
              />
            </div>

            <button onClick={() => {
              setSearch('');
              setDebouncedSearch('');
              setFilterEstatus('');
              setFilterSegmento([]);
              setFilterUnidadesFisicas([]);
              setFilterRoles([]);
              setCursor(null);
              setCursors([]);
              qc.invalidateQueries({ queryKey: ['usuarios'] });
              refetch();
            }}
              className="h-[38px] w-full md:w-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors shrink-0" title="Refrescar">
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tabla desktop */}
        <div className="hidden md:flex md:flex-col flex-1 min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex-1 overflow-y-auto relative">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-100 shadow-sm">
                <tr>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={12} className="text-green-600" /> Unidad Física
                    </span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="flex items-center gap-1.5">
                      <Radio size={12} className="text-blue-500" /> Segmento Red
                    </span>
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
                  {isAdmin && <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-sm text-gray-400">Cargando...</td>
                  </tr>
                ) : usuarios.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-sm text-gray-400">No se encontraron usuarios</td>
                  </tr>
                ) : usuarios.map(u => {
                  const badge = ROLE_BADGE[u.id_rol] || ROLE_BADGE[3];
                  const ufLabel = unidadFisicaLabel(u);
                  const segLabel = segmentoLabel(u);
                  return (
                    <tr key={u.id_usuario} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: u.estatus ? avatarColor(u.id_usuario) : '#d1d5db' }}>
                            {getInitials(u.nombre_completo)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{u.nombre_completo}</p>
                            <p className="text-xs text-gray-400">{u.matricula} {u.correo_electronico && `• ${u.correo_electronico}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      {/* Unidad física */}
                      <td className="px-5 py-4">
                        {ufLabel ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-medium">
                            <Building2 size={11} />
                            {ufLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      {/* Segmento de red */}
                      <td className="px-5 py-4">
                        {segLabel ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-lg font-medium">
                            <Radio size={11} />
                            {segLabel}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isAdmin ? (
                          <button
                            onClick={() => setModalToggleEstatus(u)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${u.estatus ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                            {u.estatus ? <UserCheck size={13} /> : <UserX size={13} />}
                            {u.estatus ? 'Activo' : 'Inactivo'}
                          </button>
                        ) : (
                          <span className={`text-xs font-semibold ${u.estatus ? 'text-green-600' : 'text-gray-400'}`}>
                            {u.estatus ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => setModalEditar(u)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors" title="Editar">
                              <Edit size={14} />
                            </button>
                            <button onClick={() => setModalReset(u)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Resetear contraseña">
                              <Shield size={14} />
                            </button>
                            <button onClick={() => setModalEliminar(u)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition-colors" title="Eliminar permanentemente">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards móvil */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto space-y-3 pb-2">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-gray-400">Cargando...</div>
          ) : usuarios.map(u => {
            const badge = ROLE_BADGE[u.id_rol] || ROLE_BADGE[3];
            const ufLabel = unidadFisicaLabel(u);
            const segLabel = segmentoLabel(u);
            return (
              <div key={u.id_usuario} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: u.estatus ? avatarColor(u.id_usuario) : '#d1d5db' }}>
                    {getInitials(u.nombre_completo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{u.nombre_completo}</p>
                    <p className="text-xs text-gray-400">{u.matricula}</p>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </div>
                {/* Unidad y segmento en móvil */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ufLabel && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg font-medium">
                      <Building2 size={10} />{ufLabel}
                    </span>
                  )}
                  {segLabel && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg font-medium">
                      <Radio size={10} />{segLabel}
                    </span>
                  )}
                  {!ufLabel && !segLabel && (
                    <span className="text-xs text-gray-400">Sin unidad asignada</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => setModalToggleEstatus(u)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${u.estatus ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-600'}`}>
                      {u.estatus ? <UserCheck size={13} /> : <UserX size={13} />}
                      {u.estatus ? 'Activo' : 'Inactivo'}
                    </button>
                    <button onClick={() => setModalEditar(u)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setModalReset(u)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                      <Shield size={14} />
                    </button>
                    <button onClick={() => setModalEliminar(u)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Paginación */}
        <div className="bg-gray-50 border-t border-gray-100 p-3 flex flex-col gap-2 flex-shrink-0">
          {/* Info total */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700">
              Total: <strong>{totalCount || 0}</strong> usuarios registrados.
            </span>
            <span className="font-bold text-gray-400 uppercase tracking-wider">
              Pág. {currentPage}/{totalPages}
            </span>
          </div>

          {/* Botones de paginación */}
          <div className="flex items-center gap-1 flex-wrap justify-center">
            <button onClick={handlePrevPage} disabled={cursors.length === 0}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronLeft size={15} />
            </button>

            {/* Páginas numeradas usando historial de cursors */}
            {currentPage > 2 && (
              <button onClick={() => { setCursors([]); setCursor(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0">
                1
              </button>
            )}
            {currentPage > 3 && <span className="px-1 text-gray-400 text-xs">...</span>}
            {currentPage > 1 && (
              <button onClick={handlePrevPage}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0">
                {currentPage - 1}
              </button>
            )}
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0">
              {currentPage}
            </button>
            {pageInfo?.hasNextPage && (
              <button onClick={handleNextPage}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0">
                {currentPage + 1}
              </button>
            )}
            {currentPage < totalPages - 2 && <span className="px-1 text-gray-400 text-xs">...</span>}
            {currentPage < totalPages - 1 && totalPages > 1 && (
              <span className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">{totalPages}</span>
            )}

            <button onClick={handleNextPage} disabled={!pageInfo?.hasNextPage}
              className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors flex-shrink-0">
              <ChevronRight size={15} />
            </button>

            {/* Ir a página (solo páginas visitadas) */}
            <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 pl-2">
              <input
                type="number" min="1" max={currentPage}
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                placeholder="Ir a..."
                title={`Páginas visitadas: 1 a ${currentPage}`}
                className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white text-center"
              />
              <button type="submit" disabled={!pageInput}
                className="px-2 py-1.5 bg-[#006341]/10 text-[#006341] font-semibold text-xs rounded-lg hover:bg-[#006341]/20 disabled:opacity-50 transition-colors">
                Ir
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── MODALES ──────────────────────────────────────────────────────── */}
      {modalCrear && (
        <UsuarioModal
          roles={catRoles}
          segmentos={catSegmentos}
          unidadesFisicas={catUnidadesFisicas}
          onClose={() => setModalCrear(false)}
        />
      )}
      {modalEditar && (
        <UsuarioModal
          usuario={modalEditar}
          roles={catRoles}
          segmentos={catSegmentos}
          unidadesFisicas={catUnidadesFisicas}
          onClose={() => setModalEditar(null)}
        />
      )}
      {modalReset && (
        <ResetPasswordModal usuario={modalReset} onClose={() => setModalReset(null)} />
      )}
      {modalToggleEstatus && (
        <ConfirmToggleEstatusModal usuario={modalToggleEstatus} onClose={() => setModalToggleEstatus(null)} />
      )}
      {modalEliminar && (
        <ConfirmEliminarModal usuario={modalEliminar} onClose={() => setModalEliminar(null)} />
      )}
    </div>
  );
}
