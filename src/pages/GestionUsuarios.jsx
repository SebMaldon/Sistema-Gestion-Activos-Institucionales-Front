import React, { useState } from 'react';
import { mockUsers, ROLES } from '../data/mockData';
import { useApp } from '../context/AppContext';
import { Users, Plus, Edit, Trash2, Shield, User, UserCog, ToggleLeft, ToggleRight, Search } from 'lucide-react';

const ROLE_BADGE = {
  'SuperAdmin': { bg: '#ede9fe', color: '#6d28d9', label: 'Usuario Maestro' },
  'Administrador': { bg: '#dcfce7', color: '#166534', label: 'Administrador' },
  'Usuario Común': { bg: '#dbeafe', color: '#1e40af', label: 'Usuario Común' },
};

export default function GestionUsuarios() {
  const { showToast } = useApp();
  const [users, setUsers] = useState(mockUsers);
  const [search, setSearch] = useState('');

  const filtered = users.filter(u =>
    u.nombre.toLowerCase().includes(search.toLowerCase()) ||
    u.area.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUser = (id) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, activo: !u.activo } : u));
    const user = users.find(u => u.id === id);
    showToast(`Usuario ${user?.activo ? 'desactivado' : 'activado'}: ${user?.nombre}`, user?.activo ? 'warning' : 'success');
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Administración de accesos y roles del sistema</p>
        </div>
        <button
          onClick={() => showToast('Módulo de alta de usuario en desarrollo.', 'info')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'Totales', val: users.length, color: '#006341', bg: '#dcfce7' },
          { label: 'Activos', val: users.filter(u => u.activo).length, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Inactivos', val: users.filter(u => !u.activo).length, color: '#dc2626', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-3 sm:p-4 border border-gray-100 shadow-sm text-center">
            <p className="text-xl sm:text-2xl font-bold" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o área..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* MOBILE: Card list */}
      <div className="md:hidden space-y-3">
        {filtered.map(user => {
          const badge = ROLE_BADGE[user.rol] || ROLE_BADGE['Usuario Común'];
          return (
            <div key={user.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: user.activo ? 'linear-gradient(135deg, #006341, #004d32)' : '#d1d5db' }}>
                  {user.nombre.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{user.nombre}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0"
                  style={{ backgroundColor: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3 truncate">{user.area}</p>
              <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
                <button
                  onClick={() => toggleUser(user.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                  style={{ backgroundColor: user.activo ? '#dcfce7' : '#f3f4f6', color: user.activo ? '#16a34a' : '#9ca3af' }}>
                  {user.activo ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                  {user.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => showToast(`Editando: ${user.nombre}`, 'info')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                  <Edit size={14} />
                </button>
                <button
                  onClick={() => showToast('Acción disponible en versión completa.', 'warning')}
                  className="w-9 h-9 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP: Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Área</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
              <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(user => {
              const badge = ROLE_BADGE[user.rol] || ROLE_BADGE['Usuario Común'];
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: user.activo ? 'linear-gradient(135deg, #006341, #004d32)' : '#d1d5db' }}>
                        {user.nombre.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{user.nombre}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 max-w-[180px] truncate">{user.area}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: badge.bg, color: badge.color }}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleUser(user.id)}
                      className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                      style={{ color: user.activo ? '#16a34a' : '#9ca3af' }}>
                      {user.activo
                        ? <ToggleRight size={18} style={{ color: '#16a34a' }} />
                        : <ToggleLeft size={18} style={{ color: '#9ca3af' }} />
                      }
                      {user.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => showToast(`Editando: ${user.nombre}`, 'info')}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Editar usuario">
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => showToast('Acción disponible en versión completa.', 'warning')}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Eliminar usuario">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
