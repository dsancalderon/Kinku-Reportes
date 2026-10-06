import { getSupabase } from '../db/supabase.js';
import type { ProjectId } from '../../shared/projects';

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  effective_status?: string;
}

interface MetaInsight {
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

export async function syncMetaForProject(projectId: ProjectId): Promise<{ count: number; message: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = getAccountId();
  const supabase = getSupabase();

  if (!token || !accountId || !supabase) {
    throw new Error('Faltan credenciales de Meta Ads o Supabase en el servidor.');
  }

  // 1. Obtener información de la cuenta
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

  // 2. Obtener campañas de la cuenta
  const campRes = await fetch(`https://graph.facebook.com/v21.0/${accountId}/campaigns?fields=id,name,status,objective,effective_status&access_token=${token}&limit=100`);
  if (!campRes.ok) {
    const err = await campRes.json();
    throw new Error(`Error consultando campañas de Meta: ${err.error?.message || campRes.statusText}`);
  }
  const campBody = await campRes.json() as { data: MetaCampaign[] };
  const projectCampaigns = (campBody.data || []).filter(c => matchesProject(c.name, projectId));

  let syncedCount = 0;
  for (const camp of projectCampaigns) {
    const { data: dbCamp, error: campErr } = await supabase.from('campaigns').upsert({
      project_id: projectId,
      provider: 'meta',
      external_id: camp.id,
      name: camp.name,
      status: camp.status,
      objective: camp.objective || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,provider,external_id' }).select('id').single();

    if (campErr || !dbCamp) {
      console.error(`Error guardando campaña ${camp.name}:`, campErr);
      continue;
    }

    const insRes = await fetch(`https://graph.facebook.com/v21.0/${camp.id}/insights?fields=spend,impressions,reach,clicks,actions&date_preset=maximum&access_token=${token}`);
    if (insRes.ok) {
      const insBody = await insRes.json() as { data: MetaInsight[] };
      const insight = insBody.data?.[0];
      if (insight) {
        const leadsAction = (insight.actions || []).find(a => a.action_type === 'lead');
        const conversionsAction = (insight.actions || []).find(a => a.action_type === 'offsite_complete_registration_add_meta_leads' || a.action_type === 'lead');

        await supabase.from('campaign_metrics').upsert({
          campaign_id: dbCamp.id,
          project_id: projectId,
          provider: 'meta',
          date: insight.date_stop || new Date().toISOString().slice(0, 10),
          spend: Number(insight.spend || 0),
          impressions: Number(insight.impressions || 0),
          reach: Number(insight.reach || 0),
          clicks: Number(insight.clicks || 0),
          leads: Number(leadsAction?.value || 0),
          conversions: Number(conversionsAction?.value || 0),
          raw_data: insight,
        }, { onConflict: 'campaign_id,date' });
      }
    }
    syncedCount++;
  }

  // 3. Registrar ejecución y actualizar calendario
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
    message: `Sincronizadas ${syncedCount} campañas de Meta Ads exitosamente.`,
    started_at: now.toISOString(),
    completed_at: new Date().toISOString(),
  });

  return {
    count: syncedCount,
    message: `Sincronización completada: ${syncedCount} campañas de Meta Ads actualizadas en Supabase.`,
  };
}
