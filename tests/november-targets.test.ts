import assert from 'node:assert/strict';
import test from 'node:test';
import { novemberTargets } from '../data/flows/noviembre-2026';
import { resolveCampaignLine } from '../server/overview';

test('noviembre conserva las metas por campaña y mide reconocimiento en interacciones', () => {
  assert.equal(novemberTargets.length, 12);
  assert.ok(novemberTargets.every(target => target.month === '2026-11' && target.channel === 'meta'));
  assert.deepEqual(novemberTargets.filter(target => target.projectId === 'pekin' && target.objective === 'engagement').map(target => target.targetUnit), ['interacciones']);
  assert.deepEqual(novemberTargets.filter(target => target.projectId === 'skala' && target.objective === 'engagement').map(target => target.targetUnit), ['interacciones']);
  assert.equal(novemberTargets.find(target => target.projectId === 'metriku' && target.lineName === 'INTERACCIÓN')?.targetKpi, 3044);
  const apartments = novemberTargets.filter(target => target.projectId === 'metriku' && target.lineName.startsWith('ARRENDATARIOS'));
  assert.equal(apartments.length, 2);
  assert.equal(apartments.reduce((sum, target) => sum + target.targetKpi, 0), 16.666666666666668);
  assert.equal(apartments.reduce((sum, target) => sum + target.budgetSpend, 0), 500000);
  assert.ok(apartments.every(target => target.targetCostPerResult === 30000));
});

test('las fincas de Métriku y el reconocimiento de Pekín se asignan a su meta de noviembre', () => {
  assert.equal(resolveCampaignLine('pekin', { name: 'CAMPAÑA AWARENNES PEKIN| INTERACCION AON', provider: 'meta' }, novemberTargets), 'RECONOCIMIENTO');
  assert.equal(resolveCampaignLine('metriku', { name: 'TIC TAC| CAMPAÑA METRIKU| VENTA FINCA LA BETICA', provider: 'meta' }, novemberTargets), 'FINCA VILLAVICENCIO');
  assert.equal(resolveCampaignLine('metriku', { name: 'TIC TAC| CAMPAÑA METRIKU| VENTA FINCA RANCHO GRANDE', provider: 'meta' }, novemberTargets), 'FINCA RANCHO GRANDE');
  assert.equal(resolveCampaignLine('metriku', { name: 'TIC TAC| CAMPAÑA METRIKU| B2C| ARRENDATARIO| APTO 601', provider: 'meta' }, novemberTargets), 'ARRENDATARIOS APTO 601');
  assert.equal(resolveCampaignLine('metriku', { name: 'TIC TAC| CAMPAÑA METRIKU| B2C| ARRENDATARIO| APTO 6 MILLONES', provider: 'meta' }, novemberTargets), 'ARRENDATARIOS APTO 6 MILLONES');
});
