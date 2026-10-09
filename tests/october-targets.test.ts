import { test } from 'node:test';
import assert from 'node:assert/strict';
import { octoberTargets as targets } from '../data/flows/octubre-2026';
import { classifyCampaignLine } from '../server/integrations/meta';
import { mergeMonthlyTargets } from '../server/overview';

test('las metas de octubre conservan las ocho líneas y la revisión de interacción', () => {
  assert.equal(targets.length, 8);
  const byProject = (projectId: string) => targets.filter(target => target.projectId === projectId);
  assert.equal(byProject('pekin').filter(target => target.targetUnit === 'leads').reduce((sum, target) => sum + target.targetKpi, 0), 134);
  assert.equal(byProject('metriku').filter(target => target.targetUnit === 'leads').reduce((sum, target) => sum + target.targetKpi, 0), 230);
  assert.equal(byProject('skala').reduce((sum, target) => sum + target.targetKpi, 0), 116);
  assert.deepEqual(['pekin', 'metriku', 'skala'].map(projectId => byProject(projectId).reduce((sum, target) => sum + target.budgetSpend, 0)), [2500000, 2500000, 1000000]);
  assert.ok(targets.every(target => target.month === '2026-10' && target.channel === 'meta'));
  const interaction = byProject('metriku').find(target => target.lineName === 'INTERACCIÓN')!;
  assert.equal(interaction.targetKpi, 30000);
  assert.equal(interaction.originalTargetKpi, 3044);
  const stored = { ...interaction, targetKpi: 3044, originalTargetKpi: undefined };
  assert.equal(mergeMonthlyTargets([stored], [interaction])[0].targetKpi, 30000);
  const owners = byProject('metriku').find(target => target.lineName === 'PROPIETARIOS')!;
  assert.equal(mergeMonthlyTargets([{ ...owners, targetKpi: 151 }], [owners])[0].targetKpi, 151);
});

test('las campañas activas se asignan a cada meta de octubre sin mezclar líneas', () => {
  const names = [
    'TICTAC| KINKU|CAMPAÑA PEKIN| APARTAESTUDIOS| INVERSIONISTA',
    'TICTAC| KINKU|CAMPAÑA PEKIN| APARTAESTUDIOS| VIVIENDA',
    'TIC TAC| CAMPAÑA METRIKU| B2C PROPIETARIO',
    'TIC TAC| CAMPAÑA METRIKU| B2C| ARRENDATARIO',
    'TIC TAC| METRIKU| INTERACCION| POST PROMOTED',
    'TIC TAC| INVERSION| SKALA| CLIENTE POTENCIALES',
    'TIC TAC| VIVIENDA| SKALA| CLIENTE POTENCIALES',
  ];
  assert.deepEqual(names.map(name => classifyCampaignLine(name)), [
    'APARTAESTUDIOS INVERSIONISTA', 'APARTAESTUDIOS VIVIENDA', 'PROPIETARIOS',
    'ARRENDATARIOS', 'INTERACCIÓN', 'INVERSIÓN', 'VIVIENDA',
  ]);
});
