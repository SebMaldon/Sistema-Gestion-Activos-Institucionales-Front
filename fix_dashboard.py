import re
with open('src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace LOG_ICONS colors with classes
content = content.replace(
    "'CREACION': { icon: Plus, color: '#16a34a', bg: '#dcfce7' },",
    "'CREACION': { icon: Plus, textClass: 'text-green-600 dark:text-green-400', bgClass: 'bg-green-100 dark:bg-green-900/40' },"
)
content = content.replace(
    "'EDICION': { icon: Edit3, color: '#2563eb', bg: '#dbeafe' },",
    "'EDICION': { icon: Edit3, textClass: 'text-blue-600 dark:text-blue-400', bgClass: 'bg-blue-100 dark:bg-blue-900/40' },"
)
content = content.replace(
    "'ELIMINACION': { icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' },",
    "'ELIMINACION': { icon: AlertTriangle, textClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/40' },"
)
content = content.replace(
    "'TRASPASO': { icon: ArrowRight, color: '#7c3aed', bg: '#ede9fe' },",
    "'TRASPASO': { icon: ArrowRight, textClass: 'text-purple-600 dark:text-purple-400', bgClass: 'bg-purple-100 dark:bg-purple-900/40' },"
)
content = content.replace(
    "'LOGIN': { icon: LogIn, color: '#ca8a04', bg: '#fef9c3' },",
    "'LOGIN': { icon: LogIn, textClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-100 dark:bg-yellow-900/40' },"
)

# Replace inline conditionals
content = content.replace(
    "if (title === 'Reporte de incidencia') conf = { icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' };",
    "if (title === 'Reporte de incidencia') conf = { icon: AlertTriangle, textClass: 'text-red-600 dark:text-red-400', bgClass: 'bg-red-100 dark:bg-red-900/40' };"
)
content = content.replace(
    "if (title === 'Usuario creado') conf = { icon: Package, color: '#ca8a04', bg: '#fef9c3' };",
    "if (title === 'Usuario creado') conf = { icon: Package, textClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-100 dark:bg-yellow-900/40' };"
)
content = content.replace(
    "if (title === 'Inicio de sesión') conf = { icon: LogIn, color: '#ca8a04', bg: '#fef9c3' };",
    "if (title === 'Inicio de sesión') conf = { icon: LogIn, textClass: 'text-yellow-600 dark:text-yellow-400', bgClass: 'bg-yellow-100 dark:bg-yellow-900/40' };"
)
content = content.replace(
    "if (title === 'QR generado') conf = { icon: CheckCircle, color: '#0891b2', bg: '#e0f2fe' };",
    "if (title === 'QR generado') conf = { icon: CheckCircle, textClass: 'text-cyan-600 dark:text-cyan-400', bgClass: 'bg-cyan-100 dark:bg-cyan-900/40' };"
)

# Replace the div
content = content.replace(
    "<div className=\"w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0\" style={{ backgroundColor: conf.bg }}>",
    "<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${conf.bgClass}`}>"
)
content = content.replace(
    "<Icon size={14} style={{ color: conf.color }} />",
    "<Icon size={14} className={conf.textClass} />"
)

with open('src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done Dashboard.jsx")
