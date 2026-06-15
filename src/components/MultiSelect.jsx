import React, { useState, useRef, useEffect, useMemo, useLayoutEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function MultiSelect({
  selectedValues = [],
  onChange,
  options = [],
  placeholder = "Seleccionar...",
  disabled = false,
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyles, setDropdownStyles] = useState({ opacity: 0, pointerEvents: 'none' });

  // Asegurar que selectedValues es siempre un array
  const safeSelected = useMemo(() => Array.isArray(selectedValues) ? selectedValues : [], [selectedValues]);

  // Filtrar las opciones según el query de búsqueda
  const filteredOptions = useMemo(() => {
    const safeOptions = options || [];
    let result = safeOptions;
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      result = safeOptions.filter(opt => {
        if (!opt) return false;
        const labelStr = opt.label ? String(opt.label).toLowerCase() : '';
        return labelStr.includes(lowercaseQuery);
      });
    }

    // Sort so selected items appear at the top
    return [...result].sort((a, b) => {
      const aSelected = safeSelected.includes(a.value);
      const bSelected = safeSelected.includes(b.value);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [options, searchQuery, safeSelected]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (event.target.closest('.multiselect-portal-menu')) return;
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calcular la posición flotante del portal de manera síncrona antes del paint
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 280; // altura aprox del popover
        const spaceBelow = window.innerHeight - rect.bottom;
        
        if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
          setDropdownStyles({
            position: 'fixed',
            bottom: window.innerHeight - rect.top + 4,
            left: rect.left,
            width: Math.max(rect.width, 200),
            opacity: 1,
            pointerEvents: 'auto'
          });
        } else {
          setDropdownStyles({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 200),
            opacity: 1,
            pointerEvents: 'auto'
          });
        }
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setDropdownStyles({ opacity: 0, pointerEvents: 'none' });
    }
  }, [isOpen]);

  const handleToggleOption = (val) => {
    if (safeSelected.includes(val)) {
      onChange(safeSelected.filter(v => v !== val));
    } else {
      onChange([...safeSelected, val]);
    }
  };

  const handleSelectAll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const allVals = options.map(opt => opt.value);
    onChange(allVals);
  };

  const handleClearAll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  // Texto del botón trigger
  const displayLabel = useMemo(() => {
    if (safeSelected.length === 0) return placeholder;
    if (safeSelected.length === 1) {
      const found = options.find(o => o.value === safeSelected[0]);
      return found ? found.label : placeholder;
    }
    return `${safeSelected.length} seleccionados`;
  }, [safeSelected, options, placeholder]);

  const stateClasses = disabled 
    ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400" 
    : error 
      ? "border-red-300 focus:ring-red-500 hover:border-red-400" 
      : isOpen
        ? "border-blue-500 ring-2 ring-blue-100"
        : "border-gray-200 hover:border-gray-300 focus:border-blue-500";

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-left transition-all focus:outline-none ${stateClasses}`}
      >
        <span className={`block truncate ${safeSelected.length === 0 ? 'text-gray-400 font-normal' : 'text-gray-700 font-semibold'}`}>
          {displayLabel}
        </span>
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {isOpen && !disabled && createPortal(
        <div 
          ref={dropdownRef}
          className="multiselect-portal-menu absolute z-[9999] bg-white/95 backdrop-blur-md border border-gray-200/80 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
          style={{ ...dropdownStyles, maxHeight: '285px' }}
        >
          {/* Header con buscador e indicador */}
          <div className="p-2 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-white border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder-gray-400 transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 mt-1">
              <span className="font-medium">{safeSelected.length} marcados</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Todos
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  disabled={safeSelected.length === 0}
                  className="font-bold text-red-500 hover:text-red-600 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  Ninguno
                </button>
              </div>
            </div>
          </div>

          {/* Opciones */}
          <div className="max-h-[175px] overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400">
                No se encontraron opciones
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = safeSelected.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleToggleOption(opt.value)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                      isChecked 
                        ? 'bg-blue-50/70 text-blue-700 font-semibold' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {/* Checkbox estilizado */}
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      isChecked 
                        ? 'bg-blue-600 border-blue-600 text-white scale-105' 
                        : 'border-gray-300 bg-white hover:border-blue-400'
                    }`}>
                      {isChecked && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className="whitespace-normal break-words leading-tight min-w-0 flex-1">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
