import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Seleccionar...", 
  disabled = false,
  className = "",
  error = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [dropdownStyles, setDropdownStyles] = useState({});

  const selectedOption = useMemo(() => 
    options.find(opt => opt.value === value),
  [options, value]);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(query.toLowerCase())
    );
  }, [options, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Ignoramos clics si estamos haciendo clic dentro del propio dropdown (el portal) o el input.
      // Le añadiremos un id o clase especial al dropdown para evitar cerrarlo al dar clic dentro de él.
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // También asegurarnos que no dimos clic en el propio menú que está en el portal
        if (event.target.closest('.searchable-select-portal-menu')) return;
        setIsOpen(false);
        setQuery('');
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
        const dropdownHeight = 240; // max-h-60 = 15rem = 240px
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
      window.addEventListener('scroll', updatePosition, true); // true for capturing scroll in modal
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const stateClasses = disabled 
    ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-500" 
    : error 
      ? "border-red-300 focus:ring-red-500 hover:border-red-400" 
      : "border-gray-200 focus:ring-green-500 hover:border-green-400";

  const displayValue = isOpen ? query : (selectedOption ? selectedOption.label : '');

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery(''); 
          }}
          className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-1 ${stateClasses} ${!selectedOption && !isOpen ? 'text-gray-500' : 'text-gray-900'}`}
        />
        <button 
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.preventDefault();
            if (isOpen) {
              setIsOpen(false);
              inputRef.current?.blur();
            } else {
              inputRef.current?.focus();
            }
          }}
          className="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && !disabled && createPortal(
        <div 
          className="searchable-select-portal-menu absolute z-[9999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col fade-in"
          style={{ ...dropdownStyles, maxHeight: '240px' }}
        >
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No se encontraron resultados
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.value);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                    opt.value === value 
                      ? 'bg-green-50 text-green-700 font-semibold' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="block truncate">{opt.label}</span>
                  {opt.value === value && <Check size={14} className="flex-shrink-0 text-green-600" />}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
