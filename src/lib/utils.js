export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** Parsea una fecha del servidor a un objeto Date de JS de forma segura */
export function parseServerDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  let str = dateStr;
  let d;
  
  // Si es un timestamp en string o número
  if (!isNaN(Number(str))) {
    d = new Date(Number(str));
  } else {
    // Si tiene espacio en lugar de T (formato SQL), lo normalizamos
    if (typeof str === 'string' && str.includes(' ') && !str.includes('T')) {
      str = str.replace(' ', 'T');
    }
    d = new Date(str);
  }
  
  if (!isNaN(d.getTime())) {
    // Si la fecha representa exactamente la medianoche en UTC (00:00:00.000Z),
    // es muy probable que provenga de un campo tipo DATE en SQL.
    // Para evitar que se muestre el día anterior en zonas horarias locales negativas,
    // construimos la fecha respetando el año, mes y día en UTC pero en tiempo local.
    if (
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      d.getUTCMilliseconds() === 0
    ) {
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0);
    }
    return d;
  }
  
  return null;
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

/** Copia un texto al portapapeles de manera segura, con soporte para contextos HTTP inseguros */
export function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch((err) => {
        console.error('Error al copiar usando Clipboard API:', err);
        return fallbackCopy(text);
      });
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Error en fallback de copiado:', err);
    document.body.removeChild(textarea);
    return false;
  }
}
