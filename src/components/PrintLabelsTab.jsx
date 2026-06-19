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
}) {
 const [draggedIndex, setDraggedIndex] = useState(null);
 // 'config' = Configuración de Hoja expandida, 'queue' = Cola expandida
 const [activePanel, setActivePanel] = useState('config');
 const [isFetchingAll, setIsFetchingAll] = useState(false);
 const isConfigOpen = activePanel === 'config';
 const isQueueOpen = activePanel === 'queue';

 const filteredBienes = useMemo(() => {
 return (bienes || []).slice(0, pageSize);
 }, [bienes, pageSize]);

 const addBien = (bien) => setSelectedBienes(prev => [...prev, bien]);

 const removeOneBien = (bien) => {
 setSelectedBienes(prev => {
 const index = prev.map(b => b.id_bien).lastIndexOf(bien.id_bien);
 if (index === -1) return prev;
 return prev.filter((_, i) => i !== index);
 });
 };

 const removeBien = (index) => setSelectedBienes(prev => prev.filter((_, i) => i !== index));

 const handleAddAllPage = () => {
 const newItems = filteredBienes.filter(b => !selectedBienes.some(sb => sb.id_bien === b.id_bien));
 setSelectedBienes(prev => [...prev, ...newItems]);
 };

 const handleRemovePage = () => {
 const ids = new Set(filteredBienes.map(b => b.id_bien));
 setSelectedBienes(prev => prev.filter(sb => !ids.has(sb.id_bien)));
 };

 const handleAddAll = async () => {
 if (!onFetchAll) return;
 setIsFetchingAll(true);
 try {
 const all = await onFetchAll();
 const newItems = all.filter(b => !selectedBienes.some(sb => sb.id_bien === b.id_bien));
 setSelectedBienes(prev => [...prev, ...newItems]);
 } finally {
 setIsFetchingAll(false);
 }
 };

 const handleClearAll = () => setSelectedBienes([]);

 const handleDragStart = (e, index) => {
 setDraggedIndex(index);
 e.dataTransfer.effectAllowed = 'move';
 setTimeout(() => { e.target.style.opacity = '0.5'; }, 0);
 };

 const handleDragEnd = (e) => {
 e.target.style.opacity = '1';
 setDraggedIndex(null);
 };

 const handleDragOver = (e) => {
 e.preventDefault();
 e.dataTransfer.dropEffect = 'move';
 };

 const handleDrop = (e, targetIndex) => {
 e.preventDefault();
 if (draggedIndex === null || draggedIndex === targetIndex) return;
 setSelectedBienes(prev => {
 const newArr = [...prev];
 const draggedItem = newArr[draggedIndex];
 newArr.splice(draggedIndex, 1);
 newArr.splice(targetIndex, 0, draggedItem);
 return newArr;
 });
 setDraggedIndex(null);
 };

 const handlePrint = () => {
 if (selectedBienes.length === 0) return;
 setTimeout(() => { window.print(); }, 100);
 };

 const renderVisualGrid = () => {
 const totalCells = 30;
 const cells = [];
 for (let i = 0; i < totalCells; i++) {
 const isOffset = i < startOffset;
 const isItem = i >= startOffset && i < startOffset + selectedBienes.length;
 let className = "w-full pt-[38%] border rounded-sm transition-colors cursor-pointer ";
 if (isOffset) className += "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 ";
 else if (isItem) className += "bg-green-500 border-green-600 shadow-sm";
 else className += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-green-50";
 cells.push(
 <div key={i} className={className} title={`Posición ${i + 1}`}
 onClick={() => { if (i <= 29) setStartOffset(i); }} />
 );
 }
 return (
 <div className="grid grid-cols-3 gap-1.5 bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 w-[160px] shadow-inner">
 {cells}
 </div>
 );
 };

 const currentPage = cursors.length + 1;
 const totalPages = pageInfo?.totalCount > 0 ? Math.ceil(pageInfo.totalCount / pageSize) : 1;
 const hasPrev = cursors.length > 0;
 const hasNext = pageInfo?.hasNextPage;
 const totalCount = pageInfo?.totalCount ?? 0;

 return (
 <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-y-auto md:overflow-y-visible pb-4 md:pb-0">

 {/* ── LADO IZQUIERDO ── */}
 <div className="flex-none md:flex-1 h-[400px] md:h-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col min-h-0">

 {/* Cabecera con botones */}
 <div className="p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 space-y-2">
 <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 ">Seleccionar Bienes para Imprimir</h2>
 <p className="text-xs text-gray-500 dark:text-gray-400 ">
 Usa los filtros de arriba para buscar. Navega por páginas y agrega bienes a la cola.
 </p>
 {filteredBienes.length > 0 && (
 <div className="flex gap-1.5 flex-wrap pt-1">
 <button onClick={handleAddAllPage}
 className="flex-1 min-w-[120px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 border border-green-200 dark:border-green-800/50 dark:border-green-800/50 hover:bg-green-100 transition-colors">
 + Esta página ({filteredBienes.length})
 </button>
 {onFetchAll && (
 <button onClick={handleAddAll} disabled={isFetchingAll}
 className="flex-1 min-w-[120px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50 hover:bg-blue-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1">
 {isFetchingAll
 ? <><Loader2 size={12} className="animate-spin" /> Cargando...</>
 : `★ Todas (hasta 180/${totalCount})`
 }
 </button>
 )}
 <button onClick={handleRemovePage}
 className="flex-1 min-w-[100px] text-xs font-semibold py-1.5 px-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 dark:border-red-800/50 hover:bg-red-100 transition-colors">
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
 isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 dark:border-blue-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 border border-transparent'
 }`}>
 <div className="min-w-0 flex-1 pr-3">
 <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200 '}`}>
 {bien.equipo}
 </p>
 <p className={`text-xs font-mono ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 '}`}>
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
 <span className="font-bold text-gray-800 dark:text-gray-200 ">{totalCount}</span> bienes
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
 <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 ">
 <div className="flex gap-4 pt-3">
 <div className="flex-1">
 <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Posición Inicial (1-30)</label>
 <input type="number" min="1" max="30"
 value={startOffset + 1}
 onChange={e => {
 let val = parseInt(e.target.value) || 1;
 if (val < 1) val = 1;
 if (val > 30) val = 30;
 setStartOffset(val - 1);
 }}
 className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 mb-3"
 />
 <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
 Si la hoja ya tiene etiquetas impresas, indica en qué posición empezar para no sobreescribir.
 (Haz click en la cuadrícula para seleccionar)
 </p>
 </div>
 <div className="shrink-0">{renderVisualGrid()}</div>
 </div>
 <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/50 flex gap-2 items-start">
 <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
 <p className="text-xs text-amber-800 leading-relaxed">
 <strong>Importante:</strong> Al imprimir configura <strong>Márgenes: Ninguno</strong> y <strong>Escala: 100%</strong> para respetar las medidas Avery 5160.
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
 <div className="flex-1 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 ">
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
 draggedIndex === i ? 'border-green-400 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 '
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

 {/* Botón imprimir — siempre visible */}
 <div className="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-b-2xl">
 <button onClick={handlePrint} disabled={selectedBienes.length === 0}
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}>
 <Printer size={16} />
 Imprimir {selectedBienes.length} {selectedBienes.length === 1 ? 'Etiqueta' : 'Etiquetas'}
 </button>
 </div>
 </div>

 </div>
 </div>
 );
}
