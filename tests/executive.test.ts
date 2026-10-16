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
