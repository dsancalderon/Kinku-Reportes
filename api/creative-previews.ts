import type { IncomingMessage, ServerResponse } from 'node:http';
import { getOverviewData } from '../server/overview.js';
import { isProjectId } from '../shared/projects.js';

interface BatchItem { code: number; body: string }
interface CreativeResponse { creative?: { image_url?: string; thumbnail_url?: string } }

function mediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

export default async function creativePreviewsHandler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.writeHead(405, { Allow: 'GET' });
    res.end(JSON.stringify({ error: 'Método no permitido' }));
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');
  const project = String((req as any).query?.project || url.searchParams.get('project') || '');
  const month = String((req as any).query?.month || url.searchParams.get('month') || '');
  if (!isProjectId(project) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    res.writeHead(400);
    res.end(JSON.stringify({ error: 'Proyecto o mes no válido.' }));
    return;
  }
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    res.writeHead(503);
    res.end(JSON.stringify({ error: 'La conexión de Meta no está configurada.' }));
    return;
  }

  try {
    const overview = await getOverviewData(project, month);
    const ids = [...new Set(overview.campaigns
      .filter(campaign => campaign.provider === 'meta')
      .flatMap(campaign => campaign.creatives || [])
      .map(creative => creative.id)
      .filter(id => /^\d+$/.test(id)))];
    const previews: Record<string, { imageUrl: string; thumbnailUrl: string | null }> = {};
    const version = process.env.META_API_VERSION || 'v26.0';
    for (let start = 0; start < ids.length; start += 40) {
      const chunk = ids.slice(start, start + 40);
      const fields = new URLSearchParams({ fields: 'id,creative{id,thumbnail_url,image_url}' });
      const batch = chunk.map(id => ({ method: 'GET', relative_url: `${version}/${id}?${fields}` }));
      const response = await fetch('https://graph.facebook.com/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ batch: JSON.stringify(batch), include_headers: 'false' }),
      });
      if (!response.ok) throw new Error(`Meta respondió ${response.status}`);
      const results = await response.json() as BatchItem[];
      if (!Array.isArray(results)) throw new Error('Meta devolvió una respuesta de previews no válida.');
      results.forEach((item, index) => {
        const id = chunk[index];
        if (!id || item.code !== 200) return;
        try {
          const creative = (JSON.parse(item.body) as CreativeResponse).creative;
          const thumbnailUrl = mediaUrl(creative?.thumbnail_url);
          const imageUrl = mediaUrl(creative?.image_url) || thumbnailUrl;
          if (imageUrl) previews[id] = { imageUrl, thumbnailUrl };
        } catch {
          // Un anuncio sin cuerpo válido no impide mostrar los demás creativos.
        }
      });
    }
    res.writeHead(200);
    res.end(JSON.stringify({ previews }));
  } catch (error) {
    console.error('No se pudieron consultar previews de Meta:', error instanceof Error ? error.message : error);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'No se pudieron cargar las imágenes de los anuncios desde Meta.' }));
  }
}
