import type { IncomingMessage, ServerResponse } from 'node:http';
import { getOverviewData } from '../server/overview';
import { isProjectId, type ProjectId } from '../shared/projects';

export default async function overviewHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.writeHead(405, { Allow: 'GET' });
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

  try {
    const data = await getOverviewData(projectId);
    res.writeHead(200);
    res.end(JSON.stringify(data));
  } catch (err: any) {
    console.error('Error en /api/overview:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: err?.message || 'Error al obtener overview.' }));
  }
}
