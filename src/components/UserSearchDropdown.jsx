import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function UserSearchDropdown({ usuarios, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Encontrar el usuario seleccionado actualmente para prellenar la vista si existe
  const selectedUser = usuarios.find(u => String(u.id_usuario) === String(value));

  useEffect(() => {
    // Si hay un usuario seleccionado, mostrar su nombre en el input pero sin bloquear la búsqueda abierta
    if (selectedUser && !isOpen) {
      setSearchTerm(`${selectedUser.matricula ? selectedUser.matricula + ' - ' : ''}${selectedUser.nombre_completo}`);
    } else if (!selectedUser && !isOpen) {
      setSearchTerm('');
    }
  }, [value, selectedUser, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        // Resetear searchTerm a nombre del usuario elegido si se cancela
        if (selectedUser) {
           setSearchTerm(`${selectedUser.matricula ? selectedUser.matricula + ' - ' : ''}${selectedUser.nombre_completo}`);
        } else {
           setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef, selectedUser]);

  // Filtrado que evalúa nombre o matrícula, limitado a 50 resultados para evitar bloqueos del DOM
  const filteredUsers = usuarios
    .filter(u => {
      const term = searchTerm.toLowerCase();
      const matchName = u.nombre_completo?.toLowerCase().includes(term);
      const matchMatricula = u.matricula?.toLowerCase().includes(term);
      return matchName || matchMatricula;
    })
    .slice(0, 50);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          <Search size={14} />
        </span>
        <input
          type="text"
          className="w-full border border-gray-300 pl-8 pr-8 py-2 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
          placeholder="Buscar por Nombre o Matrícula..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(''); // Limpiar para permitir nueva busqueda rapida
          }}
        />
        {value && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors"
            onClick={() => {
              onChange('');
              setSearchTerm('');
              setIsOpen(true);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto fade-in">
          {filteredUsers.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 text-center">No se encontraron usuarios</div>
          ) : (
            <ul className="py-1">
              {filteredUsers.map(u => (
                <li
                  key={u.id_usuario}
                  className="px-3 py-2 hover:bg-green-50 cursor-pointer flex flex-col items-start border-b border-gray-50 last:border-0"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(String(u.id_usuario));
                    setSearchTerm(`${u.matricula ? u.matricula + ' - ' : ''}${u.nombre_completo}`);
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm font-semibold text-gray-800">{u.nombre_completo}</span>
                  {u.matricula && <span className="text-xs text-gray-500 font-mono">Matrícula: {u.matricula}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
