import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 60_000; // cada 60 segundos

export function useVersionCheck() {
  const currentVersion = useRef(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { v } = await res.json();
        if (currentVersion.current === null) {
          // Primera carga: guardar versión actual
          currentVersion.current = v;
        } else if (currentVersion.current !== v) {
          // Versión cambió: recargar
          window.location.reload();
        }
      } catch {
        // Si falla la request, ignorar silenciosamente
      }
    };

    check(); // Verificar al montar
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);
}
