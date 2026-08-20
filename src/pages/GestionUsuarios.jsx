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
 Building2, Radio, AlertTriangle
} from 'lucide-react';
import MultiSelect from '../components/MultiSelect';
import SearchableSelect from '../components/SearchableSelect';

const highlightText = (text, query) => {
  if (!text || !query) return text;
  const str = String(text);
  const q = String(query).trim();
  if (!q) return text;

  const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQ})`, 'gi');
  const parts = str.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-yellow-300 dark:bg-yellow-500/50 text-gray-950 dark:text-gray-100 rounded px-0.5 font-bold shadow-sm">
        {part}
      </mark>
    ) : part
  );
};


// ─── Constantes de roles ──────────────────────────────────────────────────────
const ROLE_BADGE = {
 1: { bg: 'bg-purple-100 dark:bg-purple-900/30', color: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50', label: 'Maestro' },
 2: { bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Administrador' },
 3: { bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50', label: 'Estándar' },
 4: { bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800/50', label: 'Sin Acceso' },
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
 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm text-center">
 <p className="text-2xl font-bold" style={{ color }}>{val}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
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
 <div className="absolute inset-0 bg-black/50 dark:bg-black/70 fade-in pointer-events-none" />
 <div
 className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100vh-4rem)] fade-in`}
 >
 {children}
 </div>
 </div>,
 document.body
 );
}

function ModalHeader({ title, subtitle, onClose }) {
 return (
 <div className="bg-[#00472e] dark:bg-[#002618] p-5 sm:px-6 flex items-center justify-between text-white flex-shrink-0">
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
function UsuarioModal({ usuario, onClose, roles = [], unidadesFisicas = [] }) {
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
 clave_unidad: usuario?.clave_unidad ?? '', // FK unidad física
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
 return next;
 });
 };

 const handleSubmit = (e) => {
 e.preventDefault();
 if (!form.nombre_completo) {
 showToast('El nombre es obligatorio', 'warning');
 return;
 }
 const vars = {
 matricula: form.matricula || null,
 nombre_completo: form.nombre_completo,
 tipo_usuario: form.tipo_usuario || null,
 correo_electronico: form.correo_electronico || null,
 id_rol: parseInt(form.id_rol),
 id_unidad: null,
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

 const inputCls = 'w-full px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';
 const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1';

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

 {/* Asignación de unidad */}
 <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
 <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Asignación de Unidad</p>
 <div className="grid grid-cols-1 gap-4">
 <div>
 <label className={labelCls}>
 <span className="inline-flex items-center gap-1">
 <Building2 size={11} className="text-green-600 dark:text-green-400" />
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
 />
 <p className="text-[10px] text-gray-400 mt-0.5">Clínica / Hospital / Delegación</p>
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-2">
 <button type="button" onClick={onClose}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors">
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
 const copyTextFallback = (text) => {
 if (navigator.clipboard && window.isSecureContext) {
 navigator.clipboard.writeText(text).catch(() => fallback(text));
 } else {
 fallback(text);
 }
 };
 const fallback = (text) => {
 var textArea = document.createElement("textarea");
 textArea.value = text;
 textArea.style.position = "fixed";
 document.body.appendChild(textArea);
 textArea.focus();
 textArea.select();
 try { document.execCommand('copy'); } catch (err) {}
 document.body.removeChild(textArea);
 };
 copyTextFallback(tempPassword);
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
 <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 rounded-xl p-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
 style={{ background: avatarColor(usuario.id_usuario) }}>
 {getInitials(usuario.nombre_completo)}
 </div>
 <div>
 <p className="text-sm font-bold text-gray-900 dark:text-gray-100 ">{usuario.nombre_completo}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">Matrícula: <strong>{usuario.matricula}</strong></p>
 </div>
 </div>

 {!tempPassword ? (
 <form onSubmit={handleSubmit} className="space-y-4">
 <p className="text-sm text-gray-600 dark:text-gray-400 ">
 La contraseña temporal será: <strong className="text-green-700 dark:text-green-400 dark:text-green-300">IMSS + {usuario.matricula.toUpperCase()}</strong>
 </p>
 <div>
 <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
 Tu contraseña (para confirmar)
 </label>
 <div className="relative">
 <input type={showPass ? 'text' : 'password'} value={adminPass}
 onChange={e => setAdminPass(e.target.value)}
 className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 pr-10"
 placeholder="Tu contraseña de administrador" required />
 <button type="button" onClick={() => setShowPass(p => !p)}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
 {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
 </button>
 </div>
 </div>
 <div className="flex gap-3">
 <button type="button" onClick={onClose}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 ">
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
 <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 rounded-xl p-4 text-center">
 <CheckCircle className="mx-auto mb-2 text-green-600 dark:text-green-400" size={28} />
 <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Contraseña temporal generada. Comunícala al usuario:</p>
 <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-800/50 rounded-lg px-4 py-2 justify-center">
 <span className="font-mono font-bold text-green-800 dark:text-green-300 text-lg tracking-widest">{tempPassword}</span>
 <button onClick={handleCopy} className="p-1 text-green-600 dark:text-green-400 hover:text-green-800 transition-colors">
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
 <div className={`border rounded-xl p-3 text-sm ${isActive ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 text-orange-700 dark:text-orange-400' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50 dark:border-green-800/50 text-green-700 dark:text-green-400 dark:text-green-300'}`}>
 <strong>{isActive ? `¿Desactivar a ${usuario.nombre_completo}?` : `¿Activar a ${usuario.nombre_completo}?`}</strong>
 <p className="mt-1 text-xs opacity-80">
 {isActive
 ? 'El usuario quedará inactivo y no podrá acceder al sistema. Sus datos históricos se conservan.'
 : 'El usuario podrá volver a acceder al sistema con sus credenciales anteriores.'}
 </p>
 </div>
 <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 dark:border-amber-800/50 rounded-xl p-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
 style={{ background: avatarColor(usuario.id_usuario) }}>
 {getInitials(usuario.nombre_completo)}
 </div>
 <div>
 <p className="text-sm font-bold text-gray-900 dark:text-gray-100 ">{usuario.nombre_completo}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">Matrícula: <strong>{usuario.matricula}</strong></p>
 </div>
 </div>
 <div className="flex gap-3">
 <button type="button" onClick={onClose}
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 ">
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
 <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 rounded-xl p-3 text-sm text-red-800 dark:text-red-300">
 <strong>⚠️ Esta acción es IRREVERSIBLE</strong>
 <p className="mt-1 text-xs text-red-600 dark:text-red-400">
 Se eliminará permanentemente al usuario y todos sus registros asociados. No se puede deshacer.
 </p>
 </div>
 <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3">
 <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
 style={{ background: '#ef4444' }}>
 {getInitials(usuario.nombre_completo)}
 </div>
 <div>
 <p className="text-sm font-bold text-gray-900 dark:text-gray-100 ">{usuario.nombre_completo}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">Matrícula: <strong>{usuario.matricula}</strong></p>
 </div>
 </div>
 <div>
 <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
 Escribe la matrícula <strong className="text-red-600 dark:text-red-400">{usuario.matricula}</strong> para confirmar
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
 className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 ">
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
 const [filterDuplicados, setFilterDuplicados] = useState(false);
 // Filtro por unidad física (clave_unidad → unidades.clave) — filtrado en cliente
 const [filterUnidadesFisicas, setFilterUnidadesFisicas] = useState([]);
 const [currentPage, setCurrentPage] = useState(1);
 const setCursor = () => {};
 const setCursors = () => setCurrentPage(1);
 const cursor = null;
 const cursors = { length: currentPage - 1 };
 const [pageInput, setPageInput] = useState('');
 const PAGE_SIZE = 10;
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
  queryKey: ['usuarios', filterEstatus, filterRoles, filterUnidadesFisicas, debouncedSearch, currentPage, filterDuplicados],
  queryFn: () => gqlClient.request(GET_USUARIOS, {
  estatus: filterEstatus === '' ? undefined : filterEstatus === 'activos',
  search: debouncedSearch || undefined,
  roles: filterRoles.length > 0 ? filterRoles.map(Number) : undefined,
  claves_unidades: filterUnidadesFisicas.length > 0 ? filterUnidadesFisicas : undefined,
  duplicados: filterDuplicados || undefined,
  pagination: { first: PAGE_SIZE, page: currentPage },
  }),
 select: d => d.usuarios,
 });

 let usuarios = usuariosData?.edges?.map(e => e.node) ?? [];

 // Matrículas duplicadas en la página actual
 const matriculaCount = usuarios.reduce((acc, u) => {
   if (u.matricula) acc[u.matricula] = (acc[u.matricula] || 0) + 1;
   return acc;
 }, {});
 const matriculasDup = new Set(Object.keys(matriculaCount).filter(m => matriculaCount[m] > 1));

 const pageInfo = usuariosData?.pageInfo;
 const totalCount = pageInfo?.totalCount ?? 0;
 const totalPages = totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1;

 const handleNextPage = () => { if (currentPage < (typeof totalPages !== 'undefined' ? totalPages : 9999)) setCurrentPage(p => p + 1); };

 const handlePrevPage = () => { setCurrentPage(p => Math.max(1, p - 1)); };

 // Ir a página: solo páginas ya visitadas (cursors[0..currentPage-1])
 const handleJumpToPage = (e) => { e.preventDefault(); const p = parseInt(pageInput); if (!isNaN(p) && p >= 1 && p <= (typeof totalPages !== 'undefined' ? totalPages : 9999)) { setCurrentPage(p); } setPageInput(''); };

 const qc = useQueryClient();

 const isAdmin = idRol <= 2;

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
 <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 ">Gestión de Usuarios</h1>
 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administración de accesos y roles</p>
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
 <div className="flex flex-col items-center justify-center p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm w-1/3 min-w-[280px] flex-shrink-0 relative">
 <span className="text-3xl font-black text-gray-800 dark:text-gray-200 ">{totalCount}</span>
 <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-0.5 text-center">Registros Totales</span>

 {/* Slider Toggle 3-estados */}
 <div className="flex bg-gray-100 dark:bg-gray-900/60 rounded-lg p-1.5 mt-3 w-full relative max-w-[320px]">
 <button
 onClick={() => { setFilterEstatus(''); resetPage(); }}
 className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === '' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-gray-100' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>
 Todos
 </button>
 <button
 onClick={() => { setFilterEstatus('activos'); resetPage(); }}
 className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === 'activos' ? 'bg-green-500 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>
 Activos
 </button>
 <button
 onClick={() => { setFilterEstatus('inactivos'); resetPage(); }}
 className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all z-10 ${filterEstatus === 'inactivos' ? 'bg-orange-500 shadow-sm text-white' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'}`}>
 Inact.
 </button>
 </div>
 </div>

 {sortedRoles.map(r => {
 const isSelected = filterRoles.includes(r.id_rol);
 // Default styling based on role ID
 let badge = { bg: 'bg-gray-100 dark:bg-gray-800/50', color: 'text-gray-600 dark:text-gray-400', border: 'border-gray-200 dark:border-gray-700' };
 if (String(r.id_rol) === '1') badge = ROLE_BADGE[1];
 if (String(r.id_rol) === '2') badge = ROLE_BADGE[2];
 if (String(r.id_rol) === '3') badge = ROLE_BADGE[3];
 if (String(r.id_rol) === '4') badge = ROLE_BADGE[4];

 return (
 <button
 key={r.id_rol}
 onClick={() => {
 setFilterRoles(prev => prev.includes(r.id_rol) ? prev.filter(id => id !== r.id_rol) : [...prev, r.id_rol]);
 resetPage();
 }}
 className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl border transition-all duration-200 flex-1 min-w-[110px] flex-shrink-0 ${isSelected ? `shadow-sm border-2 ${badge.bg} ${badge.border}` : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
 >
 <div className={isSelected ? badge.color : 'text-gray-400 dark:text-gray-500'}>
 {String(r.id_rol) <= '2' ? (
 <Shield size={16} className="mb-1" />
 ) : (
 <Users size={16} className="mb-1" />
 )}
 </div>
 <span className={`text-[10px] sm:text-xs font-bold leading-tight text-center uppercase tracking-wide ${isSelected ? badge.color : 'text-gray-500 dark:text-gray-400'}`}>{r.nombre_rol}</span>
 </button>
 )
 })}
 </div>

 {/* Filtros */}
 <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm relative z-50">
 <div className="flex flex-col md:flex-row flex-wrap gap-3 items-center">
 {/* Búsqueda texto */}
 <div className="relative flex-1 min-w-[200px] w-full md:w-auto">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 type="text"
 placeholder="Buscar por nombre, matrícula o correo..."
 value={search}
 onChange={e => handleSearch(e.target.value)}
 className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 h-[38px]"
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

 <button
  onClick={() => { setFilterDuplicados(p => !p); resetPage(); }}
  className={`h-[38px] flex items-center justify-center gap-1.5 px-3 rounded-lg border transition-colors shrink-0 ${filterDuplicados ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50 shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50'}`}
  title="Filtrar matrículas duplicadas"
 >
  <AlertTriangle size={15} className={filterDuplicados ? '' : 'text-gray-400'} />
  <span className="text-xs font-semibold hidden md:inline">Duplicados</span>
 </button>

 <button onClick={() => {
 setSearch('');
 setDebouncedSearch('');
 setFilterEstatus('');
 setFilterUnidadesFisicas([]);
 setFilterRoles([]);
 setFilterDuplicados(false);
 setCursor(null);
 setCursors([]);
 qc.invalidateQueries({ queryKey: ['usuarios'] });
 refetch();
 }}
 className="h-[38px] w-full md:w-10 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors shrink-0" title="Refrescar">
 <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />
 </button>
 </div>
 </div>

 {/* Tabla desktop */}
 <div className="hidden md:flex md:flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
 <div className="flex-1 overflow-y-auto relative">
 <table className="w-full text-sm text-left">
 <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
 <tr>
 <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Usuario</th>
 <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Rol</th>
 <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
 <span className="flex items-center gap-1.5">
 <Building2 size={12} className="text-green-600 dark:text-green-400" /> Unidad Física
 </span>
 </th>
 <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Estatus</th>
 {isAdmin && <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Acciones</th>}
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
 {isLoading ? (
 <tr>
 <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-sm text-gray-400">Cargando...</td>
 </tr>
 ) : usuarios.length === 0 ? (
 <tr>
 <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center text-sm text-gray-400">No se encontraron usuarios</td>
 </tr>
 ) : usuarios.map(u => {
 const badge = ROLE_BADGE[u.id_rol] || ROLE_BADGE[3];
 const ufLabel = unidadFisicaLabel(u);
 const isDup = filterDuplicados || matriculasDup.has(u.matricula);
 return (
 <tr key={u.id_usuario} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 transition-colors ${isDup ? 'bg-red-50 dark:bg-red-900/10 border-l-4 border-l-red-500' : ''}`}>
 <td className="px-5 py-4">
 <div className="flex items-center gap-3">
 <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
 style={{ background: u.estatus ? avatarColor(u.id_usuario) : '#d1d5db' }}>
 {getInitials(u.nombre_completo)}
 </div>
 <div>
 <div className="flex items-center gap-1.5">
   <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{highlightText(u.nombre_completo, debouncedSearch)}</p>
   {isDup && (
     <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50" title="Matrícula duplicada en el sistema">
       ⚠ Dup.
     </span>
   )}
 </div>
 <p className="text-xs text-gray-400">{highlightText(u.matricula, debouncedSearch)} {u.correo_electronico && <>• {highlightText(u.correo_electronico, debouncedSearch)}</>}</p>
 </div>
 </div>
 </td>
 <td className="px-5 py-4">
 <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.color} border ${badge.border || 'border-transparent'}`}>
 {highlightText(badge.label, debouncedSearch)}
 </span>
 </td>
 {/* Unidad física */}
 <td className="px-5 py-4">
 {ufLabel ? (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg font-medium">
 <Building2 size={11} />
 {ufLabel}
 </span>
 ) : (
 <span className="text-xs text-gray-300">—</span>
 )}
 </td>
 <td className="px-5 py-4">
 {isAdmin ? (
 <button
 onClick={() => setModalToggleEstatus(u)}
 className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${u.estatus ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 hover:bg-green-100' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100'}`}>
 {u.estatus ? <UserCheck size={13} /> : <UserX size={13} />}
 {u.estatus ? 'Activo' : 'Inactivo'}
 </button>
 ) : (
 <span className={`text-xs font-semibold ${u.estatus ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
 {u.estatus ? 'Activo' : 'Inactivo'}
 </span>
 )}
 </td>
 {isAdmin && (
 <td className="px-5 py-4">
 <div className="flex items-center gap-1.5">
 <button onClick={() => setModalEditar(u)}
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors" title="Editar">
 <Edit size={14} />
 </button>
 <button onClick={() => setModalReset(u)}
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors" title="Resetear contraseña">
 <Shield size={14} />
 </button>
 <button onClick={() => setModalEliminar(u)}
 className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors" title="Eliminar permanentemente">
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
 const isDup = filterDuplicados || matriculasDup.has(u.matricula);
 return (
 <div key={u.id_usuario} className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm p-4 ${isDup ? 'border-red-300 dark:border-red-700 border-l-4 border-l-red-500' : 'border-gray-100 dark:border-gray-800'}`}>
 <div className="flex items-center gap-3 mb-3">
 <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
 style={{ background: u.estatus ? avatarColor(u.id_usuario) : '#d1d5db' }}>
 {getInitials(u.nombre_completo)}
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5">
   <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{highlightText(u.nombre_completo, debouncedSearch)}</p>
   {isDup && (
     <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex-shrink-0">
       ⚠ Dup.
     </span>
   )}
 </div>
 <p className="text-xs text-gray-400">{highlightText(u.matricula, debouncedSearch)}</p>
 </div>
 <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.color} border ${badge.border || 'border-transparent'}`}>
 {highlightText(badge.label, debouncedSearch)}
 </span>
 </div>
 {/* Unidad en móvil */}
 <div className="flex flex-wrap gap-1.5 mb-3">
 {ufLabel && (
 <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-lg font-medium">
 <Building2 size={10} />{ufLabel}
 </span>
 )}
 {!ufLabel && (
 <span className="text-xs text-gray-400">Sin unidad asignada</span>
 )}
 </div>
 {isAdmin && (
 <div className="flex items-center gap-2 pt-3 border-t border-gray-50 dark:border-gray-800">
 <button
 onClick={() => setModalToggleEstatus(u)}
 className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold ${u.estatus ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
 {u.estatus ? <UserCheck size={13} /> : <UserX size={13} />}
 {u.estatus ? 'Activo' : 'Inactivo'}
 </button>
 <button onClick={() => setModalEditar(u)}
 className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
 <Edit size={14} />
 </button>
 <button onClick={() => setModalReset(u)}
 className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
 <Shield size={14} />
 </button>
 <button onClick={() => setModalEliminar(u)}
 className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
 <Trash2 size={14} />
 </button>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Paginación */}
 <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-3 flex flex-col gap-2 flex-shrink-0">
 {/* Info total */}
 <div className="flex items-center justify-between text-xs">
 <span className="font-semibold text-gray-700 dark:text-gray-300 ">
 Total: <strong>{totalCount || 0}</strong> usuarios registrados.
 </span>
 <span className="font-bold text-gray-400 uppercase tracking-wider">
 Pág. {currentPage}/{totalPages}
 </span>
 </div>

 {/* Botones de paginación */}
 <div className="flex items-center gap-1 flex-wrap justify-center">
 <button onClick={handlePrevPage} disabled={cursors.length === 0}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
 <ChevronLeft size={15} />
 </button>

 <div className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-[260px] order-last sm:order-none mt-2 sm:mt-0">
 {/* Páginas numeradas usando historial de cursors */}
 {currentPage > 2 && (
 <button onClick={() => { setCursors([]); setCursor(null); }}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
 1
 </button>
 )}
 {currentPage > 3 && <span className="px-1 text-gray-400 text-xs">...</span>}
 {currentPage > 1 && (
 <button onClick={handlePrevPage}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
 {currentPage - 1}
 </button>
 )}
 <button className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-[#006341] text-white shadow-sm flex-shrink-0">
 {currentPage}
 </button>
 {currentPage < (typeof totalPages !== 'undefined' ? totalPages : 9999) && (
 <button onClick={handleNextPage}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0">
 {currentPage + 1}
 </button>
 )}
 {currentPage < totalPages - 2 && <span className="px-1 text-gray-400 text-xs">...</span>}
 {currentPage < totalPages - 1 && totalPages > 1 && (
 <button
 onClick={() => setCurrentPage(totalPages)}
 className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 flex-shrink-0"
 >
 {totalPages}
 </button>
 )}
 </div>

 <button onClick={handleNextPage} disabled={currentPage >= (typeof totalPages !== 'undefined' ? totalPages : 1)}
 className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors flex-shrink-0">
 <ChevronRight size={15} />
 </button>

 {/* Ir a página (solo páginas visitadas) */}
 <form onSubmit={handleJumpToPage} className="flex items-center gap-1 ml-1 border-l border-gray-200 dark:border-gray-700 pl-2">
 <input
 type="number" min="1" max={totalPages || 1}
 value={pageInput}
 onChange={e => setPageInput(e.target.value)}
 placeholder="Ir a..."
 title={`Páginas: 1 a `}
 className="w-14 px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#006341] focus:ring-1 focus:ring-[#006341] bg-white dark:bg-gray-800 text-center"
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
 unidadesFisicas={catUnidadesFisicas}
 onClose={() => setModalCrear(false)}
 />
 )}
 {modalEditar && (
 <UsuarioModal
 usuario={modalEditar}
 roles={catRoles}
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
