import type { IncomingMessage, ServerResponse } from 'node:http';
import { getOverviewData } from './overview';
import { isProjectId, type ProjectId } from '../shared/projects';
import { syncMetaForProject } from './integrations/meta';

const isTest = process.execArgv.includes('--test') || process.env.NODE_ENV === 'test';
if (!isTest && typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(); } catch { /* ignore */ }
}

export async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const projectId = url.searchParams.get('project');

  const isSync = path === '/api/sync' || path === '/sync' || path.endsWith('/sync');
  const isOverview = path === '/api/overview' || path === '/overview' || path.endsWith('/overview');
  const isHealth = path === '/api/health' || path === '/health' || path.endsWith('/health');

  if ((isOverview || isSync) && !isProjectId(projectId)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Selecciona un proyecto válido: pekin, metriku o skala.' }));
    return;
  }

  if (isSync && req.method === 'POST') {
    const hasMeta = !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
    const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);

    if (isTest || !hasMeta || !hasSupabase) {
      res.writeHead(409);
      res.end(JSON.stringify({
        error: 'La sincronización requiere META_ACCESS_TOKEN y credenciales de Supabase configuradas en el servidor.',
      }));
      return;
    }

    try {
      const result = await syncMetaForProject(projectId as ProjectId);
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, message: result.message, count: result.count }));
    } catch (err: any) {
      console.error('Error en sincronización:', err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message || 'Error al sincronizar con Meta Ads y Supabase.' }));
    }
    return;
  }

  if (req.method !== 'GET' || isSync) {
    res.writeHead(405, { Allow: isSync ? 'POST' : 'GET' });
    res.end(JSON.stringify({ error: 'Método no permitido' }));
  } else if (isHealth) {
    res.end(JSON.stringify({ status: 'ok', mode: 'setup' }));
  } else if (isOverview) {
    try {
      const data = await getOverviewData(projectId as ProjectId);
      res.end(JSON.stringify(data));
    } catch (err: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message || 'Error al obtener overview.' }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
  }
}
