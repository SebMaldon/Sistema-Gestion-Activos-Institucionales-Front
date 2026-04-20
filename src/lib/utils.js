export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Parsea una fecha del servidor a un objeto Date de JS de forma segura */
export function parseServerDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  let str = dateStr;
  // Si tiene espacio en lugar de T (formato SQL), lo normalizamos
  if (typeof str === 'string' && str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }
  // Importante: No forzamos 'Z' si el servidor envía tiempo local.
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Formatea una fecha a DD/MMM/YYYY */
export function formatDate(d) {
  const date = parseServerDate(d);
  if (!date) return '—';
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formatea una fecha a DD/MMM/YYYY HH:MM */
export function formatDateTime(d) {
  const date = parseServerDate(d);
  if (!date) return '—';
  return date.toLocaleString('es-MX', { 
    day: '2-digit', month: 'short', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', hour12: true 
  });
}
