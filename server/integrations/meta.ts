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

function getAccountId(): string {
  const raw = process.env.META_AD_ACCOUNT_ID || '';
  return raw.startsWith('act_') ? raw : `act_${raw}`;
}

export function matchesProject(campaignName: string, projectId: ProjectId): boolean {
  const upper = campaignName.toUpperCase();
  switch (projectId) {
    case 'pekin': return upper.includes('PEKIN');
    case 'metriku': return upper.includes('METRIKU');
    case 'skala': return upper.includes('SKALA');
    default: return false;
  }
}

export function classifyCampaignLine(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('APARTAESTUDIO')) return 'APARTAESTUDIOS';
  if (upper.includes('2 HABITACION') || upper.includes('VIVIENDA FAMILIAR')) return 'APARTAMENTOS 2 HABITACIONES';
  if (upper.includes('AWARENESS') || upper.includes('AWARENNES') || upper.includes('RECONOCIMIENTO')) return 'RECONOCIMIENTO';
  if (upper.includes('INVERSION') || upper.includes('INVERSIÓN')) return 'INVERSIÓN';
  if (upper.includes('VIVIENDA')) return 'VIVIENDA';
  if (upper.includes('ARRENDATARIO')) return 'ARRENDATARIOS';
  if (upper.includes('PROPIETARIO')) return 'PROPIETARIOS';
  if (upper.includes('INTERACCION') || upper.includes('INTERACCIÓN') || upper.includes('POST PROMOTED')) return 'INTERACCIÓN';
  return 'GENERAL';
}

export function getObjectiveForLine(lineName: string): 'awareness' | 'engagement' | 'leads' {
  const upper = lineName.toUpperCase();
  if (upper.includes('RECONOCIMIENTO') || upper.includes('AWARENESS')) return 'awareness';
  if (upper.includes('INTERACCI') || upper.includes('POST PROMOTED')) return 'engagement';
  return 'leads';
}

function getMonthDateRanges(monthStr: string): { since: string; until: string } {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (monthStr === '2026-09') {
    return { since: '2026-09-01', until: '2026-09-30' };
  }

  if (monthStr >= currentMonthStr) {
    const todayStr = now.toISOString().slice(0, 10);
    return { since: `${monthStr}-01`, until: todayStr };
  }

  // Mes pasado genérico
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return { since: `${monthStr}-01`, until: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
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
  const accRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=name,currency,timezone_name&access_token=${token}`);
  if (!accRes.ok) {
    const err = await accRes.json();
    throw new Error(`Error consultando cuenta de Meta: ${err.error?.message || accRes.statusText}`);
  }
  const accountData = await accRes.json() as { name: string; currency: string; timezone_name: string };

  await supabase.from('ad_accounts').upsert({
    project_id: projectId,
    provider: 'meta',
    account_id: accountId,
    name: accountData.name,
    currency: accountData.currency || 'COP',
    timezone: accountData.timezone_name || 'America/Bogota',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'project_id,provider,account_id' });

  let totalSynced = 0;

  // 2. Para cada mes, consultar insights a nivel campaña para el rango de fechas exacto
  for (const m of months) {
    const { since, until } = getMonthDateRanges(m);
    const timeRangeParam = encodeURIComponent(JSON.stringify({ since, until }));
    const url = `https://graph.facebook.com/v21.0/${accountId}/insights?time_range=${timeRangeParam}&level=campaign&fields=campaign_id,campaign_name,spend,impressions,reach,clicks,actions&limit=100&access_token=${token}`;

    const insRes = await fetch(url);
    if (!insRes.ok) {
      const err = await insRes.json();
      console.error(`Error en insights de Meta para ${m}:`, err);
      continue;
    }

    const insBody = await insRes.json() as { data: MetaInsightItem[] };
    const monthInsights = (insBody.data || []).filter(item => matchesProject(item.campaign_name, projectId));

    // Limpiar métricas anteriores para este mes y proyecto para evitar datos obsoletos o cruzados
    await supabase.from('campaign_metrics')
      .delete()
      .eq('project_id', projectId)
      .eq('month', m);

    for (const item of monthInsights) {
      // Registrar o actualizar campaña en tabla campaigns
      const { data: dbCamp } = await supabase.from('campaigns').upsert({
        project_id: projectId,
        provider: 'meta',
        external_id: item.campaign_id,
        name: item.campaign_name,
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'project_id,provider,external_id' }).select('id').single();

      if (!dbCamp) continue;

      const leadsAction = (item.actions || []).find(a => a.action_type === 'lead');
      const engagementAction = (item.actions || []).find(a =>
        a.action_type === 'post_engagement' || a.action_type === 'page_engagement'
      );

      const spend = Number(item.spend || 0);
      const impressions = Number(item.impressions || 0);
      const reach = Number(item.reach || 0);
      const clicks = Number(item.clicks || 0);
      const leads = Number(leadsAction?.value || 0);
      const engagement = Number(engagementAction?.value || 0);

      await supabase.from('campaign_metrics').insert({
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
          ...item,
          engagement,
          lineName: classifyCampaignLine(item.campaign_name),
        },
      });

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
