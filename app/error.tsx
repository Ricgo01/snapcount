'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error);
  }, [error]);

  return (
    <div className="screen">
      <div className="state-page">
        <div className="panel state-card">
          <h1>Algo salió mal</h1>
          <p className="muted">
            Ocurrió un error inesperado. Puedes intentar de nuevo.
          </p>
          <button type="button" className="state-btn" onClick={() => reset()}>
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
}
