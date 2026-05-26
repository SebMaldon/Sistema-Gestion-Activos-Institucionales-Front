import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Printer, AlertTriangle, Check, Filter, GripVertical } from 'lucide-react';

export default function PrintLabelsTab({ bienes, categorias = [], onUpdateSelection, onUpdateOffset }) {
  const [selectedBienes, setSelectedBienes] = useState([]);
  const [startOffset, setStartOffset] = useState(0); // 0 to 29
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Para poder mandar el estado al componente padre (Inventario)
  // que es quien realmente pasará estos datos al PrintStickerSheet oculto
  React.useEffect(() => {
    if (onUpdateSelection) onUpdateSelection(selectedBienes);
  }, [selectedBienes, onUpdateSelection]);

  React.useEffect(() => {
    if (onUpdateOffset) onUpdateOffset(startOffset);
  }, [startOffset, onUpdateOffset]);

  const filteredBienes = useMemo(() => {
    // Usar directamente los bienes paginados/filtrados del servidor
    return (bienes || []).slice(0, 100);
  }, [bienes]);

  const addBien = (bien) => {
    setSelectedBienes(prev => [...prev, bien]);
  };

  const removeOneBien = (bien) => {
    setSelectedBienes(prev => {
      const index = prev.map(b => b.id_bien).lastIndexOf(bien.id_bien);
      if (index === -1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeBien = (index) => {
    setSelectedBienes(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
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
    // Forzamos un pequeño delay para asegurar que React haya renderizado el PrintStickerSheet con los datos correctos
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Render visual grid 3x10
  const renderVisualGrid = () => {
    const totalCells = 30;
    const cells = [];
    for (let i = 0; i < totalCells; i++) {
      let isOffset = i < startOffset;
      let isItem = i >= startOffset && i < startOffset + selectedBienes.length;
      
      let className = "w-full pt-[38%] border rounded-sm transition-colors ";
      if (isOffset) {
        className += "bg-gray-200 border-gray-300"; // Espacio gastado
      } else if (isItem) {
        className += "bg-green-500 border-green-600 shadow-sm"; // Etiqueta a imprimir
      } else {
        className += "bg-white border-gray-200"; // Espacio disponible
      }

      cells.push(
        <div 
          key={i} 
          className={className} 
          title={`Posición ${i + 1}`}
          onClick={() => {
            if (i <= 29) {
               setStartOffset(i);
            }
          }}
          style={{ cursor: 'pointer' }}
        />
      );
    }
    return (
      <div className="grid grid-cols-3 gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200 w-[160px] shadow-inner">
        {cells}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 flex-1 min-h-0 overflow-y-auto md:overflow-y-visible pb-4 md:pb-0">
      {/* ── LADO IZQUIERDO: RESULTADOS DE BÚSQUEDA DEL SERVIDOR ── */}
      <div className="flex-none md:flex-1 h-[400px] md:h-auto bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-100 shrink-0 space-y-2">
          <h2 className="text-base font-bold text-gray-900">Seleccionar Bienes para Imprimir</h2>
          <p className="text-xs text-gray-500">Utiliza los filtros principales para buscar y listar los bienes. Los resultados aparecerán aquí abajo.</p>
          {filteredBienes.length > 0 && (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  // Agregar todos los que no están ya en la cola
                  const newItems = filteredBienes.filter(
                    b => !selectedBienes.some(sb => sb.id_bien === b.id_bien)
                  );
                  setSelectedBienes(prev => [...prev, ...newItems]);
                }}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
              >
                + Agregar todos ({filteredBienes.length})
              </button>
              <button
                onClick={() => {
                  // Quitar de la cola todos los que son de esta página
                  const ids = new Set(filteredBienes.map(b => b.id_bien));
                  setSelectedBienes(prev => prev.filter(sb => !ids.has(sb.id_bien)));
                }}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
              >
                − Quitar todos
              </button>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {filteredBienes.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">No se encontraron resultados.</p>
          ) : (
            <div className="space-y-1">
              {filteredBienes.map(bien => {
                const count = selectedBienes.filter(sb => sb.id_bien === bien.id_bien).length;
                const isSelected = count > 0;
                return (
                  <div 
                    key={bien.id_bien} 
                    className={`flex items-center justify-between p-2 rounded-lg group transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                        {bien.equipo}
                      </p>
                      <p className={`text-xs font-mono ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                        S/N: {bien.numSerie && bien.numSerie !== 'N/D' ? bien.numSerie : '—'} | Inv: {bien.numInv && bien.numInv !== 'N/D' ? bien.numInv : '—'}
                      </p>
                    </div>
                    {isSelected ? (
                      <div className="flex items-center gap-1 bg-blue-100 rounded-lg p-1 shrink-0">
                        <button 
                          onClick={() => removeOneBien(bien)}
                          className="w-6 h-6 rounded bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center font-bold transition-colors"
                          title="Quitar uno"
                        >
                          -
                        </button>
                        <span className="text-xs font-bold text-blue-800 w-4 text-center">
                          {count}
                        </span>
                        <button 
                          onClick={() => addBien(bien)}
                          className="w-6 h-6 rounded bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center font-bold transition-colors"
                          title="Añadir otro"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addBien(bien)}
                        className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-green-100 shrink-0"
                        title="Añadir a lista de impresión"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── LADO DERECHO: CONFIGURACIÓN E IMPRESIÓN ── */}
      <div className="w-full md:w-80 lg:w-96 flex-none md:flex-1 lg:flex-none flex flex-col gap-4 min-h-0">
        
        {/* Panel de Configuración */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 shrink-0">
          <h2 className="text-base font-bold text-gray-900 mb-4">Configuración de Hoja</h2>
          
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Posición Inicial (1-30)</label>
              <input 
                type="number" 
                min="1" 
                max="30"
                value={startOffset + 1}
                onChange={e => {
                  let val = parseInt(e.target.value) || 1;
                  if (val < 1) val = 1;
                  if (val > 30) val = 30;
                  setStartOffset(val - 1);
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 mb-3"
              />
              <p className="text-[10px] text-gray-500 leading-tight">
                Si la hoja ya tiene etiquetas impresas, indica en qué posición empezar para no sobreescribir.
                (Haz click en la cuadrícula para seleccionar)
              </p>
            </div>
            <div className="shrink-0">
              {renderVisualGrid()}
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2 items-start">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <strong>Importante:</strong> Al imprimir, asegúrate de configurar <strong>Márgenes: Ninguno</strong> y <strong>Escala: 100%</strong> en el navegador para respetar las medidas de la calcomanía (Avery 5160).
            </p>
          </div>
        </div>

        {/* Panel de Lista a Imprimir */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[300px] md:min-h-0 flex-1">
          <div className="p-4 border-b border-gray-100 shrink-0 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">Cola de Impresión</h2>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-semibold">
              {selectedBienes.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
            {selectedBienes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Printer size={32} className="mb-2 opacity-20" />
                <p className="text-xs text-center px-4">Agrega bienes desde la lista izquierda para imprimirlos.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {selectedBienes.map((bien, i) => (
                  <div 
                    key={`${bien.id_bien}-${i}`} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, i)}
                    className={`flex items-center justify-between p-2 bg-white rounded-lg border shadow-sm cursor-grab active:cursor-grabbing transition-colors ${
                      draggedIndex === i ? 'border-green-400 bg-green-50' : 'border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2 flex items-center gap-2">
                      <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                        <GripVertical size={16} />
                      </div>
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        <span className="text-gray-400 mr-1">{startOffset + i + 1}.</span> 
                        {bien.equipo}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeBien(i)}
                      className="w-6 h-6 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 shrink-0 border-t border-gray-100 bg-white rounded-b-2xl">
            <button 
              onClick={handlePrint}
              disabled={selectedBienes.length === 0}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #006341, #004d32)' }}
            >
              <Printer size={16} />
              Imprimir {selectedBienes.length} {selectedBienes.length === 1 ? 'Etiqueta' : 'Etiquetas'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
