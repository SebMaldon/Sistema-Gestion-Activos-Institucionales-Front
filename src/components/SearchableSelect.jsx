import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function SearchableSelect({ 
 value, 
 onChange, 
 onInputChange,
 options, 
 placeholder = "Seleccionar...", 
 disabled = false,
 className = "",
 error = false,
 isLoading = false,
 allowCustom = false
}) {
 const [isOpen, setIsOpen] = useState(false);
 const [query, setQuery] = useState('');
 const containerRef = useRef(null);
 const inputRef = useRef(null);
 const [dropdownStyles, setDropdownStyles] = useState({});

 const selectedOption = useMemo(() => 
 (options || []).find(opt => opt && opt.value === value),
 [options, value]);

  const filteredOptions = useMemo(() => {
    const safeOptions = options || [];
    let result = safeOptions;
    const normalize = (str) => (str || '').toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    if (query && !onInputChange) {
      const normQuery = normalize(query);
      result = safeOptions.filter(opt => {
        if (!opt) return false;
        const labelStr = normalize(opt.label);
        const searchKeyStr = normalize(opt.searchKey);
        return labelStr.includes(normQuery) || searchKeyStr.includes(normQuery);
      });
    }

    result = [...result].sort((a, b) => {
      const aSelected = a.value === value;
      const bSelected = b.value === value;
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

    if (allowCustom && query && query.trim() !== '') {
      const normQuery = normalize(query);
      const exactMatch = safeOptions.find(o => normalize(o.label) === normQuery || normalize(o.value) === normQuery);
      if (!exactMatch) {
        result.unshift({ value: query.trim(), label: `Usar "${query.trim()}"`, isCustom: true });
      }
    }

    return result;
  }, [options, query, value, onInputChange, allowCustom]);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (containerRef.current && !containerRef.current.contains(event.target)) {
 if (event.target.closest('.searchable-select-portal-menu')) return;
 
 if (allowCustom && query.trim() !== '') {
 onChange(query.trim());
 }
 
 setIsOpen(false);
 setQuery('');
 if (onInputChange) onInputChange('');
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, [onInputChange, allowCustom, query, onChange]);

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
 if (onInputChange) onInputChange('');
 inputRef.current?.blur();
 };

 const stateClasses = disabled 
 ? "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 " 
 : error 
 ? "border-red-300 focus:ring-red-500 hover:border-red-400" 
 : "border-gray-200 dark:border-gray-700 focus:ring-green-500 hover:border-green-400";

 const displayValue = isOpen ? query : (selectedOption ? selectedOption.label : (allowCustom ? value : ''));

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
 if (onInputChange) onInputChange(e.target.value);
 if (!isOpen) setIsOpen(true);
 }}
 onFocus={() => {
 setIsOpen(true);
 setQuery(''); 
 if (onInputChange) onInputChange('');
 }}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 if (allowCustom && query.trim() !== '') {
 const exactMatch = (options || []).find(o => o.label?.toLowerCase() === query.trim().toLowerCase() || o.value?.toLowerCase() === query.trim().toLowerCase());
 if (exactMatch) {
 handleSelect(exactMatch.value);
 } else {
 handleSelect(query.trim());
 }
 }
 }
 }}
 className={`w-full border rounded-lg pl-3 pr-8 py-2 text-sm bg-white dark:bg-gray-800 transition-colors focus:outline-none focus:ring-1 ${stateClasses} ${!selectedOption && !isOpen && (!allowCustom || !value) ? 'text-gray-500 dark:text-gray-400 ' : 'text-gray-900 dark:text-gray-100 '}`}
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
 className="absolute right-0 top-0 bottom-0 px-2 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-400 "
 >
 <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
 </button>
 </div>

 {isOpen && !disabled && createPortal(
 <div 
 className="searchable-select-portal-menu absolute z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden flex flex-col fade-in"
 style={{ ...dropdownStyles, maxHeight: '240px' }}
 >
 <div className="max-h-60 overflow-y-auto p-1">
 {isLoading ? (
 <div className="px-4 py-6 flex flex-col items-center justify-center text-sm text-gray-400 gap-2">
 <svg className="animate-spin h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24">
 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
 </svg>
 Buscando...
 </div>
 ) : filteredOptions.length === 0 ? (
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
 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 dark:text-green-300 font-semibold' 
 : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 dark:hover:bg-gray-700 '
 }`}
 >
 <span className={`block whitespace-normal break-words leading-tight min-w-0 flex-1 text-left ${opt.value === value ? 'text-green-700 dark:text-green-400 dark:text-green-300 font-semibold' : 'text-gray-700 dark:text-gray-300 '}`}>
 {opt.label}
 </span>
 {opt.value === value && <Check size={14} className="flex-shrink-0 text-green-600 dark:text-green-400 ml-2" />}
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
