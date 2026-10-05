import { useEffect, useState } from 'react';
import type { Overview } from '../../shared/contracts';
import type { ProjectId } from '../../shared/projects';

export function SyncStatus({ sync, projectId }: { sync: Overview['sync'] | undefined; projectId: ProjectId }) {
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = sync?.nextScheduledAt ? Math.max(0, Math.ceil((Date.parse(sync.nextScheduledAt) - now) / 1000)) : null;
  const countdown = remaining === null ? 'Pendiente de conexión' : remaining === 0 ? 'Actualización pendiente' : `${Math.floor(remaining / 86400)}d ${Math.floor(remaining % 86400 / 3600)}h ${Math.floor(remaining % 3600 / 60)}m ${remaining % 60}s`;
  async function refresh() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/sync?project=${projectId}`, { method: 'POST' });
      const result = await response.json() as { error?: string; message?: string };
      setMessage(response.ok ? result.message ?? 'Solicitud recibida. Esperando confirmación de sincronización.' : result.error ?? 'No se pudo actualizar.');
    } catch { setMessage('No se pudo contactar al servidor. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }
  return <section className="sync-bar" aria-label="Actualización del reporte">
    <div><span className="eyebrow">PRÓXIMA ACTUALIZACIÓN · CADA 7 DÍAS</span><strong className="countdown">{countdown}</strong><small>Última actualización: {sync?.lastSuccessfulAt ? new Date(sync.lastSuccessfulAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Sin sincronizaciones'}</small></div>
    <button onClick={refresh} disabled={busy}>{busy ? 'Solicitando…' : 'Actualizar ahora'}</button>
    {message && <p role="status" className="sync-message">{message}</p>}
  </section>;
}
