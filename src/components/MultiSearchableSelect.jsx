import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

const normalizeString = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[.,-]/g, '') // Remove dots, commas, dashes
    .replace(/\s+/g, ' ') // Normalize spaces
    .toLowerCase();
};

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
 const listRef = useRef(null);
 const savedScrollRef = useRef(null);
 const [dropdownStyles, setDropdownStyles] = useState({ opacity: 0, pointerEvents: 'none' });

 const filteredOptions = useMemo(() => {
 let opts = options;
 if (query) {
 const normalizedQuery = normalizeString(query);
 opts = options.filter(opt => {
 if (!opt) return false;
 const labelStr = normalizeString(String(opt.label));
 return labelStr.includes(normalizedQuery);
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

 useLayoutEffect(() => {
    if (listRef.current && savedScrollRef.current !== null) {
      listRef.current.scrollTop = savedScrollRef.current;
      savedScrollRef.current = null;
    }
  }, [filteredOptions, value]);

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

 useLayoutEffect(() => {
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
 opacity: 1,
 pointerEvents: 'auto'
 });
 } else {
 setDropdownStyles({
 position: 'fixed',
 top: rect.bottom + 4,
 left: rect.left,
 width: rect.width,
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

 useEffect(() => {
 if (isOpen && searchInputRef.current) {
 searchInputRef.current.focus();
 } else {
 setQuery('');
 }
 }, [isOpen]);

 const toggleOption = (optValue) => {
    if (listRef.current) {
      savedScrollRef.current = listRef.current.scrollTop;
    }
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
 ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 " 
 : error 
 ? "border-red-300 focus:ring-red-500 hover:border-red-400 bg-white dark:bg-gray-800 " 
 : "border-gray-200 dark:border-gray-700 focus:ring-green-500 hover:border-green-400 bg-white dark:bg-gray-800 ";

 const displayValue = value.length > 0 
 ? (value.length === 1 ? `${value.length} seleccionado` : `${value.length} seleccionados`)
 : placeholder;

 return (
 <div className={`relative ${className}`} ref={containerRef}>
 <button
 type="button"
 disabled={disabled}
 onClick={() => setIsOpen(!isOpen)}
 className={`w-full border rounded-lg px-3 py-2 text-sm flex items-center justify-between transition-colors focus:outline-none focus:ring-1 ${stateClasses} ${value.length === 0 ? 'text-gray-500 dark:text-gray-400 ' : 'text-gray-900 dark:text-gray-100 font-medium'}`}
 >
 <span className="truncate pr-2">{displayValue}</span>
 <div className="flex items-center gap-1 flex-shrink-0">
 {value.length > 0 && !disabled && (
 <div 
 onClick={handleClear}
 className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors mr-1"
 >
 <X size={12} />
 </div>
 )}
 <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
 </div>
 </button>

 {isOpen && !disabled && createPortal(
 <div 
 className="multi-searchable-select-portal-menu absolute z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col fade-in"
 style={{ ...dropdownStyles, maxHeight: '300px' }}
 >
 <div className="p-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 ">
 <div className="relative">
 <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
 <input
 ref={searchInputRef}
 type="text"
 placeholder="Buscar..."
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500"
 />
 </div>
 </div>
 <div className="flex-1 overflow-y-auto p-1" ref={listRef}>
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
 className="w-full flex items-start px-3 py-2 text-sm rounded-lg text-left transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 "
 >
 <input
 type="checkbox"
 checked={isSelected}
 onChange={() => toggleOption(opt.value)}
 className="mr-3 mt-0.5 rounded border-gray-300 dark:border-gray-600 text-green-600 dark:text-green-400 focus:ring-green-500 flex-shrink-0 w-4 h-4"
 />
 <span 
   className={`block whitespace-normal break-words leading-tight min-w-0 flex-1 ${isSelected ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-700 dark:text-gray-300 '}`}
   title={opt.label}
 >
 {opt.label}
 </span>
 {opt.extra && <span className="ml-2 flex-shrink-0">{opt.extra}</span>}
 </label>
 );
 })
 )}
 </div>
 {filteredOptions.length > 0 && (
 <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-[10px] text-center text-gray-500 dark:text-gray-400 font-medium">
 Mostrando {filteredOptions.length} opcion(es)
 </div>
 )}
 </div>,
 document.body
 )}
 </div>
 );
}
