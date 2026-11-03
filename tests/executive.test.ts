import test from 'node:test';
import assert from 'node:assert/strict';
import type { ReportView } from '../shared/contracts';
import { executiveReading } from '../src/lib/executive';

test('la lectura ejecutiva compara resultado y presupuesto con el ritmo del mes', () => {
  const report: ReportView = {
    id: 'leads', label: 'Clientes potenciales', unit: 'leads', stats: [], note: '',
    rows: [
      { name: 'Propietarios', result: 10, target: 100, spend: 120000, budget: 100000, unit: 'leads', costPerResult: 12000 },
      { name: 'Arrendatarios', result: 40, target: 100, spend: 50000, budget: 100000, unit: 'leads', costPerResult: 1250 },
    ],
  };
  const reading = executiveReading(report, '2026-10', new Date('2026-10-09T16:00:00Z'));
  assert.match(reading.analysis.join(' '), /25% de cumplimiento frente al 29% esperado/);
  assert.match(reading.recommendations.join(' '), /Propietarios/);
  assert.match(reading.recommendations.join(' '), /supera el presupuesto/);
});

test('la lectura ejecutiva no declara cumplimiento total con filas sin extracción', () => {
  const report: ReportView = {
    id: 'awareness', label: 'Reconocimiento', unit: 'impresiones', stats: [], note: '',
    rows: [
      { name: 'Con datos', result: 1000, target: 2000, spend: 10000, budget: 50000, unit: 'impresiones', costPerResult: 10 },
      { name: 'Pendiente', result: null, target: 2000, spend: null, budget: 50000, unit: 'impresiones', costPerResult: null },
    ],
  };
  const reading = executiveReading(report, '2026-10', new Date('2026-10-09T16:00:00Z'));
  assert.match(reading.analysis.join(' '), /pendiente de extracción completa/);
  assert.doesNotMatch(reading.analysis.join(' '), /cumplimiento frente/);
});

test('la lectura ejecutiva señala el costo que supera el objetivo de una línea', () => {
  const report: ReportView = {
    id: 'leads', label: 'Clientes potenciales', unit: 'leads', stats: [], note: '',
    rows: [
      { name: 'Inversionista', result: 22, target: 67, spend: 447597, budget: 1000000, unit: 'leads', costPerResult: 447597 / 22, targetCostPerResult: 15000 },
      { name: 'Vivienda', result: 23, target: 67, spend: 443957, budget: 1000000, unit: 'leads', costPerResult: 443957 / 23, targetCostPerResult: 15000 },
    ],
  };
  const reading = executiveReading(report, '2026-10', new Date('2026-10-16T17:00:00Z'));
  assert.match(reading.analysis.join(' '), /Avance por línea/);
  assert.match(reading.analysis.join(' '), /Costo por lead frente al objetivo/);
  assert.match(reading.recommendations.join(' '), /Optimizar creativos y segmentación/);
});

test('sin campañas con datos, el ejecutivo informa la meta pendiente sin atribuir resultados', () => {
  const report: ReportView = {
    id: 'leads', label: 'Clientes potenciales', unit: 'leads', stats: [], note: '',
    rows: [{ name: 'Vivienda', result: null, target: 65, spend: null, budget: 500000, unit: 'leads', costPerResult: null }],
  };
  const reading = executiveReading(report, '2026-10', new Date('2026-10-16T17:00:00Z'));
  assert.match(reading.analysis.join(' '), /sin avance medible/);
  assert.doesNotMatch(reading.analysis.join(' '), /cumplimiento/);
});

test('el cierre de octubre separa resultados con meta de una línea adicional y no habla de ritmo diario', () => {
  const report: ReportView = {
    id: 'leads', label: 'Clientes potenciales', unit: 'leads', stats: [], note: '',
    rows: [
      { name: 'Arrendatarios', result: 115, target: 80, spend: 798337, budget: 800000, unit: 'leads', costPerResult: 798337 / 115, targetCostPerResult: 10000 },
      { name: 'Propietarios', result: 221, target: 150, spend: 1499652, budget: 1500000, unit: 'leads', costPerResult: 1499652 / 221, targetCostPerResult: 10000 },
      { name: 'General', result: 5, target: null, spend: 33107, budget: null, unit: 'leads', costPerResult: 33107 / 5 },
    ],
  };
  const reading = executiveReading(report, '2026-10', new Date('2026-11-03T12:00:00Z'));
  assert.match(reading.analysis.join(' '), /341 leads/);
  assert.match(reading.analysis.join(' '), /336 de 230 leads/);
  assert.match(reading.analysis.join(' '), /General aportó 5 leads/);
  assert.doesNotMatch(reading.analysis.join(' '), /ritmo|esperado para el corte/);
});
