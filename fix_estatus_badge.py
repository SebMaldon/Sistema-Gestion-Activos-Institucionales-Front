import os
import re

directory = 'src'

def fix_estatus(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    
    # We are looking for EstatusBadge implementation
    # It looks like:
    # function EstatusBadge({ estatus }) {
    #   const map = {
    #     'ACTIVO': { bg: '#dcfce7', color: '#15803d', label: 'Activo' },
    #     ...
    #   };
    #   const s = map[estatus] ?? { bg: '#f3f4f6', color: '#374151', label: estatus };
    #   return (
    #     <span className="..." style={{ backgroundColor: s.bg, color: s.color, borderColor: s.color + '40' }}>...
    
    # Let's replace the map values with tailwind classes
    
    # 1. Replace map values
    replacements = [
        (r"'ACTIVO': \{ bg: '#dcfce7', color: '#15803d', label: 'Activo' \}", r"'ACTIVO': { bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Activo' }"),
        (r"'INACTIVO': \{ bg: '#fee2e2', color: '#b91c1c', label: 'Inactivo' \}", r"'INACTIVO': { bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-800/50', label: 'Inactivo' }"),
        (r"'DAÑADO': \{ bg: '#fef3c7', color: '#d97706', label: 'Dañado' \}", r"'DAÑADO': { bg: 'bg-amber-100 dark:bg-amber-900/40', color: 'text-amber-800 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800/50', label: 'Dañado' }"),
        (r"'DEVOLUCIÓN': \{ bg: '#f3e8ff', color: '#7e22ce', label: 'Devolución' \}", r"'DEVOLUCIÓN': { bg: 'bg-purple-100 dark:bg-purple-900/40', color: 'text-purple-800 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800/50', label: 'Devolución' }"),
        (r"'OTRO': \{ bg: '#f3f4f6', color: '#374151', label: 'Otro' \}", r"'OTRO': { bg: 'bg-gray-100 dark:bg-gray-800/50', color: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700/50', label: 'Otro' }"),
        (r"'P_BAJA': \{ bg: '#ffedd5', color: '#c2410c', label: 'Pre-Baja' \}", r"'P_BAJA': { bg: 'bg-orange-100 dark:bg-orange-900/40', color: 'text-orange-800 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800/50', label: 'Pre-Baja' }"),
        (r"'PRESTAMO': \{ bg: '#dbeafe', color: '#1d4ed8', label: 'Préstamo' \}", r"'PRESTAMO': { bg: 'bg-blue-100 dark:bg-blue-900/40', color: 'text-blue-800 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/50', label: 'Préstamo' }"),
        (r"'SINIESTRADO': \{ bg: '#fef2f2', color: '#991b1b', label: 'Siniestrado' \}", r"'SINIESTRADO': { bg: 'bg-red-50 dark:bg-red-900/20', color: 'text-red-900 dark:text-red-400', border: 'border-red-100 dark:border-red-800/30', label: 'Siniestrado' }"),
        (r"'SUSTITUIDO': \{ bg: '#e0e7ff', color: '#4338ca', label: 'Sustituido' \}", r"'SUSTITUIDO': { bg: 'bg-indigo-100 dark:bg-indigo-900/40', color: 'text-indigo-800 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/50', label: 'Sustituido' }"),
        (r"'TRASPASO OOAD': \{ bg: '#ccfbf1', color: '#0f766e', label: 'Traspaso OOAD' \}", r"'TRASPASO OOAD': { bg: 'bg-teal-100 dark:bg-teal-900/40', color: 'text-teal-800 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800/50', label: 'Traspaso OOAD' }"),
        (r"'TRASPASO_FORANEO': \{ bg: '#cffafe', color: '#0369a1', label: 'Traspaso Foráneo' \}", r"'TRASPASO_FORANEO': { bg: 'bg-cyan-100 dark:bg-cyan-900/40', color: 'text-cyan-800 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800/50', label: 'Traspaso Foráneo' }"),
        
        # Garantias map
        (r"'VIGENTE': \{ bg: '#dcfce7', color: '#15803d', label: 'Vigente' \}", r"'VIGENTE': { bg: 'bg-green-100 dark:bg-green-900/40', color: 'text-green-800 dark:text-green-300', border: 'border-green-200 dark:border-green-800/50', label: 'Vigente' }"),
        (r"'VENCIDA': \{ bg: '#fee2e2', color: '#b91c1c', label: 'Vencida' \}", r"'VENCIDA': { bg: 'bg-red-100 dark:bg-red-900/40', color: 'text-red-800 dark:text-red-300', border: 'border-red-200 dark:border-red-800/50', label: 'Vencida' }"),
        (r"'DESCONOCIDO': \{ bg: '#f1f5f9', color: '#64748b', label: 'Desconocido' \}", r"'DESCONOCIDO': { bg: 'bg-slate-100 dark:bg-slate-800/50', color: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/50', label: 'Desconocido' }"),
        
        # Fallback in EstatusBadge
        (r"const s = map\[estatus\] \?\? \{ bg: '#f3f4f6', color: '#374151', label: estatus \};", r"const s = map[estatus] ?? { bg: 'bg-gray-100 dark:bg-gray-800/50', color: 'text-gray-800 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700/50', label: estatus };"),
    ]
    for p, r in replacements:
        content = re.sub(p, r, content)

    # Now fix the rendering
    # <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-black tracking-wide border shadow-sm"
    #       style={{ backgroundColor: s.bg, color: s.color, borderColor: s.color + '40' }}>
    content = re.sub(
        r'<span className="([^"]+)"\s*style=\{\{ backgroundColor: s\.bg, color: s\.color, borderColor: s\.color \+ \'40\' \}\}>',
        r'<span className={`\1 ${s.bg} ${s.color} ${s.border}`}>',
        content
    )
    
    # Garantias render has border-transparent or similar sometimes
    # In Garantias.jsx: style={{ backgroundColor: s.bg, color: s.color }}
    content = re.sub(
        r'<span className="([^"]+)"\s*style=\{\{ backgroundColor: s\.bg, color: s\.color \}\}>',
        r'<span className={`\1 ${s.bg} ${s.color} ${s.border || \'\'}`}>',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed EstatusBadge in {filepath}")

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.jsx'):
            fix_estatus(os.path.join(root, file))
print("Done fixing EstatusBadge!")
