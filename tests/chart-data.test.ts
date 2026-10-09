import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CampaignMetrics, Overview, ReportView } from '../shared/contracts';
import { dailyChartData, projectChartData } from '../src/lib/chartData';

test('gráficos de proyectos separan Meta de Google y muestran metas sin resultados', () => {
  const overview: Overview = {
    projectId: 'skala', mode: 'live', month: '2026-10', reportingTimezone: 'America/Bogota', connections: [],
    sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    targets: [{ projectId: 'skala', month: '2026-10', channel: 'meta', objective: 'leads', lineName: 'VIVIENDA', targetKpi: 65, targetUnit: 'leads', budgetSpend: 500000, targetCostPerResult: 7692 }],
    reports: { leads: { id: 'leads', label: 'Leads', unit: 'leads', stats: [], note: '', rows: [{ name: 'VIVIENDA', result: null, target: 65, spend: null, budget: 500000, unit: 'leads', costPerResult: null }] } },
    campaigns: [{ projectId: 'skala', provider: 'google_ads', accountId: '1', campaignId: 'g', campaignName: 'Google', date: '2026-10-09', accountTimezone: 'America/Bogota', currency: 'COP', spend: 300000, impressions: 1000, clicks: 10, platformConversions: 8, conversionDefinition: 'conversiones', fetchedAt: '2026-10-09' }],
  };
  assert.deepEqual(projectChartData([overview]).map(({ leads, leadTarget, spend, budget }) => ({ leads, leadTarget, spend, budget })), [{ leads: null, leadTarget: 65, spend: null, budget: 500000 }]);
});

test('tendencia diaria agrega solo campañas de la línea seleccionada', () => {
  const report: ReportView = { id: 'leads', label: 'Leads', unit: 'leads', stats: [], note: '', rows: [{ name: 'VIVIENDA', result: 3, target: 10, spend: 100, budget: 1000, unit: 'leads', costPerResult: 33 }] };
  const base: CampaignMetrics = { projectId: 'pekin', provider: 'meta', accountId: '1', campaignId: '1', campaignName: 'A', lineName: 'VIVIENDA', date: '2026-10-09', accountTimezone: 'America/Bogota', currency: 'COP', spend: 100, impressions: 100, clicks: 3, platformConversions: 3, conversionDefinition: 'leads', fetchedAt: '2026-10-09', daily: [{ date: '2026-10-02', spend: 50, impressions: 20, leads: 2, engagement: 5 }, { date: '2026-10-01', spend: 50, impressions: 30, leads: 1, engagement: 3 }] };
  const other = { ...base, campaignId: '2', lineName: 'INTERACCIÓN', daily: [{ date: '2026-10-01', spend: 10, impressions: 1000, leads: 99, engagement: 80 }] };
  assert.deepEqual(dailyChartData(report, [base, other]), [{ date: '2026-10-01', value: 1, cumulative: 1 }, { date: '2026-10-02', value: 2, cumulative: 3 }]);
});
