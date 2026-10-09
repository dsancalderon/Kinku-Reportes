import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchMetaPages, classifyCampaignLine, matchesProject } from '../server/integrations/meta';
import { buildConsolidated } from '../src/lib/consolidated';
import type { Overview } from '../shared/contracts';
import { resolveCampaignLine } from '../server/overview';
import { octoberTargets } from '../data/flows/octubre-2026';

test('Meta recorre todas las páginas y asigna la campaña de interacción a Pekín', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    return Response.json(url.endsWith('page=2')
      ? { data: [{ id: '2', name: 'CAMPAÑA AWARENNES PEKIN| INTERACCION SEPTIEMBRE' }] }
      : { data: [{ id: '1', name: 'TIC TAC| METRIKU| INTERACCION' }], paging: { next: 'https://example.test/?page=2' } });
  };
  try {
    const campaigns = await fetchMetaPages<{ id: string; name: string }>('https://example.test/');
    assert.equal(campaigns.length, 2);
    assert.equal(matchesProject(campaigns[1].name, 'pekin'), true);
    assert.equal(matchesProject(campaigns[1].name, 'metriku'), false);
    assert.equal(classifyCampaignLine(campaigns[1].name, 'OUTCOME_ENGAGEMENT'), 'INTERACCIÓN');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('la campaña awareness de Pekín se reporta como reconocimiento en octubre', () => {
  const campaign = { name: 'CAMPAÑA AWARENNES PEKIN| INTERACCION SEPTIEMBRE', provider: 'meta', objective: 'OUTCOME_ENGAGEMENT' };
  assert.equal(resolveCampaignLine('pekin', campaign, octoberTargets), 'RECONOCIMIENTO');
  assert.equal(resolveCampaignLine('metriku', campaign, octoberTargets), 'INTERACCIÓN');
  assert.equal(resolveCampaignLine('pekin', campaign, []), 'INTERACCIÓN');
});

test('el consolidado muestra la meta de 35 leads junto a las conversiones de Google', () => {
  const overview: Overview = {
    projectId: 'pekin', mode: 'live', month: '2026-09', reportingTimezone: 'America/Bogota',
    connections: [], reports: {},
    sync: { intervalDays: 7, nextScheduledAt: null, lastSuccessfulAt: null },
    targets: [{ projectId: 'pekin', month: '2026-09', channel: 'google_ads', objective: 'leads', lineName: 'PROYECTO PEKIN', targetKpi: 35, targetUnit: 'leads', budgetSpend: 700000, targetCostPerResult: 20000 }],
    campaigns: [{ projectId: 'pekin', provider: 'google_ads', accountId: '1', campaignId: '1', campaignName: 'PMAX', date: '2026-09-30', accountTimezone: 'America/Bogota', currency: 'COP', spend: 1000, impressions: 10, clicks: 2, platformConversions: 5, conversionDefinition: 'Conversiones', fetchedAt: '2026-10-01' }],
  };
  const consolidated = buildConsolidated([overview]);
  assert.equal(consolidated.googleConversions, 5);
  assert.equal(consolidated.rows[0].target, 35);
  assert.equal(consolidated.rows[0].targetUnit, 'leads');
  assert.equal(consolidated.rows[0].targetNote, undefined);
});
