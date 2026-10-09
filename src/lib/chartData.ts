import type { CampaignMetrics, MetaBreakdown, Overview, ReportView } from '../../shared/contracts';
import { projects } from '../../shared/projects';

export function projectChartData(overviews: Overview[]) {
  return overviews.map(overview => {
    const meta = overview.campaigns.filter(campaign => campaign.provider === 'meta');
    const leadRows = overview.reports.leads?.rows.filter(row => row.unit === 'leads') || [];
    const leadTargets = overview.targets.filter(target => target.channel === 'meta' && target.targetUnit === 'leads');
    const budgets = overview.targets.filter(target => target.channel === 'meta');
    return {
      id: overview.projectId,
      name: projects.find(project => project.id === overview.projectId)?.name || overview.projectId,
      leads: leadRows.some(row => row.result !== null) ? leadRows.reduce((sum, row) => sum + (row.result || 0), 0) : null,
      leadTarget: leadTargets.length ? leadTargets.reduce((sum, target) => sum + target.targetKpi, 0) : null,
      spend: meta.length ? meta.reduce((sum, campaign) => sum + (campaign.spend || 0), 0) : null,
      budget: budgets.length ? budgets.reduce((sum, target) => sum + target.budgetSpend, 0) : null,
    };
  });
}

export function dailyChartData(report: ReportView, campaigns: CampaignMetrics[]) {
  const lines = new Set(report.rows.map(row => row.name));
  const selected = campaigns.filter(campaign => campaign.provider === 'meta' && lines.has(campaign.lineName || ''));
  const days = new Map<string, number>();
  for (const campaign of selected) {
    for (const point of campaign.daily || []) {
      const value = report.unit === 'impresiones' ? point.impressions : report.unit === 'interacciones' ? point.engagement : point.leads;
      days.set(point.date, (days.get(point.date) || 0) + value);
    }
  }
  let cumulative = 0;
  return [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value, cumulative: cumulative += value }));
}

export function demographicChartData(items: MetaBreakdown[], metric: 'leads' | 'impressions' | 'engagement') {
  const groups = new Map<string, { age: string; female?: number; male?: number; unknown?: number }>();
  for (const item of items) {
    const [age, rawSex] = item.label.split(/\s*·\s*/);
    const sex = rawSex?.toLowerCase() === 'female' ? 'female' : rawSex?.toLowerCase() === 'male' ? 'male' : 'unknown';
    const group = groups.get(age) || { age };
    group[sex] = (group[sex] || 0) + item[metric];
    groups.set(age, group);
  }
  return [...groups.values()].sort((a, b) => {
    const aStart = Number.parseInt(a.age, 10);
    const bStart = Number.parseInt(b.age, 10);
    return (Number.isNaN(aStart) ? Infinity : aStart) - (Number.isNaN(bStart) ? Infinity : bStart);
  });
}
