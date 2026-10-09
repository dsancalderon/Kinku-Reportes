import type { IncomingMessage, ServerResponse } from 'node:http';
import { getOverviewData } from '../server/overview.js';
import { isProjectId } from '../shared/projects.js';

interface BatchItem { code: number; body: string }
interface CreativeResponse {
  account_id?: string;
  creative?: {
    image_url?: string;
    thumbnail_url?: string;
    object_type?: string;
    object_story_spec?: {
      link_data?: { image_hash?: string; child_attachments?: { image_hash?: string }[] };
      photo_data?: { image_hash?: string };
    };
  };
}

function mediaUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function previewUrl(body: unknown): string | null {
  if (typeof body !== 'string') return null;
  const raw = body.match(/<iframe\s[^>]*src="([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'business.facebook.com' && url.pathname === '/ads/api/preview_iframe.php' ? url.toString() : null;
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
    const previews: Record<string, { imageUrl: string | null; thumbnailUrl: string | null; previewUrl?: string }> = {};
    const carouselImages: { id: string; accountId: string; hash: string }[] = [];
    const videosWithoutCover: string[] = [];
    const version = process.env.META_API_VERSION || 'v26.0';
    for (let start = 0; start < ids.length; start += 40) {
      const chunk = ids.slice(start, start + 40);
      const fields = new URLSearchParams({ fields: 'id,account_id,creative{id,thumbnail_url,image_url,object_type,object_story_spec}' });
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
          const ad = JSON.parse(item.body) as CreativeResponse;
          const creative = ad.creative;
          const hash = creative?.object_story_spec?.link_data?.child_attachments?.[0]?.image_hash
            || creative?.object_story_spec?.link_data?.image_hash
            || creative?.object_story_spec?.photo_data?.image_hash;
          if (hash && /^\d+$/.test(ad.account_id || '') && /^[a-f0-9]{32}$/i.test(hash)) {
            carouselImages.push({ id, accountId: ad.account_id!, hash });
            return;
          }
          const thumbnailUrl = mediaUrl(creative?.thumbnail_url);
          const imageUrl = mediaUrl(creative?.image_url)
            || (creative?.object_type === 'VIDEO' && thumbnailUrl?.includes('/t39.30808-1/') ? null : thumbnailUrl);
          if (imageUrl) previews[id] = { imageUrl, thumbnailUrl };
          else if (creative?.object_type === 'VIDEO') videosWithoutCover.push(id);
        } catch {
          // Un anuncio sin cuerpo válido no impide mostrar los demás creativos.
        }
      });
    }
    const byAccount = new Map<string, typeof carouselImages>();
    for (const item of carouselImages) {
      const accountImages = byAccount.get(item.accountId) || [];
      accountImages.push(item);
      byAccount.set(item.accountId, accountImages);
    }
    for (const [accountId, images] of byAccount) {
      for (let start = 0; start < images.length; start += 40) {
        const chunk = images.slice(start, start + 40);
        const query = new URLSearchParams({ fields: 'hash,url', hashes: JSON.stringify([...new Set(chunk.map(item => item.hash))]) });
        try {
          const response = await fetch(`https://graph.facebook.com/${version}/act_${accountId}/adimages?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) continue;
          const data = await response.json() as { data?: { hash?: string; url?: string }[] };
          const urls = new Map((data.data || []).map(item => [item.hash, mediaUrl(item.url)]));
          for (const item of chunk) {
            const imageUrl = urls.get(item.hash);
            if (imageUrl) previews[item.id] = { imageUrl, thumbnailUrl: imageUrl };
          }
        } catch {
          // Se omite el carrusel sin imagen recuperable; no se muestra el avatar de la página.
        }
      }
    }
    for (let start = 0; start < videosWithoutCover.length; start += 40) {
      const chunk = videosWithoutCover.slice(start, start + 40);
      const batch = chunk.map(id => ({ method: 'GET', relative_url: `${version}/${id}/previews?ad_format=MOBILE_FEED_STANDARD` }));
      try {
        const response = await fetch('https://graph.facebook.com/', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ batch: JSON.stringify(batch), include_headers: 'false' }),
        });
        if (!response.ok) continue;
        const results = await response.json() as BatchItem[];
        if (!Array.isArray(results)) continue;
        results.forEach((item, index) => {
          if (item.code !== 200) return;
          try {
            const body = (JSON.parse(item.body) as { data?: { body?: string }[] }).data?.[0]?.body;
            const url = previewUrl(body);
            if (url) previews[chunk[index]] = { imageUrl: null, thumbnailUrl: null, previewUrl: url };
          } catch {
            // Si Meta no entrega la vista previa, se conserva el estado sin imagen.
          }
        });
      } catch {
        // El resto de los previews siguen disponibles.
      }
    }
    res.writeHead(200);
    res.end(JSON.stringify({ previews }));
  } catch (error) {
    console.error('No se pudieron consultar previews de Meta:', error instanceof Error ? error.message : error);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'No se pudieron cargar las imágenes de los anuncios desde Meta.' }));
  }
}
