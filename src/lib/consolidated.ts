import type { Overview } from '../../shared/contracts';
import { projects, type ProjectId } from '../../shared/projects';

export interface ConsolidatedRow {
  key: string;
  projectId: ProjectId;
  projectName: string;
  channel: 'meta' | 'google_ads';
  name: string;
  campaigns: string[];
  unit: string;
  result: number | null;
  spend: number | null;
  target: number | null;
  targetNote?: string;
}

export function buildConsolidated(overviews: Overview[]) {
  const rows: ConsolidatedRow[] = [];
  const campaigns = overviews.flatMap(overview => overview.campaigns);
  for (const overview of overviews) {
    const projectName = projects.find(project => project.id === overview.projectId)?.name || overview.projectId;
    const startRows = rows.length;
    for (const report of Object.values(overview.reports)) {
      for (const row of report.rows) {
        const names = overview.campaigns
          .filter(campaign => campaign.provider === 'meta' && campaign.lineName === row.name)
          .map(campaign => campaign.campaignName);
        rows.push({
          key: `${overview.projectId}:meta:${report.id}:${row.name}`,
          projectId: overview.projectId,
          projectName,
          channel: 'meta',
          name: row.name,
          campaigns: names,
          unit: row.unit,
          result: row.result,
          spend: row.spend,
          target: row.target,
        });
      }
    }
    const google = overview.campaigns.filter(campaign => campaign.provider === 'google_ads');
    const googleTargets = overview.targets.filter(target => target.channel === 'google_ads');
    if (google.length || googleTargets.length) {
      const googleConversions = google.length
        ? google.reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0)
        : null;
      rows.push({
        key: `${overview.projectId}:google_ads`,
        projectId: overview.projectId,
        projectName,
        channel: 'google_ads',
        name: googleTargets.length === 1 ? googleTargets[0].lineName : 'Google Ads (cuenta)',
        campaigns: google.map(campaign => campaign.campaignName),
        unit: 'conversiones',
        result: googleConversions,
        spend: google.length ? google.reduce((sum, campaign) => sum + (campaign.spend || 0), 0) : null,
        target: googleTargets.length === 1 && googleTargets[0].targetUnit.toLowerCase().includes('convers')
          ? googleTargets[0].targetKpi
          : null,
        targetNote: googleTargets.length > 0 ? 'Por validar' : 'Sin definir',
      });
    }
    if (rows.length === startRows) rows.push({
      key: `${overview.projectId}:empty`, projectId: overview.projectId, projectName,
      channel: 'meta', name: 'Sin campañas activas en este mes', campaigns: [],
      unit: '—', result: null, spend: null, target: null, targetNote: '—',
    });
  }
  const metaLeads = campaigns.filter(campaign => campaign.provider === 'meta' && !['RECONOCIMIENTO', 'INTERACCIÓN'].includes(campaign.lineName || ''))
    .reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0);
  const googleConversions = campaigns.filter(campaign => campaign.provider === 'google_ads')
    .reduce((sum, campaign) => sum + (campaign.platformConversions || 0), 0);
  const spend = campaigns.reduce((sum, campaign) => sum + (campaign.spend || 0), 0);
  return { rows, metaLeads, googleConversions, spend };
}
