import { getSupabase } from '../db/supabase.js';
import type { ProjectId } from '../../shared/projects.js';

interface MetaInsightItem {
  campaign_id: string;
  campaign_name: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
  date_start?: string;
  date_stop?: string;
}

interface MetaCampaignItem { id: string; name: string; objective?: string; status?: string; effective_status?: string }
const META_API_VERSION = process.env.META_API_VERSION || 'v26.0';

export async function fetchMetaPages<T>(url: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = url;
  const seen = new Set<string>();
  while (next) {
    if (seen.has(next)) throw new Error('Paginación repetida en la respuesta de Meta.');
    seen.add(next);
    const response = await fetch(next);
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(body.error?.message || `Meta API respondió ${response.status}`);
    }
    const body = await response.json() as { data?: T[]; paging?: { next?: string } };
    items.push(...(body.data || []));
    next = body.paging?.next;
  }
  return items;
}

function getAccountId(): string {
  const raw = process.env.META_AD_ACCOUNT_ID || '';
  return raw ? (raw.startsWith('act_') ? raw : `act_${raw}`) : '';
}

export function matchesProject(campaignName: string, projectId: ProjectId): boolean {
  const upper = campaignName.toUpperCase();
  switch (projectId) {
    case 'pekin': return upper.includes('PEKIN') || upper.includes('PEKÍN');
    case 'metriku': return upper.includes('METRIKU');
    case 'skala': return upper.includes('SKALA');
    default: return false;
  }
}

export function classifyCampaignLine(name: string, objective?: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('APARTAESTUDIO')) return 'APARTAESTUDIOS';
  if (upper.includes('2 HABITACION') || upper.includes('VIVIENDA FAMILIAR')) return 'APARTAMENTOS 2 HABITACIONES';
  if (upper.includes('INTERACCION') || upper.includes('INTERACCIÓN') || upper.includes('POST PROMOTED')) return 'INTERACCIÓN';
  if (upper.includes('AWARENESS') || upper.includes('AWARENNES') || upper.includes('RECONOCIMIENTO')) return 'RECONOCIMIENTO';
  if (upper.includes('INVERSION') || upper.includes('INVERSIÓN')) return 'INVERSIÓN';
  if (upper.includes('VIVIENDA')) return 'VIVIENDA';
  if (upper.includes('ARRENDATARIO')) return 'ARRENDATARIOS';
  if (upper.includes('PROPIETARIO')) return 'PROPIETARIOS';
  if (objective === 'OUTCOME_AWARENESS') return 'RECONOCIMIENTO';
  if (objective === 'OUTCOME_ENGAGEMENT') return 'INTERACCIÓN';
  return 'GENERAL';
}

export function getObjectiveForLine(lineName: string): 'awareness' | 'engagement' | 'leads' {
  const upper = lineName.toUpperCase();
  if (upper.includes('RECONOCIMIENTO') || upper.includes('AWARENESS')) return 'awareness';
  if (upper.includes('INTERACCI') || upper.includes('POST PROMOTED')) return 'engagement';
  return 'leads';
}

function getMonthDateRanges(monthStr: string): { since: string; until: string } {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
  return { since: `${monthStr}-01`, until: monthStr === today.slice(0, 7) ? today : end };
}

export async function syncMetaForProject(
  projectId: ProjectId,
  months: string[] = ['2026-09', '2026-10']
): Promise<{ count: number; message: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = getAccountId();
  const supabase = getSupabase();

  if (!token || !accountId || !supabase) {
    throw new Error('Faltan credenciales de Meta Ads o Supabase en el servidor.');
  }

  // 1. Obtener información de la cuenta publicitaria
  const accRes = await fetch(`https://graph.facebook.com/${META_API_VERSION}/${accountId}?fields=name,currency,timezone_name&access_token=${encodeURIComponent(token)}`);
  if (!accRes.ok) {
    const err = await accRes.json();
    throw new Error(`Error consultando cuenta de Meta: ${err.error?.message || accRes.statusText}`);
  }
  const accountData = await accRes.json() as { name: string; currency: string; timezone_name: string };

  const { error: accountError } = await supabase.from('ad_accounts').upsert({
    project_id: projectId,
    provider: 'meta',
    account_id: accountId,
    name: accountData.name,
    currency: accountData.currency || 'COP',
    timezone: accountData.timezone_name || 'America/Bogota',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,provider,account_id' });
  if (accountError) throw new Error(`No se pudo guardar la cuenta Meta: ${accountError.message}`);

  let totalSynced = 0;

  // El listado de campañas incluye las encendidas sin gasto todavía; Insights no las devuelve.
  const campaignUrl = new URL(`https://graph.facebook.com/${META_API_VERSION}/${accountId}/campaigns`);
  campaignUrl.searchParams.set('fields', 'id,name,objective,status,effective_status');
  campaignUrl.searchParams.set('limit', '100');
  campaignUrl.searchParams.set('access_token', token);
  const accountCampaigns = (await fetchMetaPages<MetaCampaignItem>(campaignUrl.toString()))
    .filter(item => matchesProject(item.name, projectId));

  // 2. Consultar insights a nivel campaña para cada mes y combinar con el estado real.
  for (const m of months) {
    const { since, until } = getMonthDateRanges(m);
    const timeRangeParam = encodeURIComponent(JSON.stringify({ since, until }));
    const insightsUrl = `https://graph.facebook.com/${META_API_VERSION}/${accountId}/insights?time_range=${timeRangeParam}&level=campaign&fields=campaign_id,campaign_name,spend,impressions,reach,clicks,actions&limit=100&access_token=${encodeURIComponent(token)}`;
    const monthInsights = (await fetchMetaPages<MetaInsightItem>(insightsUrl))
      .filter(item => matchesProject(item.campaign_name, projectId));
    const insightsById = new Map(monthInsights.map(item => [item.campaign_id, item]));
    const isCurrentMonth = m === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).format(new Date());
    const visible: MetaCampaignItem[] = isCurrentMonth
      ? accountCampaigns.filter(campaign => campaign.effective_status === 'ACTIVE')
      : [
          ...accountCampaigns.filter(campaign => insightsById.has(campaign.id)),
          ...monthInsights.filter(item => !accountCampaigns.some(campaign => campaign.id === item.campaign_id))
            .map(item => ({ id: item.campaign_id, name: item.campaign_name, effective_status: 'UNKNOWN' })),
        ];

    // Limpiar métricas anteriores para este mes y proyecto para evitar datos obsoletos o cruzados
    const { error: deleteError } = await supabase.from('campaign_metrics')
      .delete()
      .eq('project_id', projectId)
      .eq('provider', 'meta')
      .eq('month', m);
    if (deleteError) throw new Error(`No se pudieron limpiar las métricas Meta de ${m}: ${deleteError.message}`);

    for (const campaign of visible) {
      const item = insightsById.get(campaign.id);
      // Registrar o actualizar campaña en tabla campaigns
      const { data: dbCamp, error: campaignError } = await supabase.from('campaigns').upsert({
        project_id: projectId,
        provider: 'meta',
        external_id: campaign.id,
        name: campaign.name,
        objective: campaign.objective || null,
        status: campaign.effective_status || campaign.status || 'UNKNOWN',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,provider,external_id' }).select('id').single();

      if (campaignError || !dbCamp) throw new Error(`No se pudo guardar la campaña Meta ${campaign.name}: ${campaignError?.message || 'sin ID'}`);

      const leadsAction = (item?.actions || []).find(a => a.action_type === 'lead');
      const engagementAction = (item?.actions || []).find(a =>
        a.action_type === 'post_engagement' || a.action_type === 'page_engagement'
      );

      const spend = Number(item?.spend || 0);
      const impressions = Number(item?.impressions || 0);
      const reach = Number(item?.reach || 0);
      const clicks = Number(item?.clicks || 0);
      const leads = Number(leadsAction?.value || 0);
      const engagement = Number(engagementAction?.value || 0);

      const { error: metricError } = await supabase.from('campaign_metrics').insert({
        campaign_id: dbCamp.id,
        project_id: projectId,
        provider: 'meta',
        month: m,
        date: until,
        spend,
        impressions,
        reach,
        clicks,
        leads,
        conversions: leads,
        raw_data: {
          ...(item || {}),
          engagement,
          effectiveStatus: campaign.effective_status,
          lineName: classifyCampaignLine(campaign.name, campaign.objective),
        },
      });
      if (metricError) throw new Error(`No se pudieron guardar métricas Meta de ${campaign.name}: ${metricError.message}`);

      totalSynced++;
    }
  }

  // 3. Registrar ejecución y calendario de sincronización
  const now = new Date();
  const nextScheduled = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await supabase.from('sync_schedules').upsert({
    project_id: projectId,
    interval_days: 7,
    last_successful_at: now.toISOString(),
    next_scheduled_at: nextScheduled.toISOString(),
    updated_at: now.toISOString(),
  }, { onConflict: 'project_id' });

  await supabase.from('sync_runs').insert({
    project_id: projectId,
    provider: 'meta',
    status: 'success',
    records_synced: totalSynced,
    details: {
      months,
      syncedAt: now.toISOString(),
    },
  });

  return {
    count: totalSynced,
    message: `Sincronización mensual completada: ${totalSynced} registros actualizados en Supabase directamente desde Meta Ads.`,
  };
}
