import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Printer, AlertTriangle, GripVertical, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function PrintLabelsTab({
  bienes,
  categorias = [],
  pageInfo = {},
  cursors = [],
  onNextPage,
  onPrevPage,
  pageSize = 50,
  onFetchAll,
  selectedBienes = [],
  setSelectedBienes,
  startOffset = 0,
  setStartOffset,
  showUnidades: showUnidadesProp,
  setShowUnidades: setShowUnidadesProp,
  showUbicaciones: showUbicacionesProp,
  setShowUbicaciones: setShowUbicacionesProp,
}) {
  const [draggedIndex, setDraggedIndex] = useState(null);
  // 'config' = Configuración de Hoja expandida, 'queue' = Cola expandida
  const [activePanel, setActivePanel] = useState('config');
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  // Estados locales de respaldo por si el componente padre no los pasa directamente
  const [localShowUnidades, setLocalShowUnidades] = useState(true);
  const [localShowUbicaciones, setLocalShowUbicaciones] = useState(true);

  const showUnidades = showUnidadesProp !== undefined ? showUnidadesProp : localShowUnidades;
  const setShowUnidades = setShowUnidadesProp || setLocalShowUnidades;
  const showUbicaciones = showUbicacionesProp !== undefined ? showUbicacionesProp : localShowUbicaciones;
  const setShowUbicaciones = setShowUbicacionesProp || setLocalShowUbicaciones;

  // Filtros internos
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const isConfigOpen = activePanel === 'config';
  const isQueueOpen = activePanel === 'queue';

  const filteredBienes = useMemo(() => {
    return bienes.filter(b => {
      const matchSearch = !search || [
        b.equipo, b.marca, b.modelo, b.numSerie, b.numInv, b.ubicacion
      ].some(val => val && val.toString().toLowerCase().includes(search.toLowerCase()));

      const matchCat = !catFilter || (
        b.categoria?.nombre_categoria && b.categoria.nombre_categoria.toLowerCase() === catFilter.toLowerCase()
      ) || (
        b.categoria?.nombre && b.categoria.nombre.toLowerCase() === catFilter.toLowerCase()
      ) || (
        b.categoriaRef && b.categoriaRef === catFilter
      );

      return matchSearch && matchCat;
    });
  }, [bienes, search, catFilter]);

  const addBien = (bien) => {
    if (selectedBienes.length + startOffset >= 30) {
      alert('La hoja de etiquetas está llena (máximo 30 posiciones por hoja).');
      return;
    }
    setSelectedBienes([...selectedBienes, bien]);
  };

  const removeBien = (index) => {
    const newArr = [...selectedBienes];
    newArr.splice(index, 1);
    setSelectedBienes(newArr);
  };

  const removeOneBien = (bien) => {
    const idx = selectedBienes.findIndex(sb => sb.id_bien === bien.id_bien);
    if (idx !== -1) removeBien(idx);
  };

  const handleAddPage = () => {
    const remainingSlots = 30 - startOffset - selectedBienes.length;
    if (remainingSlots <= 0) {
      alert('La hoja actual ya está llena (30 posiciones).');
      return;
    }
    const toAdd = filteredBienes.slice(0, remainingSlots);
    setSelectedBienes([...selectedBienes, ...toAdd]);
  };

  const handleAddAllRemaining = async () => {
    if (!onFetchAll) return;
    setIsFetchingAll(true);
    try {
      const allBienes = await onFetchAll();
      const remainingSlots = 30 - startOffset - selectedBienes.length;
      if (remainingSlots <= 0) {
        alert('La hoja actual ya está llena (30 posiciones).');
        return;
      }
      const toAdd = allBienes.slice(0, remainingSlots);
      setSelectedBienes([...selectedBienes, ...toAdd]);
    } catch (e) {
      console.error('Error al obtener todos los bienes:', e);
      alert('No se pudieron cargar todos los bienes.');
    } finally {
      setIsFetchingAll(false);
    }
  };

  const handleRemovePage = () => {
    const pageIds = new Set(filteredBienes.map(b => b.id_bien));
    setSelectedBienes(selectedBienes.filter(sb => !pageIds.has(sb.id_bien)));
  };

  const handleClearAll = () => setSelectedBienes([]);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    const newArr = [...selectedBienes];
    const [movedItem] = newArr.splice(draggedIndex, 1);
    newArr.splice(dropIndex, 0, movedItem);
    setSelectedBienes(newArr);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const handlePrint = () => {
    window.print();
  };

  const renderVisualGrid = () => {
    const cells = [];
    for (let i = 0; i < 30; i++) {
      const isOffset = i < startOffset;
      const itemIndex = i - startOffset;
      const hasItem = itemIndex >= 0 && itemIndex < selectedBienes.length;
      const item = hasItem ? selectedBienes[itemIndex] : null;

      let bgClass = 'bg-gray-100 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/80 text-gray-400';
      if (isOffset) {
        bgClass = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50 text-red-400 dark:text-red-300 opacity-60';
      } else if (hasItem) {
        bgClass = 'bg-green-100 dark:bg-green-900/40 border-green-500 text-green-800 dark:text-green-300 font-bold shadow-sm';
      }

      cells.push(
        <div
          key={i}
          onClick={() => {
            if (i <= 30 - selectedBienes.length) {
              setStartOffset(i);
            } else {
              alert(`No puedes empezar en la posición ${i + 1} porque tienes ${selectedBienes.length} etiquetas y se pasarían del límite de 30.`);
            }
          }}
          className={`relative rounded-md border text-[9px] flex items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-blue-400 select-none overflow-hidden pt-[38%] ${bgClass}`}
          title={isOffset ? `Posición ${i + 1}: Omitida (Desplazamiento)` : hasItem ? `Posición ${i + 1}: ${item.equipo}` : `Posición ${i + 1}: Disponible (Click para empezar aquí)`}
        >
          <span className="absolute inset-0 flex items-center justify-center p-0.5 text-center leading-tight truncate">
            {isOffset ? '×' : hasItem ? (itemIndex + 1) : `${i + 1}`}
          </span>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200/80 dark:border-gray-700/80 w-[160px] shrink-0 shadow-inner">
        {cells}
      </div>
    );
  };

  const totalCount = pageInfo.totalCount || pageInfo.total || bienes.length;
  const currentPage = cursors.length + 1;
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const hasNext = pageInfo.hasNextPage;
  const hasPrev = cursors.length > 0;

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-900/30 p-4 min-h-0">
      <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0">
        
        {/* ── LADO IZQUIERDO ── */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-0">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Seleccionar Bienes para Etiquetar</h3>
            <div className="flex gap-2 mb-3">
              <input type="text"
                placeholder="Buscar por equipo, serie, inventario..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-200"
              />
              {categorias.length > 0 && (
                <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-gray-200 max-w-[150px]">
                  <option value="">Todas las Cat.</option>
                  {categorias.map((c, idx) => {
                    const nombreCat = c?.nombre_categoria || c?.nombre || (typeof c === 'string' ? c : 'Sin categoría');
                    return (
                      <option key={c?.id_categoria || idx} value={nombreCat}>
                        {nombreCat}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>

            {filteredBienes.length > 0 && (
              <div className="flex gap-2">
                <button onClick={handleAddPage}
                  className="flex-1 min-w-[100px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800/50 hover:bg-green-100 transition-colors">
                  + Pág. actual ({Math.min(filteredBienes.length, Math.max(0, 30 - startOffset - selectedBienes.length))})
                </button>
                {onFetchAll && totalCount > filteredBienes.length && (
                  <button onClick={handleAddAllRemaining} disabled={isFetchingAll}
                    className="flex-1 min-w-[100px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
                    {isFetchingAll
                      ? <><Loader2 size={12} className="animate-spin" /> Cargando...</>
                      : `★ Todas (hasta 180/${totalCount})`
                    }
                  </button>
                )}
                <button onClick={handleRemovePage}
                  className="flex-1 min-w-[100px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 hover:bg-red-100 transition-colors">
                  − Quitar página
                </button>
              </div>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-2">
            {filteredBienes.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No se encontraron resultados.</p>
            ) : (
              <div className="space-y-1">
                {filteredBienes.map(bien => {
                  const count = selectedBienes.filter(sb => sb.id_bien === bien.id_bien).length;
                  const isSelected = count > 0;
                  return (
                    <div key={bien.id_bien}
                      className={`flex items-center justify-between p-2 rounded-lg group transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 border border-transparent'
                      }`}>
                      <div className="min-w-0 flex-1 pr-3">
                        <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
                          {bien.equipo}
                        </p>
                        <p className={`text-xs font-mono ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          S/N: {bien.numSerie && bien.numSerie !== 'N/D' ? bien.numSerie : '—'} | Inv: {bien.numInv && bien.numInv !== 'N/D' ? bien.numInv : '—'}
                        </p>
                      </div>
                      {isSelected ? (
                        <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/20 rounded-lg p-1 shrink-0">
                          <button onClick={() => removeOneBien(bien)}
                            className="w-6 h-6 rounded bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 flex items-center justify-center font-bold transition-colors"
                            title="Quitar uno">−</button>
                          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 w-4 text-center">{count}</span>
                          <button onClick={() => addBien(bien)}
                            className="w-6 h-6 rounded bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 flex items-center justify-center font-bold transition-colors"
                            title="Añadir otro">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addBien(bien)}
                          className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-green-100 shrink-0"
                          title="Añadir a lista de impresión">
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Paginación interna */}
          {(hasNext || hasPrev) && (
            <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-2.5 rounded-b-2xl flex items-center justify-between gap-2">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">
                <span className="font-bold text-gray-800 dark:text-gray-200">{totalCount}</span> bienes
                <span className="text-gray-400 ml-1">· Pág. {currentPage} de {totalPages}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={onPrevPage} disabled={!hasPrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors shadow-sm">
                  <ChevronLeft size={13} /> Anterior
                </button>
                <button onClick={onNextPage} disabled={!hasNext}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors shadow-sm">
                  Siguiente <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── LADO DERECHO ── */}
        <div className="w-full md:w-80 lg:w-96 flex-none flex flex-col gap-4 min-h-0">

          {/* Configuración colapsable */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
            <button
              onClick={() => setActivePanel(isConfigOpen ? 'queue' : 'config')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 rounded-2xl transition-colors"
            >
              <span>Configuración de Hoja</span>
              {isConfigOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {isConfigOpen && (
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-4 pt-3">
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Posición Inicial (1-30)</label>
                      <input type="number" min="1" max="30"
                        value={startOffset + 1}
                        onChange={e => {
                          let val = parseInt(e.target.value) || 1;
                          if (val < 1) val = 1;
                          if (val > 30) val = 30;
                          setStartOffset(val - 1);
                        }}
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500 mb-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight mb-3">
                        Si la hoja ya tiene etiquetas impresas, indica en qué posición empezar para no sobreescribir. (Haz click en la cuadrícula para seleccionar)
                      </p>
                    </div>

                    {/* Controles compactos en el espacio inferior izquierdo señalado */}
                    <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-2">
                      <span className="block text-[11px] font-bold text-gray-700 dark:text-gray-300">Incluir en etiqueta:</span>
                      <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={showUnidades}
                          onChange={(e) => setShowUnidades(e.target.checked)}
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer transition-colors"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          Unidades Médicas / Admin.
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={showUbicaciones}
                          onChange={(e) => setShowUbicaciones(e.target.checked)}
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer transition-colors"
                        />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          Ubicaciones y Áreas
                        </span>
                      </label>
                    </div>
                  </div>
                  <div className="shrink-0">{renderVisualGrid()}</div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 flex gap-2 items-start">
                  <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <strong>Importante:</strong> Al imprimir configura <strong>Márgenes: Ninguno</strong> y <strong>Escala: 100%</strong> para respetar las medidas exactas de la hoja (21.6 x 27.9 cm) y evitar desfases.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Cola de impresión — toma el espacio restante */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col flex-1 min-h-0">
            {/* Header siempre visible — toggle */}
            <button
              onClick={() => setActivePanel(isQueueOpen ? 'config' : 'queue')}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 rounded-t-2xl transition-colors shrink-0"
            >
              <div className="flex items-center gap-2">
                <span>Cola de Impresión</span>
                <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-0.5 rounded-full font-semibold">
                  {selectedBienes.length}
                </span>
              </div>
              {isQueueOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {/* Contenido colapsable */}
            {isQueueOpen && (
              <>
                {/* Sub-toolbar */}
                {selectedBienes.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-800 shrink-0 px-4 py-2 flex items-center justify-end">
                    <button onClick={handleClearAll}
                      className="text-[10px] text-red-400 hover:text-red-600 font-semibold underline transition-colors"
                      title="Limpiar toda la cola">
                      Limpiar todo
                    </button>
                  </div>
                )}

                {/* Lista */}
                <div className="flex-1 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900">
                  {selectedBienes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8">
                      <Printer size={32} className="mb-2 opacity-20" />
                      <p className="text-xs text-center px-4">Agrega bienes desde la lista izquierda.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedBienes.map((bien, i) => (
                        <div key={`${bien.id_bien}-${i}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, i)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, i)}
                          className={`flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-colors ${
                            draggedIndex === i ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300'
                          }`}>
                          <div className="min-w-0 flex-1 pr-2 flex items-center gap-2">
                            <div className="cursor-grab text-gray-300 hover:text-gray-500 shrink-0">
                              <GripVertical size={16} />
                            </div>
                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                              <span className="text-gray-400 mr-1">{startOffset + i + 1}.</span>
                              {bien.equipo}
                            </p>
                          </div>
                          <button onClick={() => removeBien(i)}
                            className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Botón imprimir y controles rápidos — siempre visibles */}
            <div className="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-b-2xl">
              <div className="flex items-center justify-between text-xs mb-3 px-2.5 py-2 bg-gray-50 dark:bg-gray-900/80 rounded-xl border border-gray-200/80 dark:border-gray-700/80">
                <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Incluir en etiqueta:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showUnidades}
                      onChange={(e) => setShowUnidades(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Unidades</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showUbicaciones}
                      onChange={(e) => setShowUbicaciones(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-green-600 focus:ring-green-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700 cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300">Ubicaciones</span>
                  </label>
                </div>
              </div>
              <button onClick={handlePrint} disabled={selectedBienes.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
                <Printer size={16} />
                Imprimir {selectedBienes.length} {selectedBienes.length === 1 ? 'Etiqueta' : 'Etiquetas'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
