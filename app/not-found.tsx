import Link from 'next/link';
import { Header } from '@/components/ui/Header';

export default function NotFound() {
  return (
    <div className="screen">
      <Header title="Página no encontrada" />
      <div className="state-page">
        <div className="panel state-card">
          <h1>No encontramos esto</h1>
          <p className="muted">
            El partido, equipo o página que buscas no existe o ya no está disponible.
          </p>
          <Link href="/" className="state-btn">Volver a Marcadores</Link>
        </div>
      </div>
    </div>
  );
}
