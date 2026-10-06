import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSupabase } from '../db/supabase.js';
import type { ProjectId } from '../../shared/projects.js';

interface ServiceAccountCredentials {
  client_email: string;
  private_key: string;
  project_id: string;
}

let cachedCredentials: ServiceAccountCredentials | null = null;

function loadCredentials(): ServiceAccountCredentials | null {
  if (cachedCredentials) return cachedCredentials;
  const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './secrets/google-credentials.json';
  const resolved = path.resolve(rawPath);
  if (!fs.existsSync(resolved)) return null;

  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    cachedCredentials = JSON.parse(raw);
    return cachedCredentials;
  } catch (err) {
    console.error('Error al leer credenciales de Google:', err);
    return null;
  }
}

export function getGoogleCustomerId(): string {
  const raw = process.env.GOOGLE_ADS_CUSTOMER_ID || '';
  return raw.replace(/-/g, '').trim();
}

export function getGoogleLoginCustomerId(): string {
  const raw = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '';
  return raw.replace(/-/g, '').trim();
}

export async function getGoogleAccessToken(): Promise<string | null> {
  const creds = loadCredentials();
  if (!creds || !creds.client_email || !creds.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/adwords',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${encode(header)}.${encode(claimSet)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(creds.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!res.ok) {
      console.error('Error solicitando token OAuth de Google:', await res.text());
      return null;
    }

    const data = await res.json() as { access_token?: string };
    return data.access_token || null;
  } catch (err) {
    console.error('Excepción al solicitar token OAuth de Google:', err);
    return null;
  }
}

export interface GoogleAdsStatus {
  hasCredentialsFile: boolean;
  customerId: string;
  clientEmail: string | null;
  state: 'connected' | 'error' | 'not_configured';
  errorCode?: string;
  errorMessage?: string;
}

let cachedStatus: { status: GoogleAdsStatus; expiresAt: number } | null = null;

export async function checkGoogleAdsStatus(): Promise<GoogleAdsStatus> {
  if (cachedStatus && Date.now() < cachedStatus.expiresAt) {
    return cachedStatus.status;
  }

  const creds = loadCredentials();
  const customerId = getGoogleCustomerId();

  if (!creds || !customerId) {
    return {
      hasCredentialsFile: !!creds,
      customerId,
      clientEmail: creds?.client_email || null,
      state: 'not_configured',
      errorMessage: 'Faltan credenciales de Google Cloud o GOOGLE_ADS_CUSTOMER_ID.',
    };
  }

  const token = await getGoogleAccessToken();
  if (!token) {
    return {
      hasCredentialsFile: true,
      customerId,
      clientEmail: creds.client_email,
      state: 'error',
      errorCode: 'TOKEN_ERROR',
      errorMessage: 'No se pudo generar el token OAuth2 desde la cuenta de servicio de Google Cloud.',
    };
  }

  // Prueba de diagnóstico en Google Ads API v25
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    const loginCustId = getGoogleLoginCustomerId();
    if (loginCustId) headers['login-customer-id'] = loginCustId;

    const res = await fetch(`https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: 'SELECT campaign.id, campaign.name FROM campaign LIMIT 1' }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const status: GoogleAdsStatus = {
        hasCredentialsFile: true,
        customerId,
        clientEmail: creds.client_email,
        state: 'connected',
      };
      cachedStatus = { status, expiresAt: Date.now() + 5 * 60 * 1000 };
      return status;
    }

    const text = await res.text();
    let errCode = 'API_ERROR';
    let errMsg = text;

    try {
      const errJson = JSON.parse(text);
      const inner = errJson.error?.details?.[0]?.errors?.[0];
      if (inner?.errorCode?.authorizationError === 'CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION') {
        errCode = 'CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION';
        errMsg = 'El proyecto de Google Cloud está en nivel "Test access". Para consultar cuentas reales, solicita acceso "Explorer" en Google Cloud Console.';
      } else if (inner?.message) {
        errMsg = inner.message;
      }
    } catch {
      /* ignore json parse error */
    }

    const status: GoogleAdsStatus = {
      hasCredentialsFile: true,
      customerId,
      clientEmail: creds.client_email,
      state: 'error',
      errorCode: errCode,
      errorMessage: errMsg,
    };
    cachedStatus = { status, expiresAt: Date.now() + 5 * 60 * 1000 };
    return status;
  } catch (err: any) {
    const status: GoogleAdsStatus = {
      hasCredentialsFile: true,
      customerId,
      clientEmail: creds.client_email,
      state: 'error',
      errorCode: 'NETWORK_ERROR',
      errorMessage: err?.message || 'Error de red al consultar Google Ads API.',
    };
    cachedStatus = { status, expiresAt: Date.now() + 60 * 1000 };
    return status;
  }
}

export async function syncGoogleAdsForProject(
  projectId: ProjectId,
  months: string[] = ['2026-09', '2026-10']
): Promise<{ count: number; message: string }> {
  const customerId = getGoogleCustomerId();
  const token = await getGoogleAccessToken();
  const supabase = getSupabase();

  if (!token || !customerId || !supabase) {
    throw new Error('Faltan credenciales de Google Ads o Supabase en el servidor.');
  }

  // Google Ads solo aplica actualmente a Pekín (o proyectos con campañas)
  if (projectId !== 'pekin') {
    return { count: 0, message: `Proyecto ${projectId} no gestiona campañas de Google Ads.` };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const loginCustId = getGoogleLoginCustomerId();
  if (loginCustId) headers['login-customer-id'] = loginCustId;

  let totalSynced = 0;

  for (const m of months) {
    let since = `${m}-01`;
    let until = `${m}-30`;
    if (m === '2026-09') {
      since = '2026-09-01';
      until = '2026-09-30';
    } else {
      const now = new Date();
      until = now.toISOString().slice(0, 10);
    }

    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM campaign
      WHERE segments.date >= '${since}' AND segments.date <= '${until}'
    `;

    const res = await fetch(`https://googleads.googleapis.com/v25/customers/${customerId}/googleAds:search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error consultando Google Ads para ${m}:`, errText);
      continue;
    }

    const data = await res.json() as { results?: any[] };
    const rows = data.results || [];

    // Limpiar métricas previas de google_ads para este mes y proyecto
    await supabase.from('campaign_metrics')
      .delete()
      .eq('project_id', projectId)
      .eq('provider', 'google_ads')
      .eq('month', m);

    // Agrupar por campaña para consolidar el mes
    const campaignMap: Record<string, {
      id: string;
      name: string;
      type: string;
      spend: number;
      impressions: number;
      clicks: number;
      conversions: number;
    }> = {};

    rows.forEach(r => {
      const c = r.campaign;
      const met = r.metrics;
      if (!c?.id) return;

      if (!campaignMap[c.id]) {
        campaignMap[c.id] = {
          id: c.id,
          name: c.name || `Campaña ${c.id}`,
          type: c.advertisingChannelType || 'SEARCH',
          spend: 0,
          impressions: 0,
          clicks: 0,
          conversions: 0,
        };
      }

      campaignMap[c.id].spend += (Number(met?.costMicros || 0) / 1_000_000);
      campaignMap[c.id].impressions += Number(met?.impressions || 0);
      campaignMap[c.id].clicks += Number(met?.clicks || 0);
      campaignMap[c.id].conversions += Number(met?.conversions || 0);
    });

    for (const item of Object.values(campaignMap)) {
      const { data: dbCamp } = await supabase.from('campaigns').upsert({
        project_id: projectId,
        provider: 'google_ads',
        external_id: item.id,
        name: item.name,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,provider,external_id' }).select('id').single();

      if (!dbCamp) continue;

      await supabase.from('campaign_metrics').insert({
        campaign_id: dbCamp.id,
        project_id: projectId,
        provider: 'google_ads',
        month: m,
        date: until,
        spend: item.spend,
        impressions: item.impressions,
        clicks: item.clicks,
        leads: Math.round(item.conversions),
        conversions: Math.round(item.conversions),
        raw_data: {
          channelType: item.type,
          conversions: item.conversions,
        },
      });

      totalSynced++;
    }
  }

  return {
    count: totalSynced,
    message: `Sincronización de Google Ads completada: ${totalSynced} registros actualizados.`,
  };
}
