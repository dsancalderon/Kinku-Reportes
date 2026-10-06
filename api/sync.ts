import type { IncomingMessage, ServerResponse } from 'node:http';
import { isProjectId, type ProjectId } from '../shared/projects.js';
import { syncMetaForProject } from '../server/integrations/meta.js';

export default async function syncHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    res.end(JSON.stringify({ error: 'Método no permitido' }));
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const projectId = ((req as any).query?.project || url.searchParams.get('project')) as ProjectId;

  if (!isProjectId(projectId)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Selecciona un proyecto válido: pekin, metriku o skala.' }));
    return;
  }

  const hasMeta = !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
  const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

  if (!hasMeta || !hasSupabase) {
    res.writeHead(409);
    res.end(JSON.stringify({
      error: 'La sincronización requiere META_ACCESS_TOKEN y credenciales de Supabase configuradas en el servidor.',
    }));
    return;
  }

  try {
    const result = await syncMetaForProject(projectId);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, message: result.message, count: result.count }));
  } catch (err: any) {
    console.error('Error en /api/sync:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err?.message || 'Error al sincronizar con Meta Ads y Supabase.' }));
  }
}
