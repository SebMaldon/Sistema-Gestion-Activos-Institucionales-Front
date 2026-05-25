import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function MultiSearchableSelect({ 
  value = [], 
  onChange, 
  options = [], 
  placeholder = "Seleccionar...", 
  disabled = false,
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [dropdownStyles, setDropdownStyles] = useState({});

  const filteredOptions = useMemo(() => {
    let opts = options;
    if (query) {
      const lowercaseQuery = query.toLowerCase();
      opts = options.filter(opt => {
        if (!opt) return false;
        const labelStr = opt.label ? String(opt.label).toLowerCase() : '';
        return labelStr.includes(lowercaseQuery);
      });
    }
    
    // Sort selected options to the top
    return [...opts].sort((a, b) => {
      const aSelected = value.includes(a.value);
      const bSelected = value.includes(b.value);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });
  }, [options, query, value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (event.target.closest('.multi-searchable-select-portal-menu')) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const updatePosition = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const dropdownHeight = 300; 
        const spaceBelow = window.innerHeight - rect.bottom;
        
        if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
          setDropdownStyles({
            position: 'fixed',
            bottom: window.innerHeight - rect.top + 4,
            left: rect.left,
            width: rect.width,
          });
        } else {
          setDropdownStyles({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const toggleOption = (optValue) => {
    const isSelected = value.includes(optValue);
    if (isSelected) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const stateClasses = disabled 
    ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500" 
    : error 
      ? "border-red-300 focus:ring-red-500 hover:border-red-400 bg-white" 
      : "border-gray-200 focus:ring-green-500 hover:border-green-400 bg-white";

  const displayValue = value.length > 0 
    ? (value.length === 1 ? `${value.length} seleccionado` : `${value.length} seleccionados`)
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border rounded-lg px-3 py-2 text-sm flex items-center justify-between transition-colors focus:outline-none focus:ring-1 ${stateClasses} ${value.length === 0 ? 'text-gray-500' : 'text-gray-900 font-medium'}`}
      >
        <span className="truncate pr-2">{displayValue}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value.length > 0 && !disabled && (
            <div 
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors mr-1"
            >
              <X size={12} />
            </div>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && createPortal(
        <div 
          className="multi-searchable-select-portal-menu absolute z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col fade-in"
          style={{ ...dropdownStyles, maxHeight: '300px' }}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="w-full flex items-center px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOption(opt.value)}
                      className="mr-3 rounded border-gray-300 text-green-600 focus:ring-green-500 w-4 h-4"
                    />
                    <span className={`block truncate min-w-0 flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {opt.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>
          {filteredOptions.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50 text-[10px] text-center text-gray-500 font-medium">
              Mostrando {filteredOptions.length} opcion(es)
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
