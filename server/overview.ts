import type { Overview, ConnectionStatus, CampaignMetrics } from '../shared/contracts';
import { getConnections } from './integrations/index';
import type { ProjectId } from '../shared/projects';
import { getSupabase } from './db/supabase';

export async function getOverviewData(projectId: ProjectId): Promise<Overview> {
  const baseConnections = getConnections(projectId);
  const supabase = getSupabase();

  if (!supabase) {
    return {
      projectId,
      mode: 'setup',
      reportingTimezone: 'America/Bogota',
      connections: baseConnections,
      campaigns: [],
      sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    };
  }

  try {
    const { data: schedule } = await supabase
      .from('sync_schedules')
      .select('interval_days, last_successful_at, next_scheduled_at')
      .eq('project_id', projectId)
      .maybeSingle();

    const { data: dbCampaigns } = await supabase
      .from('campaigns')
      .select(`
        id, external_id, name, status, objective,
        campaign_metrics (
          date, spend, impressions, clicks, leads, conversions
        )
      `)
      .eq('project_id', projectId);

    const hasSynced = !!schedule?.last_successful_at;

    const connections: ConnectionStatus[] = baseConnections.map(conn => {
      if (conn.provider === 'meta' && hasSynced) {
        return {
          ...conn,
          state: 'connected',
          lastSuccessfulSyncAt: schedule.last_successful_at,
        };
      }
      return conn;
    });

    const campaigns: CampaignMetrics[] = (dbCampaigns || []).map(camp => {
      const metric = Array.isArray(camp.campaign_metrics) && camp.campaign_metrics.length > 0
        ? camp.campaign_metrics[0]
        : null;

      return {
        projectId,
        provider: 'meta',
        accountId: '',
        campaignId: camp.external_id,
        campaignName: camp.name,
        date: metric?.date || '',
        accountTimezone: 'America/Bogota',
        currency: 'COP',
        spend: metric?.spend ?? null,
        impressions: metric?.impressions ?? null,
        clicks: metric?.clicks ?? null,
        platformConversions: metric?.leads ?? null,
        conversionDefinition: 'Leads',
        fetchedAt: schedule?.last_successful_at || new Date().toISOString(),
      };
    });

    return {
      projectId,
      mode: hasSynced ? 'live' : 'setup',
      reportingTimezone: 'America/Bogota',
      connections,
      campaigns,
      sync: {
        intervalDays: schedule?.interval_days ?? 7,
        nextScheduledAt: schedule?.next_scheduled_at ?? null,
        lastSuccessfulAt: schedule?.last_successful_at ?? null,
      },
    };
  } catch (err) {
    console.error('Error fetching overview from Supabase:', err);
    return {
      projectId,
      mode: 'setup',
      reportingTimezone: 'America/Bogota',
      connections: baseConnections,
      campaigns: [],
      sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    };
  }
}
