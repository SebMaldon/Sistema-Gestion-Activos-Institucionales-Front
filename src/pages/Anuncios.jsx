import React, { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Users, Building2, User, Globe, Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { gqlClient } from '../api/client';
import { CREATE_NOTIFICACION_MUTATION, TODAS_NOTIFICACIONES_QUERY, DELETE_NOTIFICACION_MUTATION } from '../api/anuncios.queries';
import { GET_USUARIOS } from '../api/usuarios.queries';
import { GET_UNIDADES_FISICAS_QUERY } from '../api/unidades.queries';
import { useApp } from '../context/AppContext';
import { useAuthStore } from '../store/auth.store';
import ConfirmModal from '../components/ConfirmModal';

const AUDIENCIA_CONFIG = {
  GLOBAL:   { label: 'Todos los usuarios',   icon: Globe,     color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-700'  },
  ROL:      { label: 'Por Rol',              icon: Users,     color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-700' },
  UNIDAD:   { label: 'Por Unidad Médica',    icon: Building2, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-200 dark:border-amber-700'  },
  PERSONAL: { label: 'Usuario específico',   icon: User,      color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/20',  border: 'border-green-200 dark:border-green-700'  },
};

const ROLES_OPCIONES = [
  { value: 1, label: 'Maestro' },
  { value: 2, label: 'Administrador' },
  { value: 3, label: 'Usuario Estándar' },
];

function formatDate(str) {
  if (!str) return '';
  try {
    return new Date(str).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch { return str; }
}

function AudienciaTag({ tipo, idAudiencia }) {
  const conf = AUDIENCIA_CONFIG[tipo] ?? AUDIENCIA_CONFIG.GLOBAL;
  const Icon = conf.icon;

  let label = conf.label;
  if (tipo === 'ROL') {
    const rol = ROLES_OPCIONES.find(r => String(r.value) === String(idAudiencia));
    label = rol ? `Rol: ${rol.label}` : `Rol ID ${idAudiencia}`;
  } else if (tipo === 'UNIDAD') {
    label = `Unidad ID: ${idAudiencia}`;
  } else if (tipo === 'PERSONAL') {
    label = `Matrícula: ${idAudiencia}`;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${conf.bg} ${conf.color} ${conf.border}`}>
      <Icon size={10} />
      {label}
    </span>
  );
}

export default function Anuncios() {
  const { showToast } = useApp();
  const usuario = useAuthStore(s => s.usuario);
  const idRol = usuario?.id_rol ?? 3;

  // Form
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoAudiencia, setTipoAudiencia] = useState('GLOBAL');
  const [idAudiencia, setIdAudiencia] = useState('');
  const [sending, setSending] = useState(false);

  // List
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // id_notificacion

  // User search
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserObj, setSelectedUserObj] = useState(null);

  // Unidad search
  const [unidadSearch, setUnidadSearch] = useState('');
  const [unidadResults, setUnidadResults] = useState([]);
  const [searchingUnidad, setSearchingUnidad] = useState(false);
  const [selectedUnidadObj, setSelectedUnidadObj] = useState(null);

  const [page, setPage] = useState(0);
  const limit = 50;

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await gqlClient.request(TODAS_NOTIFICACIONES_QUERY, { limit, offset: page * limit });
      setNotifs(res.todasNotificaciones ?? []);
    } catch (err) {
      showToast('Error al cargar anuncios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [page]);

  // Debounced user search
  useEffect(() => {
    if (tipoAudiencia !== 'PERSONAL') return;
    if (userSearch.length < 2) {
      setUserResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await gqlClient.request(GET_USUARIOS, { search: userSearch, estatus: true });
        // extract nodes
        setUserResults(res.usuarios?.edges?.map(e => e.node) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingUsers(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [userSearch, tipoAudiencia]);

  // Debounced unidad search
  useEffect(() => {
    if (tipoAudiencia !== 'UNIDAD') return;
    if (unidadSearch.length < 2) {
      setUnidadResults([]);
      return;
    }
    const delay = setTimeout(async () => {
      setSearchingUnidad(true);
      try {
        const res = await gqlClient.request(GET_UNIDADES_FISICAS_QUERY, { search: unidadSearch });
        setUnidadResults(res.unidades?.edges?.map(e => e.node) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingUnidad(false);
      }
    }, 400);
    return () => clearTimeout(delay);
  }, [unidadSearch, tipoAudiencia]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !mensaje.trim()) return showToast('Título y mensaje son obligatorios.', 'warning');

    const audienciaId = (tipoAudiencia !== 'GLOBAL')
      ? idAudiencia || null
      : null;

    if (tipoAudiencia !== 'GLOBAL' && !audienciaId) {
      return showToast('Especifica el ID del destinatario.', 'warning');
    }

    setSending(true);
    try {
      await gqlClient.request(CREATE_NOTIFICACION_MUTATION, {
        titulo: titulo.trim(),
        mensaje: mensaje.trim(),
        tipo_audiencia: tipoAudiencia,
        id_audiencia: audienciaId,
      });
      showToast('Anuncio enviado correctamente.', 'success');
      setTitulo('');
      setMensaje('');
      setIdAudiencia('');
      setSelectedUserObj(null);
      setSelectedUnidadObj(null);
      setTipoAudiencia('GLOBAL');
      cargar();
    } catch (err) {
      showToast(err?.response?.errors?.[0]?.message ?? 'Error al enviar.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await gqlClient.request(DELETE_NOTIFICACION_MUTATION, { id_notificacion: confirmDel });
      showToast('Anuncio eliminado.', 'success');
      setConfirmDel(null);
      cargar();
    } catch (err) {
      showToast(err?.response?.errors?.[0]?.message ?? 'Error al eliminar.', 'error');
      setConfirmDel(null);
    }
  };

  const needsId = tipoAudiencia !== 'GLOBAL';
  const rolConf = AUDIENCIA_CONFIG[tipoAudiencia] ?? AUDIENCIA_CONFIG.GLOBAL;

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Bell size={22} className="text-imss-green" />
            Anuncios y Notificaciones
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Envía comunicados a usuarios, roles o unidades médicas.
          </p>
        </div>
        <button
          onClick={cargar}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Compose form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">Redactar anuncio</h2>
        </div>
        <form onSubmit={handleSend} className="p-5 flex flex-col flex-1 overflow-y-auto custom-scrollbar space-y-4">
          {/* Audiencia */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Destinatario
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(AUDIENCIA_CONFIG).map(([tipo, conf]) => {
                const Icon = conf.icon;
                const active = tipoAudiencia === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => { 
                      setTipoAudiencia(tipo); 
                      setIdAudiencia(''); 
                      setSelectedUserObj(null);
                      setUserSearch('');
                      setSelectedUnidadObj(null);
                      setUnidadSearch('');
                    }}
                    className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? `${conf.bg} ${conf.border} ${conf.color} shadow-sm ring-1 ring-inset ring-current/20`
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon size={18} />
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ID condicional */}
          {tipoAudiencia === 'ROL' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Rol</label>
              <select
                value={idAudiencia}
                onChange={e => setIdAudiencia(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-imss-green"
                required
              >
                <option value="">-- Seleccionar rol --</option>
                {ROLES_OPCIONES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {tipoAudiencia === 'UNIDAD' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Buscar Unidad (Nombre, Desc. o Clave)
              </label>
              {!selectedUnidadObj ? (
                <div className="relative">
                  <input
                    type="text"
                    value={unidadSearch}
                    onChange={e => setUnidadSearch(e.target.value)}
                    placeholder="Escribe al menos 2 letras..."
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-imss-green"
                  />
                  {searchingUnidad && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-gray-400" />}
                  
                  {unidadResults.length > 0 && unidadSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {unidadResults.map(u => (
                        <div
                          key={u.clave}
                          onClick={() => {
                            setSelectedUnidadObj(u);
                            setIdAudiencia(u.clave);
                            setUnidadSearch('');
                            setUnidadResults([]);
                          }}
                          className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                        >
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{u.descripcion}</p>
                          <p className="text-[10px] text-gray-500">Clave: {u.clave} • {u.desc_corta}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedUnidadObj.descripcion}</p>
                    <p className="text-[10px] text-gray-500">Clave: {selectedUnidadObj.clave}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUnidadObj(null); setIdAudiencia(''); }}
                    className="text-gray-400 hover:text-red-500 px-2"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>
          )}

          {tipoAudiencia === 'PERSONAL' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                Buscar Usuario (Nombre o Matrícula)
              </label>
              {!selectedUserObj ? (
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Escribe al menos 2 letras..."
                    className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-imss-green"
                  />
                  {searchingUsers && <Loader2 size={14} className="absolute right-3 top-2.5 animate-spin text-gray-400" />}
                  
                  {userResults.length > 0 && userSearch.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {userResults.map(u => (
                        <div
                          key={u.id_usuario}
                          onClick={() => {
                            setSelectedUserObj(u);
                            setIdAudiencia(u.matricula);
                            setUserSearch('');
                            setUserResults([]);
                          }}
                          className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0"
                        >
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{u.nombre_completo}</p>
                          <p className="text-[10px] text-gray-500">{u.matricula} • {u.rol?.nombre_rol}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedUserObj.nombre_completo}</p>
                    <p className="text-[10px] text-gray-500">{selectedUserObj.matricula}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedUserObj(null); setIdAudiencia(''); }}
                    className="text-gray-400 hover:text-red-500 px-2"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Título */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ej: Mantenimiento programado"
              maxLength={120}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-imss-green"
              required
            />
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Mensaje</label>
            <textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Describe el anuncio con detalle..."
              rows={4}
              maxLength={1000}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-imss-green resize-none"
              required
            />
            <p className="text-right text-[10px] text-gray-400 mt-0.5">{mensaje.length}/1000</p>
          </div>

          <div className="mt-auto pt-4">
            <button
              type="submit"
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 bg-imss-green hover:bg-imss-green-dark text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 active:scale-95"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              {sending ? 'Enviando...' : 'Enviar anuncio'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de anuncios enviados */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col h-[650px]">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
            Anuncios enviados
            {!loading && <span className="ml-2 text-xs font-normal text-gray-400">({notifs.length})</span>}
          </h2>
        </div>

          <div className="overflow-y-auto custom-scrollbar flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Bell size={32} className="opacity-30" />
                <p className="text-sm">Aún no hay anuncios enviados.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifs.map(n => (
                  <li key={n.id_notificacion} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/60 dark:hover:bg-gray-700/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{n.titulo}</span>
                        <AudienciaTag tipo={n.tipo_audiencia} idAudiencia={n.id_audiencia} />
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line leading-relaxed">{n.mensaje}</p>
                      <p className="text-[10px] text-gray-400 mt-1.5">{formatDate(n.fecha_creacion)}</p>
                    </div>
                    {idRol === 1 && (
                      <button
                        onClick={() => setConfirmDel(n.id_notificacion)}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar anuncio"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center shrink-0">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-40 transition-colors"
            >
              &larr; Anterior
            </button>
            <span className="text-xs font-semibold text-gray-400">
              Página {page + 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={notifs.length < limit || loading}
              className="text-xs font-bold text-imss-green hover:text-imss-green-dark disabled:opacity-40 transition-colors"
            >
              Siguiente &rarr;
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="¿Eliminar anuncio?"
        message="Esta acción eliminará el anuncio de la bandeja de todos los destinatarios. No se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
