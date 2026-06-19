import re
with open('src/pages/Incidencias.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace COLUMNS
columns_old = """const COLUMNS = [
  { id: 'Pendiente', label: 'Pendiente', icon: Clock, color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
  { id: 'En proceso', label: 'En Proceso', icon: AlertTriangle, color: '#2563eb', bg: '#dbeafe', border: '#93c5fd' },
  { id: 'Resuelto', label: 'Resuelto', icon: CheckCircle, color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
];"""

columns_new = """const COLUMNS = [
  { id: 'Pendiente', label: 'Pendiente', icon: Clock, color: '#ca8a04', textClass: 'text-yellow-600 dark:text-yellow-400', headerClass: 'bg-[#fef9c3]/90 dark:bg-yellow-900/40', badgeClass: 'bg-yellow-100/50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800', countClass: 'bg-yellow-600 dark:bg-yellow-500 text-white' },
  { id: 'En proceso', label: 'En Proceso', icon: AlertTriangle, color: '#2563eb', textClass: 'text-blue-600 dark:text-blue-400', headerClass: 'bg-[#dbeafe]/90 dark:bg-blue-900/40', badgeClass: 'bg-blue-100/50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800', countClass: 'bg-blue-600 dark:bg-blue-500 text-white' },
  { id: 'Resuelto', label: 'Resuelto', icon: CheckCircle, color: '#16a34a', textClass: 'text-green-600 dark:text-green-400', headerClass: 'bg-[#dcfce7]/90 dark:bg-green-900/40', badgeClass: 'bg-green-100/50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800', countClass: 'bg-green-600 dark:bg-green-500 text-white' },
];"""
content = content.replace(columns_old, columns_new)

# Replace Kanban Badge (Line 223)
content = content.replace(
    """<span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm transition-all group-hover:shadow-md"
            style={{ 
              backgroundColor: `${colConfig.bg}80`, // 80 is alpha
              color: colConfig.color,
              borderColor: colConfig.border 
            }}
          >""",
    """<span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full border shadow-sm transition-all group-hover:shadow-md ${colConfig.badgeClass}`}
          >"""
)

# Replace Kanban Header (Line 1162)
content = content.replace(
    """<div
                className="sticky top-0 z-30 flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-t-2xl shadow-sm backdrop-blur-sm"
                style={{ backgroundColor: `${col.bg}EE` }}
              >""",
    """<div
                className={`sticky top-0 z-30 flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-t-2xl shadow-sm backdrop-blur-sm ${col.headerClass}`}
              >"""
)
content = content.replace(
    """<Icon size={16} style={{ color: col.color }} />
                <h3 className="text-sm font-bold" style={{ color: col.color }}>{col.label}</h3>
                <span
                  className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: col.color }}
                >""",
    """<Icon size={16} className={col.textClass} />
                <h3 className={`text-sm font-bold ${col.textClass}`}>{col.label}</h3>
                <span
                  className={`ml-auto w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${col.countClass}`}
                >"""
)


with open('src/pages/Incidencias.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done Incidencias.jsx")
