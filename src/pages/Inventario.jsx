import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Barcode from 'react-barcode';
import { useBienes } from '../hooks/useBienes';
import { useApp } from '../context/AppContext';
import {
  Search, Filter, QrCode, Eye, Edit, Download, Plus, ChevronLeft, ChevronRight
} from 'lucide-react';

const STATUS_BADGE = {
  'Activo': 'badge-activo',
  'En Reparación': 'badge-reparacion',
  'Baja': 'badge-baja',
};

const TIPO_BADGE = {
  'Capitalizable': { bg: '#dbeafe', color: '#1e40af' },
  'No Capitalizable': { bg: '#f3e8ff', color: '#6b21a8' },
};

export default function Inventario() {
  const { openFicha, showToast } = useApp();
  const { data: bienesData, isLoading, isError } = useBienes();
  const bienes = bienesData || [];

  const [activeTab, setActiveTab] = useState('Capitalizable');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterUbicacion, setFilterUbicacion] = useState('Todas');
  const [page, setPage] = useState(1);
  const [qrModalAsset, setQrModalAsset] = useState(null);
  const PER_PAGE = 5;

  const filtered = bienes.filter(a => {
    const matchTab = a.tipo === activeTab;
    const matchSearch = search === '' || [a.numSerie, a.equipo, a.resguardo, a.ubicacion]
      .some(f => f.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'Todos' || a.estatus === filterStatus;
    const matchUbicacion = filterUbicacion === 'Todas' || a.ubicacion === filterUbicacion;
    return matchTab && matchSearch && matchStatus && matchUbicacion;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const ubicaciones = [...new Set(bienes.map(a => a.ubicacion))];

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center h-full">
        <p className="text-gray-500">Cargando inventario...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 sm:p-6 flex justify-center items-center h-full">
        <p className="text-red-500 text-center">Ocurrió un error al cargar el inventario. Por favor, intente nuevamente.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventario de Bienes</h1>
          <p className="text-sm text-gray-500 mt-1">Padrón de activos institucionales — Delegación Nayarit</p>
        </div>
        <button
          onClick={() => showToast('Función de alta de activo disponible en versión completa.', 'info')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
          <Plus size={16} />
          Nuevo Activo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto">
        {['Capitalizable', 'No Capitalizable'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setPage(1); }}
            className={`flex-1 sm:flex-none px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'Capitalizable' ? 'Bienes Capitalizables' : 'Bienes No Capitalizables'}
            <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: activeTab === tab ? '#dcfce7' : '#e5e7eb', color: activeTab === tab ? '#006341' : '#6b7280' }}>
              {bienes.filter(a => a.tipo === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por serie, equipo, resguardo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              {['Todos', 'Activo', 'En Reparación', 'Baja'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={filterUbicacion}
              onChange={e => { setFilterUbicacion(e.target.value); setPage(1); }}
              className="flex-1 sm:flex-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="Todas">Todas las Ubicaciones</option>
              {ubicaciones.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {filtered.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">Mostrando {Math.min(filtered.length, PER_PAGE)} de {filtered.length} registros</p>
        )}
      </div>

      {/* MOBILE: Card list view */}
      <div className="md:hidden space-y-3">
        {paginated.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-12 text-gray-400 text-sm">
            No se encontraron activos con los filtros aplicados.
          </div>
        ) : paginated.map(asset => (
          <div key={asset.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{asset.equipo}</p>
                <p className="text-xs text-gray-400 mt-0.5">{asset.id}</p>
                <p className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">{asset.numSerie}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${STATUS_BADGE[asset.estatus] || 'bg-gray-100 text-gray-800'}`}>
                {asset.estatus}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1 mb-3">
              <p><span className="text-gray-400">Ubicación:</span> {asset.ubicacion}</p>
              <p><span className="text-gray-400">Resguardo:</span> {asset.resguardo}</p>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
              <button
                onClick={() => openFicha(asset)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-xs font-semibold"
              >
                <Eye size={14} /> Ver Ficha
              </button>
              <button
                onClick={() => showToast('Edición de activo disponible en versión completa.', 'info')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors text-xs font-semibold"
              >
                <Edit size={14} /> Editar
              </button>
              <button
                onClick={() => setQrModalAsset(asset)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors text-xs font-semibold"
              >
                <QrCode size={14} /> QR
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DESKTOP: Table view */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">QR</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">No. Serie</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Equipo</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ubicación</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Resguardo</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Estatus</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                    No se encontraron activos con los filtros aplicados.
                  </td>
                </tr>
              ) : paginated.map(asset => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-green-50 transition-colors">
                      <QrCode size={16} className="text-gray-500 group-hover:text-green-600" />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">{asset.numSerie}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{asset.equipo}</p>
                      <p className="text-xs text-gray-400">{asset.id}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[160px] truncate">{asset.ubicacion}</td>
                  <td className="px-5 py-3.5 text-xs text-gray-600 max-w-[140px] truncate">{asset.resguardo}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[asset.estatus] || 'bg-gray-100 text-gray-800'}`}>
                      {asset.estatus}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openFicha(asset)}
                        title="Ver Ficha Técnica"
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => showToast('Edición de activo disponible en versión completa.', 'info')}
                        title="Editar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setQrModalAsset(asset)}
                        title="Ver Identificadores"
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      >
                        <QrCode size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    page === i + 1
                      ? 'text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                  style={page === i + 1 ? { backgroundColor: '#006341' } : {}}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pagination for mobile card view */}
      {totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
          <p className="text-xs text-gray-500">Página {page} de {totalPages}</p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal QR / Barras */}
      {qrModalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl flex flex-col items-center relative">
            <h3 className="text-lg font-bold text-gray-900 mb-2 truncate max-w-full">{qrModalAsset.equipo}</h3>
            <p className="text-sm text-gray-500 mb-6 font-mono">No. Serie: {qrModalAsset.numSerie}</p>
            
            {!qrModalAsset.qrHash ? (
               <div className="text-amber-600 bg-amber-50 p-4 rounded-xl text-sm w-full text-center mb-6 border border-amber-100">
                 Este equipo no cuenta con un identificador único (qr_hash) en la base de datos.
               </div>
            ) : (
                <div className="flex flex-col gap-6 w-full mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center">
                    <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Código QR</p>
                    <QRCodeSVG value={qrModalAsset.qrHash} size={160} level="H" includeMargin={false} />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col items-center justify-center overflow-hidden">
                    <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Código de Barras</p>
                    <Barcode value={qrModalAsset.qrHash} width={1.8} height={50} fontSize={14} background="transparent" margin={0} />
                    </div>
                </div>
            )}

            <button
              onClick={() => setQrModalAsset(null)}
              className="w-full py-2.5 rounded-xl text-white font-semibold transition-colors"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
