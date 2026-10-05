import type { IncomingMessage, ServerResponse } from 'node:http';
import { getSetupOverview } from './overview';
import { isProjectId } from '../shared/projects';
export function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const projectId = url.searchParams.get('project');
  if ((path === '/api/overview' || path === '/api/sync') && !isProjectId(projectId)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Selecciona un proyecto válido: pekin, metriku o skala.' }));
    return;
  }
  if (path === '/api/sync' && req.method === 'POST') {
    res.writeHead(409);
    res.end(JSON.stringify({ error: 'La actualización estará disponible al conectar Meta y Supabase. No se han importado datos.' }));
    return;
  }
  if (req.method !== 'GET' || path === '/api/sync') {
    res.writeHead(405, { Allow: path === '/api/sync' ? 'POST' : 'GET' });
    res.end(JSON.stringify({ error: 'Método no permitido' }));
  } else if (path === '/api/health') {
    res.end(JSON.stringify({ status: 'ok', mode: 'setup' }));
  } else if (path === '/api/overview') {
    res.end(JSON.stringify(getSetupOverview(projectId as import('../shared/projects').ProjectId)));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
  }
}
