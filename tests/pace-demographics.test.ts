import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demographicChartData } from '../src/lib/chartData';
import { meetsMonthlyPace, monthlyPace } from '../src/lib/pace';

test('el color de cumplimiento compara el avance con el día de Bogotá', () => {
  const eveningInBogota = new Date('2026-10-10T02:00:00Z');
  assert.deepEqual(monthlyPace('2026-10', eveningInBogota), { day: 9, daysInMonth: 31, percent: 9 / 31 * 100 });
  assert.equal(meetsMonthlyPace(118, 230, '2026-10', eveningInBogota), true);
  assert.equal(meetsMonthlyPace(28, 134, '2026-10', eveningInBogota), false);
  assert.equal(meetsMonthlyPace(null, 65, '2026-10', eveningInBogota), null);
  assert.equal(monthlyPace('2026-09', eveningInBogota).percent, 100);
});

test('la gráfica demográfica conserva los grupos completos y separa sexos', () => {
  const item = (label: string, leads: number) => ({ label, leads, impressions: leads * 10, engagement: leads * 2, spend: 0, reach: 0 });
  assert.deepEqual(demographicChartData([
    item('35-44 · female', 3), item('25-34 · male', 4), item('25-34 · female', 2),
    item('25-34 · unknown', 1), item('55-64 · male', 5),
  ], 'leads'), [
    { age: '25-34', female: 2, male: 4, unknown: 1 },
    { age: '35-44', female: 3 },
    { age: '55-64', male: 5 },
  ]);
});
